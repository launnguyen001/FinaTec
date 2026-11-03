import type { AccountType, JournalEntry, JournalLine } from "../ledger/repository";

export interface FinanceReadLine {
  entry: JournalEntry;
  line: JournalLine;
  accountType: AccountType;
  accountName: string;
  categoryName: string | null;
}

export interface FinanceHistoryFilter {
  from: string;
  to: string;
  categoryId?: string | null;
  accountId?: string | null;
}

export interface FinanceReadRepository {
  listPostedLinesInRange(from: string, to: string): Promise<FinanceReadLine[]>;
  listHistory(filter: FinanceHistoryFilter): Promise<FinanceReadLine[]>;
}
