import { asc, eq } from "drizzle-orm";

import type {
  Account,
  CreateDraftEntry,
  JournalEntry,
  JournalLine,
  LedgerRepository,
} from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import {
  accounts,
  journalEntries,
  journalLines,
  ledgerSettings,
} from "./schema";

export class SqliteLedgerRepository implements LedgerRepository {
  constructor(private readonly db: LedgerDatabase) {}

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

    await this.db.transaction(async (tx) => {
      await tx.insert(journalEntries).values(input.entry);
      await tx.insert(journalLines).values(input.lines);
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
    return this.db
      .select()
      .from(journalLines)
      .where(eq(journalLines.entryId, entryId))
      .orderBy(asc(journalLines.lineNumber))
      .all();
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
