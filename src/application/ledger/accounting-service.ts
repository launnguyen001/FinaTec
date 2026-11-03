import { Currency } from "../../domain/ledger/currency";
import {
  calculateAccountBalance,
  normalBalanceOf,
  validateDraftForPosting,
  validateJournalEntry,
} from "../../domain/ledger/posting";
import {
  buildJournalPosting,
  resolveFxSnapshot,
  type BuiltJournalPosting,
  type PostingLineSpec,
} from "../../domain/ledger/posting-plan";
import type {
  Account,
  JournalStatus,
  LedgerRepository,
  PostingResult,
} from "../../domain/ledger/repository";

export interface AccountingServiceOptions {
  /** Generates opaque entry and line identities. */
  createId: () => string;
  /** ISO-8601 UTC clock. Defaults to the system clock. */
  now?: () => string;
}

export interface JournalLinesInput {
  /** Stable key supplied by the caller; retries return the original result. */
  idempotencyKey: string;
  occurredAt?: string;
  description?: string | null;
  transactionKind?: import("../../domain/ledger/repository").TransactionKind;
  categoryId?: string | null;
  lines: readonly PostingLineSpec[];
}

export interface CreateJournalEntryInput extends JournalLinesInput {
  /** Defaults to the configured ledger base currency. */
  baseCurrencyCode?: string;
}

export interface OpeningBalanceInput {
  idempotencyKey: string;
  /** ASSET or LIABILITY account whose normal-side balance is being opened. */
  accountId: string;
  /** Equity account that receives the opposite side. */
  offsetAccountId: string;
  /** Signed amount in the account's native currency; negative creates a contra balance. */
  amountMinor: bigint;
  occurredAt?: string;
  description?: string | null;
  fxRateNumerator?: string;
  fxRateDenominator?: string;
}

export interface TransferFundsInput {
  idempotencyKey: string;
  fromAccountId: string;
  toAccountId: string;
  /** Positive amount debited from the source account's native currency. */
  amountMinor: bigint;
  /** Required when currencies differ; defaults to the source amount otherwise. */
  toAmountMinor?: bigint;
  occurredAt?: string;
  description?: string | null;
  fxRateNumerator?: string;
  fxRateDenominator?: string;
  toFxRateNumerator?: string;
  toFxRateDenominator?: string;
}

export interface ReverseEntryInput {
  idempotencyKey: string;
  originalEntryId: string;
  occurredAt?: string;
  description?: string | null;
  reason?: string;
}

interface LoadedContext {
  baseCurrencyCode: string;
  accounts: ReadonlyMap<string, Account>;
  currencies: ReadonlyMap<
    string,
    { code: string; minorUnit: number; isActive: boolean }
  >;
  allowedArchivedAccountIds?: ReadonlySet<string>;
}

/**
 * Application-layer accounting use cases. The service depends only on the
 * domain repository port; it contains no React Native, Expo or SQLite code.
 */
