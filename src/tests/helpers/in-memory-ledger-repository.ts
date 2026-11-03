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

/**
 * Test adapter with the same persistence semantics that the SQLite adapter
 * enforces: unique idempotency keys, one reversal per original entry, and an
 * all-or-nothing commit for a posted entry and its lines.
 */
export class InMemoryLedgerRepository implements LedgerRepository {
  readonly currencies = new Map<string, CurrencyRecord>();
  readonly accounts = new Map<string, Account>();
  readonly entries = new Map<string, JournalEntry>();
  readonly linesByEntry = new Map<string, JournalLine[]>();

  baseCurrency: string | null = null;
  failNextCommit: Error | null = null;
  commitCount = 0;

  async listCurrencies(activeOnly = true): Promise<CurrencyRecord[]> {
    return [...this.currencies.values()]
      .filter((currency) => !activeOnly || currency.isActive)
      .sort((left, right) => left.code.localeCompare(right.code));
  }

  async createCurrency(currency: CurrencyRecord): Promise<void> {
    if (this.currencies.has(currency.code)) {
      throw new Error(`Currency already exists: ${currency.code}`);
    }
    this.currencies.set(currency.code, currency);
  }

  async createAccount(account: Account): Promise<void> {
    const currency = this.currencies.get(account.currencyCode);
    if (!currency?.isActive) {
      throw new Error("Account currency is missing or inactive");
    }
    if (this.accounts.has(account.id)) {
      throw new Error(`Account already exists: ${account.id}`);
    }
    this.accounts.set(account.id, account);
  }

  async findAccountById(id: string): Promise<Account | null> {
    return this.accounts.get(id) ?? null;
  }

  async listAccounts(includeArchived = false): Promise<Account[]> {
    return [...this.accounts.values()]
      .filter((account) => includeArchived || !account.isArchived)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async createDraftEntry(input: CreateDraftEntry): Promise<void> {
    if (input.entry.status !== "DRAFT" || input.entry.postedAt !== null) {
      throw new Error("Repository accepts draft entries only");
    }
    if (input.lines.length === 0) {
      throw new Error("A draft journal entry must contain at least one line");
    }
    this.assertIdempotencyUnused(input.entry);
    this.entries.set(input.entry.id, input.entry);
    this.linesByEntry.set(input.entry.id, [...input.lines]);
  }

  async findJournalEntryById(id: string): Promise<JournalEntry | null> {
    return this.entries.get(id) ?? null;
  }

  async findJournalEntryByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<JournalEntry | null> {
    return (
      [...this.entries.values()].find(
        (entry) => entry.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async findReversalOfEntry(entryId: string): Promise<JournalEntry | null> {
    return (
      [...this.entries.values()].find(
        (entry) => entry.reversalOfId === entryId,
      ) ?? null
    );
  }

  async listJournalLines(entryId: string): Promise<JournalLine[]> {
    return [...(this.linesByEntry.get(entryId) ?? [])].sort(
      (left, right) => left.lineNumber - right.lineNumber,
    );
  }

  async listPostedJournalLinesForAccount(
    accountId: string,
  ): Promise<JournalLine[]> {
    const posted = [...this.entries.values()]
      .filter((entry) => entry.status === "POSTED")
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    return posted.flatMap((entry) =>
      (this.linesByEntry.get(entry.id) ?? [])
        .filter((line) => line.accountId === accountId)
        .sort((left, right) => left.lineNumber - right.lineNumber),
    );
  }

  async postDraftEntry(
    entryId: string,
    postedAt: string,
  ): Promise<PostingResult> {
    const entry = this.entries.get(entryId);
    if (!entry) {
      throw new Error(`Journal entry does not exist: ${entryId}`);
    }
    const lines = await this.listJournalLines(entryId);
    if (entry.status === "POSTED") {
      return { entry, lines, created: false };
    }
    if (lines.length < 2) {
      throw new Error(
        "A journal entry must contain at least two lines before posting",
      );
    }
    const posted: JournalEntry = { ...entry, status: "POSTED", postedAt };
    this.entries.set(entry.id, posted);
    return { entry: posted, lines, created: true };
  }

  async commitPostedEntry(input: PostingCommitInput): Promise<PostingResult> {
    this.commitCount += 1;
    if (this.failNextCommit) {
      const failure = this.failNextCommit;
      this.failNextCommit = null;
      throw failure;
    }
    if (input.entry.status !== "POSTED" || input.entry.postedAt === null) {
      throw new Error("Repository accepts posted entries only");
    }
    if (input.lines.length < 2) {
      throw new Error("A posted journal entry must contain at least two lines");
    }

    this.assertIdempotencyUnused(input.entry);
    if (input.entry.reversalOfId !== null) {
      const reversal = await this.findReversalOfEntry(input.entry.reversalOfId);
      if (reversal) {
        throw new Error(
          `Journal entry has already been reversed: ${input.entry.reversalOfId}`,
        );
      }
    }

    this.entries.set(input.entry.id, input.entry);
    this.linesByEntry.set(input.entry.id, [...input.lines]);
    return { entry: input.entry, lines: input.lines, created: true };
  }

  async getBaseCurrencyCode(): Promise<string | null> {
    return this.baseCurrency;
  }

  async setBaseCurrencyCode(code: string): Promise<void> {
    const currency = this.currencies.get(code);
    if (!currency?.isActive) {
      throw new Error("Base currency is missing or inactive");
    }
    this.baseCurrency = code;
  }

  private assertIdempotencyUnused(entry: JournalEntry): void {
    if (entry.idempotencyKey === null) return;
    const duplicate = [...this.entries.values()].find(
      (candidate) =>
        candidate.idempotencyKey === entry.idempotencyKey &&
        candidate.id !== entry.id,
    );
    if (duplicate) {
      throw new Error(`Duplicate idempotency key: ${entry.idempotencyKey}`);
    }
  }
}
