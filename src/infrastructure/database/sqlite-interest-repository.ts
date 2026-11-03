import { and, asc, eq } from "drizzle-orm";

import {
  fromSqliteInteger,
  toSqliteSafeInteger,
} from "../../domain/ledger/money";
import {
  validateJournalEntry,
  type PostingContext,
} from "../../domain/ledger/posting";
import type {
  InterestAccrual,
  InterestPlan,
  InterestPlanStatus,
} from "../../domain/interest/interest";
import type {
  InterestPostingCommit,
  InterestRepository,
} from "../../domain/interest/repository";
import type { JournalLine } from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import {
  accounts,
  categories,
  currencies,
  interestAccruals,
  interestPlans,
  journalEntries,
  journalLines,
} from "./schema";

type InterestTransaction = Parameters<
  Parameters<LedgerDatabase["transaction"]>[0]
>[0];

function zonedStartOfDayUtc(dateOnly: string, timezoneId: string): number {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const desiredLocalMidnightAsUtc = Date.UTC(year, month - 1, day);
  let candidate = desiredLocalMidnightAsUtc;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const values = new Map(
      formatter
        .formatToParts(new Date(candidate))
        .map((part) => [part.type, part.value]),
    );
    const representedLocalTimeAsUtc = Date.UTC(
      Number(values.get("year")),
      Number(values.get("month")) - 1,
      Number(values.get("day")),
      Number(values.get("hour")),
      Number(values.get("minute")),
      Number(values.get("second")),
    );
    const difference = representedLocalTimeAsUtc - desiredLocalMidnightAsUtc;
    if (difference === 0) break;
    candidate -= difference;
  }
  return candidate;
}

function mapPlan(row: typeof interestPlans.$inferSelect): InterestPlan {
  return {
    ...row,
    annualRatePpm: BigInt(row.annualRatePpm),
  };
}

function mapAccrual(
  row: typeof interestAccruals.$inferSelect,
): InterestAccrual {
  return {
    ...row,
    principalMinor: fromSqliteInteger(row.principalMinor),
    accruedNumerator: BigInt(row.accruedNumerator),
    accruedDenominator: BigInt(row.accruedDenominator),
    amountMinor: fromSqliteInteger(row.amountMinor),
  };
}

