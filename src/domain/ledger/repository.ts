export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export type JournalStatus = "DRAFT" | "POSTED";
export type JournalSide = "DEBIT" | "CREDIT";

export interface CurrencyRecord {
  code: string;
  name: string;
  minorUnit: number;
  isActive: boolean;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  occurredAt: string;
  description: string | null;
  status: JournalStatus;
  baseCurrencyCode: string;
  idempotencyKey: string | null;
  reversalOfId: string | null;
  createdAt: string;
  postedAt: string | null;
}

export interface JournalLine {
  id: string;
  entryId: string;
  lineNumber: number;
  accountId: string;
  currencyCode: string;
  side: JournalSide;
  amountMinor: bigint;
  fxRateNumerator: string;
  fxRateDenominator: string;
  baseAmountMinor: bigint;
  memo: string | null;
  createdAt: string;
}

export interface CreateDraftEntry {
  entry: JournalEntry;
  lines: JournalLine[];
}

/** Application-facing persistence port. It deliberately exposes no SQLite/Drizzle types. */
export interface LedgerRepository {
  listCurrencies(activeOnly?: boolean): Promise<CurrencyRecord[]>;
  createCurrency(currency: CurrencyRecord): Promise<void>;
  createAccount(account: Account): Promise<void>;
  findAccountById(id: string): Promise<Account | null>;
  listAccounts(includeArchived?: boolean): Promise<Account[]>;
  createDraftEntry(input: CreateDraftEntry): Promise<void>;
  findJournalEntryById(id: string): Promise<JournalEntry | null>;
  listJournalLines(entryId: string): Promise<JournalLine[]>;
  getBaseCurrencyCode(): Promise<string | null>;
  setBaseCurrencyCode(code: string, timestamp: string): Promise<void>;
}
