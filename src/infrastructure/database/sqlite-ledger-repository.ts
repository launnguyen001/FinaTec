import { and, asc, eq, getTableColumns } from "drizzle-orm";

import {
  fromSqliteInteger,
  toSqliteSafeInteger,
} from "../../domain/ledger/money";
import {
  validateDraftForPosting,
  validateJournalEntry,
  type PostingContext,
} from "../../domain/ledger/posting";
import type {
  Account,
  CreateDraftEntry,
  CurrencyRecord,
  JournalEntry,
  JournalLine,
  LedgerRepository,
  PostingCommitInput,
  PostingResult,
} from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import {
  accounts,
  currencies,
  journalEntries,
  journalLines,
  ledgerSettings,
} from "./schema";

type LedgerTransaction = Parameters<
  Parameters<LedgerDatabase["transaction"]>[0]
>[0];

export class SqliteLedgerRepository implements LedgerRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async listCurrencies(activeOnly = true): Promise<CurrencyRecord[]> {
    const query = this.db
      .select()
      .from(currencies)
      .orderBy(asc(currencies.code));
    if (activeOnly) return query.where(eq(currencies.isActive, true)).all();
    return query.all();
  }

  async createCurrency(currency: CurrencyRecord): Promise<void> {
    await this.db.insert(currencies).values(currency);
  }

  async createAccount(account: Account): Promise<void> {
    const currency = await this.db
      .select({ isActive: currencies.isActive })
      .from(currencies)
      .where(eq(currencies.code, account.currencyCode))
      .get();
    if (!currency?.isActive) {
      throw new Error("Account currency is missing or inactive");
    }
    await this.db.insert(accounts).values(account);
  }

  async findAccountById(id: string): Promise<Account | null> {
    const row = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .get();
    return row ?? null;
  }

  async listAccounts(includeArchived = false): Promise<Account[]> {
    const query = this.db.select().from(accounts).orderBy(asc(accounts.name));
    if (includeArchived) return query.all();
    return query.where(eq(accounts.isArchived, false)).all();
  }

  async createDraftEntry(input: CreateDraftEntry): Promise<void> {
    if (input.entry.status !== "DRAFT" || input.entry.postedAt !== null) {
      throw new Error("Repository accepts draft entries only");
    }
    if (input.lines.length === 0) {
      throw new Error("A draft journal entry must contain at least one line");
    }

    const rows = this.toPersistenceRows(input.entry, input.lines);

    this.db.transaction((tx) => {
      // Drizzle's Expo SQLite session is synchronous: an async callback would
      // return its Promise before the first await and commit the transaction
      // early. Use synchronous query execution so both writes remain atomic.
      tx.insert(journalEntries).values(input.entry).run();
      tx.insert(journalLines).values(rows).run();
    });
  }

  async findJournalEntryById(id: string): Promise<JournalEntry | null> {
    const row = await this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id))
      .get();
    return row ?? null;
  }

  async findJournalEntryByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<JournalEntry | null> {
    const row = await this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.idempotencyKey, idempotencyKey))
      .get();
    return row ?? null;
  }

  async findReversalOfEntry(entryId: string): Promise<JournalEntry | null> {
    const row = await this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.reversalOfId, entryId))
      .get();
    return row ?? null;
  }

  async postDraftEntry(
    entryId: string,
    postedAt: string,
  ): Promise<PostingResult> {
    if (!postedAt.trim()) {
      throw new Error("A posted timestamp is required");
    }

    // Keep the read/validate/write sequence inside one synchronous SQLite
    // transaction; the posted-history triggers remain the final immutability
    // guard.
    return this.db.transaction((tx) => {
      const current = tx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, entryId))
        .get();
      if (!current) {
        throw new Error(`Journal entry does not exist: ${entryId}`);
      }

      const lineRows = tx
        .select()
        .from(journalLines)
        .where(eq(journalLines.entryId, entryId))
        .orderBy(asc(journalLines.lineNumber))
        .all();
      const lines = this.toDomainLines(lineRows);

      if (current.status === "POSTED") {
        return { entry: current, lines, created: false };
      }
      if (lines.length < 2) {
        throw new Error(
          "A journal entry must contain at least two lines before posting",
        );
      }

      validateDraftForPosting(current, lines, this.readPostingContext(tx));

      const updated = tx
        .update(journalEntries)
        .set({ status: "POSTED", postedAt })
        .where(eq(journalEntries.id, entryId))
        .run();
      if (updated.changes !== 1) {
        throw new Error(`Journal entry could not be posted: ${entryId}`);
      }

      const posted = tx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, entryId))
        .get();
      if (!posted) {
        throw new Error(`Journal entry disappeared while posting: ${entryId}`);
      }
      return { entry: posted, lines, created: true };
    });
  }

  async commitPostedEntry(input: PostingCommitInput): Promise<PostingResult> {
    if (input.entry.status !== "POSTED" || input.entry.postedAt === null) {
      throw new Error("Repository accepts posted entries only");
    }
    const postedAt = input.entry.postedAt;
    if (input.lines.length < 2) {
      throw new Error("A posted journal entry must contain at least two lines");
    }
    const rows = this.toPersistenceRows(input.entry, input.lines);
    const draftRow = {
      ...input.entry,
      status: "DRAFT" as const,
      postedAt: null,
    };

    return this.db.transaction((tx) => {
      if (input.entry.idempotencyKey !== null) {
        const existing = tx
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.idempotencyKey, input.entry.idempotencyKey))
          .get();
        if (existing) {
          if (existing.status !== "POSTED") {
            throw new Error(
              "Idempotency key is already used by a non-posted journal entry",
            );
          }
          const existingLines = tx
            .select()
            .from(journalLines)
            .where(eq(journalLines.entryId, existing.id))
            .orderBy(asc(journalLines.lineNumber))
            .all();
          return {
            entry: existing,
            lines: this.toDomainLines(existingLines),
            created: false,
          };
        }
      }

      if (input.entry.reversalOfId !== null) {
        const existingReversal = tx
          .select()
          .from(journalEntries)
          .where(eq(journalEntries.reversalOfId, input.entry.reversalOfId))
          .get();
        if (existingReversal) {
          throw new Error(
            `Journal entry has already been reversed: ${input.entry.reversalOfId}`,
          );
        }
      }

      validateJournalEntry(
        input.entry,
        input.lines,
        this.readPostingContext(tx),
      );

      // The schema forbids adding lines to an entry whose status is already
      // POSTED. Insert the entry as DRAFT, insert all lines, then post it in
      // the same transaction. Any failure rolls back the whole command.
      tx.insert(journalEntries).values(draftRow).run();
      tx.insert(journalLines).values(rows).run();
      const updated = tx
        .update(journalEntries)
        .set({ status: "POSTED", postedAt })
        .where(eq(journalEntries.id, input.entry.id))
        .run();
      if (updated.changes !== 1) {
        throw new Error(`Journal entry could not be posted: ${input.entry.id}`);
      }
      return { entry: input.entry, lines: input.lines, created: true };
    });
  }

  async listJournalLines(entryId: string): Promise<JournalLine[]> {
    const rows = await this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.entryId, entryId))
      .orderBy(asc(journalLines.lineNumber))
      .all();
    return this.toDomainLines(rows);
  }

  async listPostedJournalLinesForAccount(
    accountId: string,
  ): Promise<JournalLine[]> {
    const rows = await this.db
      .select(getTableColumns(journalLines))
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
      .where(
        and(
          eq(journalLines.accountId, accountId),
          eq(journalEntries.status, "POSTED"),
        ),
      )
      .orderBy(
        asc(journalEntries.occurredAt),
        asc(journalEntries.createdAt),
        asc(journalLines.lineNumber),
      )
      .all();
    return this.toDomainLines(rows);
  }

  private readPostingContext(tx: LedgerTransaction): PostingContext {
    const accountRows = tx.select().from(accounts).all();
    const currencyRows = tx.select().from(currencies).all();
    return {
      accounts: new Map(accountRows.map((account) => [account.id, account])),
      currencies: new Map(
        currencyRows.map((currency) => [
          currency.code,
          {
            code: currency.code,
            minorUnit: currency.minorUnit,
            isActive: currency.isActive,
          },
        ]),
      ),
    };
  }

  private toPersistenceRows(
    entry: JournalEntry,
    lines: readonly JournalLine[],
  ) {
    const lineNumbers = new Set<number>();
    const lineIds = new Set<string>();

    return lines.map((line) => {
      if (line.entryId !== entry.id) {
        throw new Error("Every journal line must belong to the supplied entry");
      }
      if (!line.id.trim() || lineIds.has(line.id)) {
        throw new Error("Journal line identities must be non-empty and unique");
      }
      lineIds.add(line.id);
      if (
        !Number.isSafeInteger(line.lineNumber) ||
        line.lineNumber <= 0 ||
        lineNumbers.has(line.lineNumber)
      ) {
        throw new Error(
          "Journal line numbers must be unique positive safe integers",
        );
      }
      lineNumbers.add(line.lineNumber);
      if (line.amountMinor <= 0n || line.baseAmountMinor < 0n) {
        throw new Error(
          "Journal amounts must be positive native and non-negative base minor units",
        );
      }
      if (
        !/^[1-9]\d*$/.test(line.fxRateNumerator) ||
        !/^[1-9]\d*$/.test(line.fxRateDenominator)
      ) {
        throw new Error(
          "FX rate numerator and denominator must be positive integer strings",
        );
      }
      if (
        line.currencyCode === entry.baseCurrencyCode &&
        (line.fxRateNumerator !== "1" ||
          line.fxRateDenominator !== "1" ||
          line.amountMinor !== line.baseAmountMinor)
      ) {
        throw new Error(
          "A base-currency journal line must use FX 1/1 and preserve its minor-unit amount",
        );
      }
      return {
        ...line,
        amountMinor: toSqliteSafeInteger(line.amountMinor),
        baseAmountMinor: toSqliteSafeInteger(line.baseAmountMinor),
      };
    });
  }

  private toDomainLines(
    rows: readonly (typeof journalLines.$inferSelect)[],
  ): JournalLine[] {
    return rows.map((row) => ({
      ...row,
      amountMinor: fromSqliteInteger(row.amountMinor),
      baseAmountMinor: fromSqliteInteger(row.baseAmountMinor),
    }));
  }

  async getBaseCurrencyCode(): Promise<string | null> {
    const row = await this.db
      .select({ code: ledgerSettings.baseCurrencyCode })
      .from(ledgerSettings)
      .where(eq(ledgerSettings.id, 1))
      .get();
    return row?.code ?? null;
  }

  async setBaseCurrencyCode(code: string, timestamp: string): Promise<void> {
    const currency = await this.db
      .select({ isActive: currencies.isActive })
      .from(currencies)
      .where(eq(currencies.code, code))
      .get();
    if (!currency?.isActive) {
      throw new Error("Base currency is missing or inactive");
    }
    await this.db
      .insert(ledgerSettings)
      .values({
        id: 1,
        baseCurrencyCode: code,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: ledgerSettings.id,
        set: { baseCurrencyCode: code, updatedAt: timestamp },
      });
  }
}
