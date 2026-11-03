import { resolveFxSnapshot } from "../../domain/ledger/posting-plan";
import type {
  Account,
  LedgerRepository,
  PostingResult,
} from "../../domain/ledger/repository";
import type { CategoryRepository } from "../../domain/category/repository";
import type {
  AccountingService,
  OpeningBalanceInput,
  ReverseEntryInput,
  TransferFundsInput,
} from "../ledger/accounting-service";

export interface FinanceTransactionOptions {
  now: () => string;
}

export class FinanceTransactionService {
  constructor(
    private readonly accounting: AccountingService,
    private readonly ledger: LedgerRepository,
    private readonly categories: CategoryRepository,
    private readonly options: FinanceTransactionOptions,
  ) {}

  async recordIncome(input: {
    idempotencyKey: string;
    assetAccountId: string;
    incomeAccountId: string;
    categoryId: string;
    amountMinor: bigint;
    occurredAt?: string;
    description?: string;
    fxRateNumerator?: string;
    fxRateDenominator?: string;
  }): Promise<PostingResult> {
    const {
      asset,
      category,
      counterpart: income,
    } = await this.validateCommon(
      input.assetAccountId,
      input.incomeAccountId,
      input.categoryId,
      "INCOME",
      input.amountMinor,
    );
    const baseCurrencyCode = await this.requireBaseCurrency();
    const fx = resolveFxSnapshot(
      asset.currencyCode,
      baseCurrencyCode,
      input.fxRateNumerator,
      input.fxRateDenominator,
    );
    return this.accounting.postEntry({
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt ?? this.options.now(),
      description: input.description ?? "Income",
      transactionKind: "INCOME",
      categoryId: category.id,
      lines: [
        {
          accountId: asset.id,
          side: "DEBIT",
          amountMinor: input.amountMinor,
          fxRateNumerator: fx.numerator,
          fxRateDenominator: fx.denominator,
        },
        {
          accountId: income.id,
          side: "CREDIT",
          amountMinor: input.amountMinor,
          fxRateNumerator: fx.numerator,
          fxRateDenominator: fx.denominator,
        },
      ],
    });
  }

  async recordExpense(input: {
    idempotencyKey: string;
    assetAccountId: string;
    expenseAccountId: string;
    categoryId: string;
    amountMinor: bigint;
    occurredAt?: string;
    description?: string;
    fxRateNumerator?: string;
    fxRateDenominator?: string;
  }): Promise<PostingResult> {
    const {
      asset,
      category,
      counterpart: expense,
    } = await this.validateCommon(
      input.assetAccountId,
      input.expenseAccountId,
      input.categoryId,
      "EXPENSE",
      input.amountMinor,
    );
    const baseCurrencyCode = await this.requireBaseCurrency();
    const fx = resolveFxSnapshot(
      asset.currencyCode,
      baseCurrencyCode,
      input.fxRateNumerator,
      input.fxRateDenominator,
    );
    return this.accounting.postEntry({
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.occurredAt ?? this.options.now(),
      description: input.description ?? "Expense",
      transactionKind: "EXPENSE",
      categoryId: category.id,
      lines: [
        {
          accountId: asset.id,
          side: "CREDIT",
          amountMinor: input.amountMinor,
          fxRateNumerator: fx.numerator,
          fxRateDenominator: fx.denominator,
        },
        {
          accountId: expense.id,
          side: "DEBIT",
          amountMinor: input.amountMinor,
          fxRateNumerator: fx.numerator,
          fxRateDenominator: fx.denominator,
        },
      ],
    });
  }

  transferFunds(input: TransferFundsInput): Promise<PostingResult> {
    return this.accounting.transferFunds(input);
  }

  createOpeningBalance(input: OpeningBalanceInput): Promise<PostingResult> {
    return this.accounting.createOpeningBalance(input);
  }

  reversePostedEntry(input: ReverseEntryInput): Promise<PostingResult> {
    return this.accounting.reverseEntry(input);
  }

  private async validateCommon(
    assetId: string,
    counterpartId: string,
    categoryId: string,
    kind: "INCOME" | "EXPENSE",
    amountMinor: bigint,
  ): Promise<{
    asset: Account;
    category: NonNullable<Awaited<ReturnType<CategoryRepository["findById"]>>>;
    counterpart: Account;
  }> {
    if (amountMinor <= 0n)
      throw new Error("Transaction amount must be positive");
    const [asset, counterpart, category] = await Promise.all([
      this.ledger.findAccountById(assetId),
      this.ledger.findAccountById(counterpartId),
      this.categories.findById(categoryId),
    ]);
    if (!asset || !counterpart)
      throw new Error("Transaction account does not exist");
    if (asset.type !== "ASSET")
      throw new Error("Transaction money account must be ASSET");
    if (counterpart.type !== kind)
      throw new Error(`The counterpart account must be ${kind}`);
    if (asset.isArchived || counterpart.isArchived)
      throw new Error(
        "Archived accounts cannot be used for ordinary transactions",
      );
    if (asset.currencyCode !== counterpart.currencyCode)
      throw new Error(
        "Income/expense accounts must use the same currency as the money account",
      );
    if (!category || category.isArchived || category.kind !== kind)
      throw new Error(`An active ${kind} category is required`);
    return { asset, category, counterpart };
  }

  private async requireBaseCurrency(): Promise<string> {
    const code = await this.ledger.getBaseCurrencyCode();
    if (!code) throw new Error("Ledger base currency is not configured");
    return code;
  }
}
