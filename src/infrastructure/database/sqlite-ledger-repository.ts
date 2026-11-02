import { asc, eq } from "drizzle-orm";

import {
  fromSqliteInteger,
  toSqliteSafeInteger,
} from "../../domain/ledger/money";
import type {
  Account,
  CreateDraftEntry,
  CurrencyRecord,
  JournalEntry,
  JournalLine,
  LedgerRepository,
} from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import {
  accounts,
  currencies,
  journalEntries,
  journalLines,
  ledgerSettings,
} from "./schema";

export class SqliteLedgerRepository implements LedgerRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async listCurrencies(activeOnly = true): Promise<CurrencyRecord[]> {
    const query = this.db.select().from(currencies).orderBy(asc(currencies.code));
    if (activeOnly) return query.where(eq(currencies.isActive, true)).all();
    return query.all();
  }

  async createCurrency(currency: CurrencyRecord): Promise<void> {
    await this.db.insert(currencies).values(currency);
  }

  async createAccount(account: Account): Promise<void> {
    await this.db.insert(accounts).values(account);
  }

  async findAccountById(id: string): Promise<Account | null> {
    const row = await this.db.select().from(accounts).where(eq(accounts.id, id)).get();
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

    const lineNumbers = new Set<number>();
    const rows = input.lines.map((line) => {
      if (line.entryId !== input.entry.id) {
        throw new Error("Every journal line must belong to the supplied entry");
      }
      if (!Number.isSafeInteger(line.lineNumber) || line.lineNumber <= 0 || lineNumbers.has(line.lineNumber)) {
        throw new Error("Journal line numbers must be unique positive safe integers");
      }
      lineNumbers.add(line.lineNumber);
      if (line.amountMinor <= 0n || line.baseAmountMinor < 0n) {
        throw new Error("Journal amounts must be positive native and non-negative base minor units");
      }
      if (!/^[1-9]\d*$/.test(line.fxRateNumerator) || !/^[1-9]\d*$/.test(line.fxRateDenominator)) {
        throw new Error("FX rate numerator and denominator must be positive integer strings");
      }
      return {
        ...line,
        amountMinor: toSqliteSafeInteger(line.amountMinor),
        baseAmountMinor: toSqliteSafeInteger(line.baseAmountMinor),
      };
    });

    await this.db.transaction(async (tx) => {
      await tx.insert(journalEntries).values(input.entry);
      await tx.insert(journalLines).values(rows);
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

  async listJournalLines(entryId: string): Promise<JournalLine[]> {
    const rows = await this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.entryId, entryId))
      .orderBy(asc(journalLines.lineNumber))
      .all();
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
