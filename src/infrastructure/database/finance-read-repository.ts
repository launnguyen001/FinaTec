import { and, asc, eq, gte, lte } from "drizzle-orm";
import type {
  FinanceHistoryFilter,
  FinanceReadLine,
  FinanceReadRepository,
} from "../../domain/finance/finance-read-repository";
import type { LedgerDatabase } from "./database";
import { accounts, categories, journalEntries, journalLines } from "./schema";
import { fromSqliteInteger } from "../../domain/ledger/money";

export class SqliteFinanceReadRepository implements FinanceReadRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async listPostedLinesInRange(
    from: string,
    to: string,
  ): Promise<FinanceReadLine[]> {
    return this.query({ from, to });
  }

  async listHistory(filter: FinanceHistoryFilter): Promise<FinanceReadLine[]> {
    return this.query(filter);
  }

  private async query(
    filter: FinanceHistoryFilter,
  ): Promise<FinanceReadLine[]> {
    const conditions = [
      eq(journalEntries.status, "POSTED" as const),
      gte(journalEntries.occurredAt, filter.from),
      lte(journalEntries.occurredAt, filter.to),
    ];
    if (filter.categoryId)
      conditions.push(eq(journalEntries.categoryId, filter.categoryId));
    if (filter.accountId)
      conditions.push(eq(journalLines.accountId, filter.accountId));
    const rows = await this.db
      .select({
        entry: journalEntries,
        line: journalLines,
        accountType: accounts.type,
        accountName: accounts.name,
        categoryName: categories.name,
      })
      .from(journalEntries)
      .innerJoin(journalLines, eq(journalLines.entryId, journalEntries.id))
      .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
      .leftJoin(categories, eq(categories.id, journalEntries.categoryId))
      .where(and(...conditions))
      .orderBy(
        asc(journalEntries.occurredAt),
        asc(journalEntries.createdAt),
        asc(journalLines.lineNumber),
      )
      .all();
    return rows.map((row) => ({
      entry: row.entry,
      line: {
        ...row.line,
        amountMinor: fromSqliteInteger(row.line.amountMinor),
        baseAmountMinor: fromSqliteInteger(row.line.baseAmountMinor),
      },
      accountType: row.accountType,
      accountName: row.accountName,
      categoryName: row.categoryName ?? null,
    }));
  }
}
