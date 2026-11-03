import type {
  FinanceHistoryFilter,
  FinanceReadRepository,
} from "../../domain/finance/finance-read-repository";
import type { JournalEntry, JournalLine } from "../../domain/ledger/repository";

export interface TransactionHistoryItem {
  entry: JournalEntry;
  categoryName: string | null;
  lines: { line: JournalLine; accountName: string; accountType: string }[];
}

export class TransactionHistoryService {
  constructor(private readonly reads: FinanceReadRepository) {}

  async list(filter: FinanceHistoryFilter): Promise<TransactionHistoryItem[]> {
    if (!filter.from.trim() || !filter.to.trim() || filter.from > filter.to)
      throw new Error("History date range is invalid");
    const rows = await this.reads.listHistory(filter);
    const grouped = new Map<string, TransactionHistoryItem>();
    for (const row of rows) {
      let item = grouped.get(row.entry.id);
      if (!item) {
        item = { entry: row.entry, categoryName: row.categoryName, lines: [] };
        grouped.set(row.entry.id, item);
      }
      item.lines.push({
        line: row.line,
        accountName: row.accountName,
        accountType: row.accountType,
      });
    }
    return [...grouped.values()].sort((left, right) =>
      right.entry.occurredAt.localeCompare(left.entry.occurredAt),
    );
  }
}