export class AccountingService {
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    private readonly repository: LedgerRepository,
    options: AccountingServiceOptions,
  ) {
    this.createId = options.createId;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  /**
   * Creates a fully validated but unposted draft. Its lines are excluded from
   * balances until `postDraft` moves it to POSTED.
   */
  async createDraft(input: CreateJournalEntryInput): Promise<PostingResult> {
    const key = this.requireIdempotencyKey(input.idempotencyKey);
    const existing =
      await this.repository.findJournalEntryByIdempotencyKey(key);
    if (existing) {
      return {
        entry: existing,
        lines: await this.repository.listJournalLines(existing.id),
        created: false,
      };
    }

    const context = await this.loadContext();
    const built = this.buildPosting({
      status: "DRAFT",
      occurredAt: input.occurredAt ?? this.now(),
      description: input.description ?? null,
      baseCurrencyCode: input.baseCurrencyCode ?? context.baseCurrencyCode,
      idempotencyKey: key,
      reversalOfId: null,
      transactionKind: input.transactionKind ?? "LEGACY",
      categoryId: input.categoryId ?? null,
      createdAt: this.now(),
      postedAt: null,
      lines: input.lines,
      context,
    });

    try {
      await this.repository.createDraftEntry(built);
    } catch (error) {
      // A concurrent retry may have won the unique idempotency index race.
      const raced = await this.repository.findJournalEntryByIdempotencyKey(key);
      if (raced) {
        return {
          entry: raced,
          lines: await this.repository.listJournalLines(raced.id),
          created: false,
        };
      }
      throw error;
    }

    return { ...built, created: true };
  }

  /** Posts a new balanced entry directly, in one atomic repository command. */
  async postEntry(input: CreateJournalEntryInput): Promise<PostingResult> {
    const key = this.requireIdempotencyKey(input.idempotencyKey);
    const existing = await this.findPostedByIdempotencyKey(key);
    if (existing) return existing;

    const context = await this.loadContext();
    const built = this.buildPosting({
      status: "POSTED",
      occurredAt: input.occurredAt ?? this.now(),
      description: input.description ?? null,
      baseCurrencyCode: input.baseCurrencyCode ?? context.baseCurrencyCode,
      idempotencyKey: key,
      reversalOfId: null,
      transactionKind: input.transactionKind ?? "LEGACY",
      categoryId: input.categoryId ?? null,
      createdAt: this.now(),
      postedAt: this.now(),
      lines: input.lines,
      context,
    });

    return this.repository.commitPostedEntry(built);
  }

  /** Moves an existing draft to POSTED after revalidating its snapshot. */
  async postDraft(entryId: string, postedAt?: string): Promise<PostingResult> {
    const entry = await this.repository.findJournalEntryById(entryId);
    if (!entry) {
      throw new Error(`Journal entry does not exist: ${entryId}`);
    }
    if (entry.status === "POSTED") {
      return {
        entry,
        lines: await this.repository.listJournalLines(entry.id),
        created: false,
      };
    }

    const lines = await this.repository.listJournalLines(entry.id);
    const context = await this.loadContext();
    validateDraftForPosting(entry, lines, context);

    return this.repository.postDraftEntry(entry.id, postedAt ?? this.now());
  }

  /**
   * Opens an ASSET/LIABILITY balance against an EQUITY account. The amount is
   * signed in the account's normal-side direction; a negative amount produces
   * the approved contra-balance posting.
   */
  async createOpeningBalance(
    input: OpeningBalanceInput,
  ): Promise<PostingResult> {
    const key = this.requireIdempotencyKey(input.idempotencyKey);
    const existing = await this.findPostedByIdempotencyKey(key);
    if (existing) return existing;

    const context = await this.loadContext();
    const account = this.requireAccount(context, input.accountId);
    const offset = this.requireAccount(context, input.offsetAccountId);

    if (account.type !== "ASSET" && account.type !== "LIABILITY") {
      throw new Error(
        "Opening balance must target an ASSET or LIABILITY account",
      );
    }
    if (offset.type !== "EQUITY") {
      throw new Error("Opening balance offset must be an EQUITY account");
    }
    if (account.currencyCode !== offset.currencyCode) {
      throw new Error(
        "Opening balance account and offset must use the same currency",
      );
    }
    if (input.amountMinor === 0n) {
      throw new Error("Opening balance amount must not be zero");
    }

    const fx = resolveFxSnapshot(
      account.currencyCode,
      context.baseCurrencyCode,
      input.fxRateNumerator,
      input.fxRateDenominator,
    );
    const normalSide = normalBalanceOf(account.type);
    const oppositeSide = normalSide === "DEBIT" ? "CREDIT" : "DEBIT";
    const amountMinor =
      input.amountMinor < 0n ? -input.amountMinor : input.amountMinor;
    const accountSide = input.amountMinor > 0n ? normalSide : oppositeSide;
    const offsetSide = accountSide === "DEBIT" ? "CREDIT" : "DEBIT";

    const built = this.buildPosting({
      status: "POSTED",
      occurredAt: input.occurredAt ?? this.now(),
      description: input.description ?? "Opening balance",
      baseCurrencyCode: context.baseCurrencyCode,
      idempotencyKey: key,
      reversalOfId: null,
      transactionKind: "OPENING_BALANCE",
      categoryId: null,
      createdAt: this.now(),
      postedAt: this.now(),
      lines: [
        {
          accountId: account.id,
          side: accountSide,
          amountMinor,
          fxRateNumerator: fx.numerator,
          fxRateDenominator: fx.denominator,
        },
        {
          accountId: offset.id,
          side: offsetSide,
          amountMinor,
          fxRateNumerator: fx.numerator,
          fxRateDenominator: fx.denominator,
        },
      ],
      context,
    });

    return this.repository.commitPostedEntry(built);
  }

  /**
   * Moves money between two ASSET accounts without touching INCOME or EXPENSE.
   * Same-currency transfers keep an identical amount on both sides. A
   * cross-currency transfer requires an explicit destination amount and both
   * FX snapshots, and is rejected unless both sides balance in base currency.
   */
  async transferFunds(input: TransferFundsInput): Promise<PostingResult> {
    const key = this.requireIdempotencyKey(input.idempotencyKey);
    const existing = await this.findPostedByIdempotencyKey(key);
    if (existing) return existing;

    const context = await this.loadContext();
    const from = this.requireAccount(context, input.fromAccountId);
    const to = this.requireAccount(context, input.toAccountId);

    if (from.id === to.id) {
      throw new Error("A transfer must use two different accounts");
    }
    if (from.type !== "ASSET" || to.type !== "ASSET") {
      throw new Error("Internal transfers must use ASSET source accounts");
    }
    if (input.amountMinor <= 0n) {
      throw new Error("Transfer amount must be positive");
    }

    const sameCurrency = from.currencyCode === to.currencyCode;
    let toAmountMinor: bigint;
    let fromFx: { numerator: string; denominator: string };
    let toFx: { numerator: string; denominator: string };

    if (sameCurrency) {
      toAmountMinor = input.toAmountMinor ?? input.amountMinor;
      if (toAmountMinor !== input.amountMinor) {
        throw new Error(
          "A same-currency transfer must use the same amount on both sides",
        );
      }
      fromFx = resolveFxSnapshot(
        from.currencyCode,
        context.baseCurrencyCode,
        input.fxRateNumerator,
        input.fxRateDenominator,
      );
      if (
        input.toFxRateNumerator !== undefined ||
        input.toFxRateDenominator !== undefined
      ) {
        const suppliedToFx = resolveFxSnapshot(
          to.currencyCode,
          context.baseCurrencyCode,
          input.toFxRateNumerator,
          input.toFxRateDenominator,
        );
        if (
          suppliedToFx.numerator !== fromFx.numerator ||
          suppliedToFx.denominator !== fromFx.denominator
        ) {
          throw new Error(
            "Both sides of a same-currency transfer must share one FX snapshot",
          );
        }
      }
      toFx = fromFx;
    } else {
      if (input.toAmountMinor === undefined || input.toAmountMinor <= 0n) {
        throw new Error(
          "A cross-currency transfer requires a positive destination amount",
        );
      }
      toAmountMinor = input.toAmountMinor;
      fromFx = resolveFxSnapshot(
        from.currencyCode,
        context.baseCurrencyCode,
        input.fxRateNumerator,
        input.fxRateDenominator,
      );
      toFx = resolveFxSnapshot(
        to.currencyCode,
        context.baseCurrencyCode,
        input.toFxRateNumerator,
        input.toFxRateDenominator,
      );
    }

    const built = this.buildPosting({
      status: "POSTED",
      occurredAt: input.occurredAt ?? this.now(),
      description: input.description ?? "Internal transfer",
      baseCurrencyCode: context.baseCurrencyCode,
      idempotencyKey: key,
      reversalOfId: null,
      transactionKind: "TRANSFER",
      categoryId: null,
      createdAt: this.now(),
      postedAt: this.now(),
      lines: [
        {
          accountId: from.id,
          side: "CREDIT",
          amountMinor: input.amountMinor,
          fxRateNumerator: fromFx.numerator,
          fxRateDenominator: fromFx.denominator,
        },
        {
          accountId: to.id,
          side: "DEBIT",
          amountMinor: toAmountMinor,
          fxRateNumerator: toFx.numerator,
          fxRateDenominator: toFx.denominator,
        },
      ],
      context,
    });

    return this.repository.commitPostedEntry(built);
  }

  /** Settles a positive residual balance from one archived ASSET into an active ASSET. */
  async settleArchivedAccount(input: { idempotencyKey: string; archivedAccountId: string; destinationAccountId: string; amountMinor: bigint; reason: string; occurredAt?: string; fxRateNumerator?: string; fxRateDenominator?: string }): Promise<PostingResult> {
    const key = this.requireIdempotencyKey(input.idempotencyKey);
    const existing = await this.findPostedByIdempotencyKey(key);
    if (existing) return existing;
    const reason = input.reason.trim();
    if (reason.length < 8) throw new Error("Archived-account settlement requires an audit reason of at least 8 characters");
    if (input.amountMinor <= 0n) throw new Error("Settlement amount must be positive");
    const context = await this.loadContext([input.archivedAccountId]);
    const source = this.requireAccount(context, input.archivedAccountId);
    const destination = this.requireAccount(context, input.destinationAccountId);
    if (source.type !== "ASSET" || !source.isArchived) throw new Error("Settlement source must be an archived ASSET account");
    if (destination.type !== "ASSET" || destination.isArchived) throw new Error("Settlement destination must be an active ASSET account");
    if (source.id === destination.id || source.currencyCode !== destination.currencyCode) throw new Error("Settlement requires two different ASSET accounts with the same currency");
    const balance = await this.getAccountBalance(source.id);
    if (balance.minorUnits <= 0n || input.amountMinor > balance.minorUnits) throw new Error("Settlement amount exceeds the positive archived account balance");
    const fx = resolveFxSnapshot(source.currencyCode, context.baseCurrencyCode, input.fxRateNumerator, input.fxRateDenominator);
    const built = this.buildPosting({
      status: "POSTED",
      occurredAt: input.occurredAt ?? this.now(),
      description: "Archived account settlement",
      baseCurrencyCode: context.baseCurrencyCode,
      idempotencyKey: key,
      reversalOfId: null,
      transactionKind: "ADJUSTMENT",
      categoryId: null,
      postingPurpose: "ARCHIVED_ACCOUNT_SETTLEMENT",
      auditReason: reason,
      createdAt: this.now(),
      postedAt: this.now(),
      lines: [
        { accountId: source.id, side: "CREDIT", amountMinor: input.amountMinor, fxRateNumerator: fx.numerator, fxRateDenominator: fx.denominator },
        { accountId: destination.id, side: "DEBIT", amountMinor: input.amountMinor, fxRateNumerator: fx.numerator, fxRateDenominator: fx.denominator },
      ],
      context,
    });
    return this.repository.commitPostedEntry(built);
  }
  /**
   * Creates a new linked reversal entry that swaps every line side while
   * preserving its account, native amount, FX snapshot and base amount.
   * An original entry can be reversed only once.
   */
  async reverseEntry(input: ReverseEntryInput): Promise<PostingResult> {
    const key = this.requireIdempotencyKey(input.idempotencyKey);
    const existing = await this.findPostedByIdempotencyKey(key);
    if (existing) return existing;

    const original = await this.repository.findJournalEntryById(
      input.originalEntryId,
    );
    if (!original) {
      throw new Error(
        `Original journal entry does not exist: ${input.originalEntryId}`,
      );
    }
    if (original.status !== "POSTED") {
      throw new Error("Only a POSTED journal entry can be reversed");
    }

    const alreadyReversed = await this.repository.findReversalOfEntry(
      original.id,
    );
    if (alreadyReversed) {
      throw new Error(
        `Journal entry has already been reversed: ${original.id}`,
      );
    }

    const originalLines = await this.repository.listJournalLines(original.id);
    const initialContext = await this.loadContext();
    const archivedAccountIds = [...new Set(originalLines.filter((line) => initialContext.accounts.get(line.accountId)?.isArchived).map((line) => line.accountId))];
    const reason = input.reason?.trim() ?? "";
    if (archivedAccountIds.length > 0 && reason.length < 8) throw new Error("Reversing an entry that touches an archived account requires an audit reason of at least 8 characters");
    const context = archivedAccountIds.length > 0 ? await this.loadContext(archivedAccountIds) : initialContext;
    validateJournalEntry(original, originalLines, context);

    const built = this.buildPosting({
      status: "POSTED",
      occurredAt: input.occurredAt ?? this.now(),
      description: input.description ?? `Reversal of ${original.id}`,
      // Preserve the original entry's base-currency snapshot.
      baseCurrencyCode: original.baseCurrencyCode,
      idempotencyKey: key,
      reversalOfId: original.id,
      transactionKind: "REVERSAL",
      categoryId: original.categoryId ?? null,
      postingPurpose: archivedAccountIds.length > 0 ? "ARCHIVED_ACCOUNT_REVERSAL" : "STANDARD",
      auditReason: archivedAccountIds.length > 0 ? reason : null,
      createdAt: this.now(),
      postedAt: this.now(),
      lines: originalLines
        .slice()
        .sort((left, right) => left.lineNumber - right.lineNumber)
        .map((line) => ({
          accountId: line.accountId,
          side: line.side === "DEBIT" ? "CREDIT" : "DEBIT",
          amountMinor: line.amountMinor,
          fxRateNumerator: line.fxRateNumerator,
          fxRateDenominator: line.fxRateDenominator,
          memo: line.memo,
        })),
      context,
    });

    return this.repository.commitPostedEntry(built);
  }

  /** Returns a native-currency balance derived only from posted lines. */
  async getAccountBalance(accountId: string) {
    const account = await this.repository.findAccountById(accountId);
    if (!account) {
      throw new Error(`Account does not exist: ${accountId}`);
    }
    const currencyRecord = (await this.repository.listCurrencies(false)).find(
      (record) => record.code === account.currencyCode,
    );
    if (!currencyRecord) {
      throw new Error(
        `Account currency does not exist: ${account.currencyCode}`,
      );
    }

    const lines = await this.repository.listPostedJournalLinesForAccount(
      account.id,
    );
    return calculateAccountBalance(
      account,
      lines,
      new Currency(currencyRecord.code, currencyRecord.minorUnit),
    );
  }

  private buildPosting(params: {
    status: JournalStatus;
    occurredAt: string;
    description: string | null;
    baseCurrencyCode: string;
    idempotencyKey: string | null;
    reversalOfId: string | null;
    transactionKind?: import("../../domain/ledger/repository").TransactionKind;
    categoryId?: string | null;
    postingPurpose?: import("../../domain/ledger/repository").PostingPurpose;
    auditReason?: string | null;
    createdAt: string;
    postedAt: string | null;
    lines: readonly PostingLineSpec[];
    context: LoadedContext;
  }): BuiltJournalPosting {
    return buildJournalPosting(
      {
        id: this.createId(),
        occurredAt: params.occurredAt,
        description: params.description,
        status: params.status,
        baseCurrencyCode: params.baseCurrencyCode,
        idempotencyKey: params.idempotencyKey,
        reversalOfId: params.reversalOfId,
        transactionKind: params.transactionKind,
        categoryId: params.categoryId,
        postingPurpose: params.postingPurpose,
        auditReason: params.auditReason,
        createdAt: params.createdAt,
        postedAt: params.postedAt,
        lines: params.lines,
        lineIds: params.lines.map(() => this.createId()),
      },
      params.context,
    );
  }

  private async loadContext(allowedArchivedAccountIds: readonly string[] = []): Promise<LoadedContext> {
    const [baseCurrencyCode, accounts, currencies] = await Promise.all([
      this.repository.getBaseCurrencyCode(),
      this.repository.listAccounts(true),
      this.repository.listCurrencies(false),
    ]);
    if (!baseCurrencyCode) {
      throw new Error("Ledger base currency is not configured");
    }

    return {
      baseCurrencyCode,
      accounts: new Map(accounts.map((account) => [account.id, account])),
      currencies: new Map(
        currencies.map((currency) => [currency.code, currency]),
      ),
      allowedArchivedAccountIds: new Set(allowedArchivedAccountIds),
    };
  }

  private requireAccount(context: LoadedContext, accountId: string): Account {
    const account = context.accounts.get(accountId);
    if (!account) {
      throw new Error(`Account does not exist: ${accountId}`);
    }
    return account;
  }

  private requireIdempotencyKey(key: string): string {
    const normalized = key.trim();
    if (!normalized) {
      throw new Error("An idempotency key is required");
    }
    return normalized;
  }

  private async findPostedByIdempotencyKey(
    key: string,
  ): Promise<PostingResult | null> {
    const entry = await this.repository.findJournalEntryByIdempotencyKey(key);
    if (!entry) return null;
    if (entry.status !== "POSTED") {
      throw new Error(
        "Idempotency key is already used by a non-posted journal entry",
      );
    }
    return {
      entry,
      lines: await this.repository.listJournalLines(entry.id),
      created: false,
    };
  }
}