export class SqliteInterestRepository implements InterestRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async createPlan(plan: InterestPlan): Promise<void> {
    await this.db.insert(interestPlans).values({
      ...plan,
      annualRatePpm: toSqliteSafeInteger(plan.annualRatePpm),
    });
  }

  async findPlanById(id: string): Promise<InterestPlan | null> {
    const row = await this.db
      .select()
      .from(interestPlans)
      .where(eq(interestPlans.id, id))
      .get();
    return row ? mapPlan(row) : null;
  }

  async listPlans(includeClosed = false): Promise<InterestPlan[]> {
    const rows = await this.db
      .select()
      .from(interestPlans)
      .orderBy(asc(interestPlans.createdAt))
      .all();
    return rows
      .filter((row) => includeClosed || row.status !== "CLOSED")
      .map(mapPlan);
  }

  async setPlanStatus(
    id: string,
    status: InterestPlanStatus,
    updatedAt: string,
  ): Promise<void> {
    const result = await this.db
      .update(interestPlans)
      .set({ status, updatedAt })
      .where(eq(interestPlans.id, id))
      .run();
    if (result.changes !== 1) {
      throw new Error(`Interest plan does not exist: ${id}`);
    }
  }

  async createAccrual(accrual: InterestAccrual): Promise<void> {
    await this.db.insert(interestAccruals).values({
      ...accrual,
      principalMinor: toSqliteSafeInteger(accrual.principalMinor),
      accruedNumerator: accrual.accruedNumerator.toString(),
      accruedDenominator: accrual.accruedDenominator.toString(),
      amountMinor: toSqliteSafeInteger(accrual.amountMinor),
    });
  }

  async findAccrualById(id: string): Promise<InterestAccrual | null> {
    const row = await this.db
      .select()
      .from(interestAccruals)
      .where(eq(interestAccruals.id, id))
      .get();
    return row ? mapAccrual(row) : null;
  }

  async findAccrualByIdempotencyKey(
    key: string,
  ): Promise<InterestAccrual | null> {
    const row = await this.db
      .select()
      .from(interestAccruals)
      .where(eq(interestAccruals.idempotencyKey, key))
      .get();
    return row ? mapAccrual(row) : null;
  }

  async listAccruals(planId: string): Promise<InterestAccrual[]> {
    const rows = await this.db
      .select()
      .from(interestAccruals)
      .where(eq(interestAccruals.planId, planId))
      .orderBy(
        asc(interestAccruals.periodStart),
        asc(interestAccruals.createdAt),
      )
      .all();
    return rows.map(mapAccrual);
  }

  async hasExternalPrincipalMovements(plan: InterestPlan): Promise<boolean> {
    const ownEntries = await this.db
      .select({ journalEntryId: interestAccruals.journalEntryId })
      .from(interestAccruals)
      .where(eq(interestAccruals.planId, plan.id))
      .all();
    const ownIds = new Set(
      ownEntries
        .map((row) => row.journalEntryId)
        .filter((id): id is string => id !== null),
    );
    const movements = await this.db
      .select({
        id: journalEntries.id,
        occurredAt: journalEntries.occurredAt,
      })
      .from(journalEntries)
      .innerJoin(journalLines, eq(journalLines.entryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.accountId, plan.principalAccountId),
          eq(journalEntries.status, "POSTED"),
        ),
      )
      .all();
    const cutoff = zonedStartOfDayUtc(plan.startDate, plan.timezoneId);
    return movements.some((movement) => {
      if (ownIds.has(movement.id)) return false;
      const occurredAt = Date.parse(movement.occurredAt);
      return Number.isNaN(occurredAt) || occurredAt >= cutoff;
    });
  }

  async commitPostedAccrual(
    input: InterestPostingCommit,
  ): Promise<InterestAccrual> {
    return this.db.transaction((tx) => {
      const accrualRow = tx
        .select()
        .from(interestAccruals)
        .where(eq(interestAccruals.id, input.accrualId))
        .get();
      if (!accrualRow) {
        throw new Error(`Interest accrual does not exist: ${input.accrualId}`);
      }
      if (accrualRow.status !== "ACCRUED") {
        return mapAccrual(accrualRow);
      }
      if (
        input.journalEntry.status !== "POSTED" ||
        input.journalEntry.postedAt !== input.postedAt ||
        input.journalEntry.idempotencyKey !== accrualRow.idempotencyKey
      ) {
        throw new Error(
          "Interest posting identity or status does not match its accrual",
        );
      }

      validateJournalEntry(
        input.journalEntry,
        input.journalLines,
        this.readPostingContext(tx),
      );

      const existing = tx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.idempotencyKey, accrualRow.idempotencyKey))
        .get();
      if (existing) {
        throw new Error(
          "Interest journal exists without a committed accrual transition",
        );
      }

      const persistedLines = this.toPersistenceLines(input.journalLines);
      tx.insert(journalEntries)
        .values({
          ...input.journalEntry,
          status: "DRAFT",
          postedAt: null,
          transactionKind: input.journalEntry.transactionKind ?? "ADJUSTMENT",
          categoryId: input.journalEntry.categoryId ?? null,
        })
        .run();
      tx.insert(journalLines).values(persistedLines).run();

      const posted = tx
        .update(journalEntries)
        .set({ status: "POSTED", postedAt: input.postedAt })
        .where(eq(journalEntries.id, input.journalEntry.id))
        .run();
      if (posted.changes !== 1) {
        throw new Error("Interest Journal Entry could not be posted");
      }

      const nextStatus =
        accrualRow.accrualKind === "PAYOUT" ? "PAID" : "POSTED";
      const updated = tx
        .update(interestAccruals)
        .set({
          status: nextStatus,
          amountMinor: toSqliteSafeInteger(input.amountMinor),
          journalEntryId: input.journalEntry.id,
          postedAt: input.postedAt,
          paidAt: nextStatus === "PAID" ? input.postedAt : null,
        })
        .where(eq(interestAccruals.id, input.accrualId))
        .run();
      if (updated.changes !== 1) {
        throw new Error("Interest accrual state could not be committed");
      }
      const result = tx
        .select()
        .from(interestAccruals)
        .where(eq(interestAccruals.id, input.accrualId))
        .get();
      if (!result) throw new Error("Committed interest accrual disappeared");
      return mapAccrual(result);
    });
  }

  private readPostingContext(tx: InterestTransaction): PostingContext {
    const accountRows = tx.select().from(accounts).all();
    const currencyRows = tx.select().from(currencies).all();
    const categoryRows = tx.select().from(categories).all();
    return {
      accounts: new Map(accountRows.map((row) => [row.id, row])),
      currencies: new Map(
        currencyRows.map((row) => [
          row.code,
          { code: row.code, minorUnit: row.minorUnit, isActive: row.isActive },
        ]),
      ),
      categories: new Map(
        categoryRows.map((row) => [
          row.id,
          { id: row.id, kind: row.kind, isArchived: row.isArchived },
        ]),
      ),
    };
  }

  private toPersistenceLines(lines: readonly JournalLine[]) {
    const ids = new Set<string>();
    const numbers = new Set<number>();
    return lines.map((line) => {
      if (!line.id.trim() || ids.has(line.id)) {
        throw new Error("Journal line identities must be unique and non-empty");
      }
      if (
        !Number.isSafeInteger(line.lineNumber) ||
        line.lineNumber <= 0 ||
        numbers.has(line.lineNumber)
      ) {
        throw new Error(
          "Journal line numbers must be unique positive integers",
        );
      }
      ids.add(line.id);
      numbers.add(line.lineNumber);
      if (line.amountMinor <= 0n || line.baseAmountMinor < 0n) {
        throw new Error("Journal line amounts are invalid");
      }
      return {
        ...line,
        amountMinor: toSqliteSafeInteger(line.amountMinor),
        baseAmountMinor: toSqliteSafeInteger(line.baseAmountMinor),
      };
    });
  }
}
