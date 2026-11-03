import {
  calculatePurchase,
  calculateSale,
  multiplyDecimalToMinor,
  assertTransactionFee,
} from "../../domain/asset/asset";
import type { AssetRepository } from "../../domain/asset/repository";
import type { Account, LedgerRepository } from "../../domain/ledger/repository";
import {
  buildJournalPosting,
  resolveFxSnapshot,
  type PostingLineSpec,
} from "../../domain/ledger/posting-plan";
import type { PostingContext } from "../../domain/ledger/posting";
import type { CategoryRepository } from "../../domain/category/repository";
import { toSqliteSafeInteger } from "../../domain/ledger/money";

export interface AssetTransactionServiceOptions {
  now: () => string;
}

export interface BuyAssetInput {
  assetId: string;
  quantity: string;
  executionPrice: string;
  currencyCode: string;
  cashAccountId: string;
  investmentAccountId: string;
  feeMinor?: bigint;
  feeAccountId?: string | null;
  feeCategoryId?: string | null;
  priceQuoteId?: string | null;
  idempotencyKey: string;
  occurredAt?: string;
  fxRateNumerator?: string;
  fxRateDenominator?: string;
}

export interface SellAssetInput {
  assetId: string;
  lotId: string;
  quantity: string;
  executionPrice: string;
  currencyCode: string;
  cashAccountId: string;
  investmentAccountId: string;
  feeMinor?: bigint;
  feeAccountId?: string | null;
  feeCategoryId?: string | null;
  realizedGainAccountId?: string | null;
  realizedLossAccountId?: string | null;
  priceQuoteId?: string | null;
  idempotencyKey: string;
  occurredAt?: string;
  fxRateNumerator?: string;
  fxRateDenominator?: string;
}

/**
 * Coordinates user-confirmed asset transactions. The final write is delegated
 * to AssetRepository so the lot and its posted Ledger entry commit atomically.
 */
export class AssetTransactionService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly ledger: LedgerRepository,
    private readonly categories: CategoryRepository,
    private readonly options: AssetTransactionServiceOptions,
  ) {}

  async buy(
    input: BuyAssetInput,
  ): Promise<{ created: boolean; lotId: string }> {
    const key = this.requireKey(input.idempotencyKey);
    const facts = await this.requireMarketAsset(
      input.assetId,
      input.currencyCode,
    );
    const context = await this.loadPostingContext();
    const cash = this.requireAccount(context, input.cashAccountId);
    const investment = this.requireAccount(context, input.investmentAccountId);
    this.assertAssetAccount(cash, input.currencyCode, "Funding");
    this.assertInvestmentAccount(investment, input.currencyCode);

    const feeMinor = input.feeMinor ?? 0n;
    const feeCategoryId = input.feeCategoryId ?? null;
    assertTransactionFee(feeMinor, feeCategoryId);
    let feeAccount: Account | null = null;
    if (feeMinor > 0n) {
      if (!input.feeAccountId)
        throw new Error(
          "A fee EXPENSE account is required when the fee is positive",
        );
      feeAccount = this.requireAccount(context, input.feeAccountId);
      this.assertExpenseAccount(feeAccount, input.currencyCode);
      this.requireExpenseCategory(context, feeCategoryId);
    }

    const currency = context.currencies.get(input.currencyCode);
    if (!currency?.isActive)
      throw new Error("Asset transaction currency is missing or inactive");
    const calculation = calculatePurchase({
      quantity: input.quantity,
      unitPrice: input.executionPrice,
      quantityPrecision: facts.assetType.quantityPrecision,
      pricePrecision: facts.assetType.pricePrecision,
      currencyMinorUnit: currency.minorUnit,
      feeMinor,
      feeCategoryId,
    });
    const fx = resolveFxSnapshot(
      input.currencyCode,
      context.baseCurrencyCode,
      input.fxRateNumerator,
      input.fxRateDenominator,
    );

    const lineSpecs: PostingLineSpec[] = [
      {
        accountId: investment.id,
        side: "DEBIT",
        amountMinor: calculation.grossPurchaseMinor,
        fxRateNumerator: fx.numerator,
        fxRateDenominator: fx.denominator,
        memo: "Asset purchase",
      },
    ];
    if (feeMinor > 0n && feeAccount) {
      lineSpecs.push({
        accountId: feeAccount.id,
        side: "DEBIT",
        amountMinor: feeMinor,
        fxRateNumerator: fx.numerator,
        fxRateDenominator: fx.denominator,
        memo: "Asset transaction fee",
      });
    }
    lineSpecs.push({
      accountId: cash.id,
      side: "CREDIT",
      amountMinor: calculation.totalCashOutflowMinor,
      fxRateNumerator: fx.numerator,
      fxRateDenominator: fx.denominator,
      memo: "Asset purchase funding",
    });

    const occurredAt = input.occurredAt ?? this.options.now();
    const createdAt = this.options.now();
    const posting = buildJournalPosting(
      {
        id: entryId,
        occurredAt,
        description: "Asset purchase",
        status: "POSTED",
        baseCurrencyCode: context.baseCurrencyCode,
        idempotencyKey: entryId,
        reversalOfId: null,
        replacementOfId: null,
        transactionKind: "ADJUSTMENT",
        categoryId: null,
        createdAt,
        postedAt: createdAt,
        lines: lineSpecs,
        lineIds: lineSpecs.map((_, index) => entryId + ":line:" + (index + 1)),
      },
      context.postingContext,
    );

    const lotId = entryId + ":lot";
    const transactionId = entryId + ":transaction";
    const result = await this.assets.commitPurchase({
      lot: {
        id: lotId,
        assetId: input.assetId,
        currencyCode: input.currencyCode,
        quantity: calculation.quantity,
        remainingQuantity: calculation.quantity,
        costBasisMinor: toSqliteSafeInteger(calculation.assetCostBasisMinor),
        remainingCostBasisMinor: toSqliteSafeInteger(
          calculation.assetCostBasisMinor,
        ),
        acquiredAt: occurredAt,
        status: "ACTIVE",
        mergedIntoId: null,
        createdAt,
      },
      transaction: {
        id: transactionId,
        assetId: input.assetId,
        transactionKind: "BUY",
        lotId,
        quantity: calculation.quantity,
        executionPrice: input.executionPrice,
        currencyCode: input.currencyCode,
        grossAmountMinor: calculation.grossPurchaseMinor,
        netCashAmountMinor: calculation.totalCashOutflowMinor,
        costBasisMinor: calculation.assetCostBasisMinor,
        feeAmountMinor: feeMinor,
        feeCategoryId,
        cashAccountId: cash.id,
        investmentAccountId: investment.id,
        journalEntryId: entryId,
        priceQuoteId: input.priceQuoteId ?? null,
        occurredAt,
        createdAt,
      },
      posting,
    });
    return { created: result.created, lotId };
  }

  async sell(
    input: SellAssetInput,
  ): Promise<{
    created: boolean;
    calculation: ReturnType<typeof calculateSale> | null;
  }> {
    const key = this.requireKey(input.idempotencyKey);
    const facts = await this.requireMarketAsset(
      input.assetId,
      input.currencyCode,
    );
    const selected = await this.assets.findLotForSale(input.lotId);
    if (!selected || selected.lot.assetId !== input.assetId) {
      throw new Error("Selected asset lot does not exist for this asset");
    }
    const context = await this.loadPostingContext();
    const cash = this.requireAccount(context, input.cashAccountId);
    const investment = this.requireAccount(context, input.investmentAccountId);
    this.assertAssetAccount(cash, input.currencyCode, "Receiving");
    this.assertInvestmentAccount(investment, input.currencyCode);

    const feeMinor = input.feeMinor ?? 0n;
    const feeCategoryId = input.feeCategoryId ?? null;
    assertTransactionFee(feeMinor, feeCategoryId);
    let feeAccount: Account | null = null;
    if (feeMinor > 0n) {
      if (!input.feeAccountId)
        throw new Error(
          "A fee EXPENSE account is required when the fee is positive",
        );
      feeAccount = this.requireAccount(context, input.feeAccountId);
      this.assertExpenseAccount(feeAccount, input.currencyCode);
      this.requireExpenseCategory(context, feeCategoryId);
    }

    const currency = context.currencies.get(input.currencyCode);
    if (!currency?.isActive)
      throw new Error("Asset transaction currency is missing or inactive");
    const grossProceedsMinor = multiplyDecimalToMinor({
      quantity: input.quantity,
      quantityPrecision: facts.assetType.quantityPrecision,
      unitPrice: input.executionPrice,
      pricePrecision: facts.assetType.pricePrecision,
      currencyMinorUnit: currency.minorUnit,
    });
    const calculation = calculateSale({
      lot: selected.lot,
      quantitySold: input.quantity,
      quantityPrecision: facts.assetType.quantityPrecision,
      grossProceedsMinor,
      feeMinor,
      isDcaComponent: selected.isDcaComponent,
    });
    if (calculation.netCashReceivedMinor <= 0n) {
      throw new Error(
        "Net cash received must be positive after transaction fees",
      );
    }

    const fx = resolveFxSnapshot(
      input.currencyCode,
      context.baseCurrencyCode,
      input.fxRateNumerator,
      input.fxRateDenominator,
    );
    const lineSpecs: PostingLineSpec[] = [
      {
        accountId: cash.id,
        side: "DEBIT",
        amountMinor: calculation.netCashReceivedMinor,
        fxRateNumerator: fx.numerator,
        fxRateDenominator: fx.denominator,
        memo: "Asset sale proceeds",
      },
    ];
    if (feeMinor > 0n && feeAccount) {
      lineSpecs.push({
        accountId: feeAccount.id,
        side: "DEBIT",
        amountMinor: feeMinor,
        fxRateNumerator: fx.numerator,
        fxRateDenominator: fx.denominator,
        memo: "Asset transaction fee",
      });
    }
    if (calculation.costBasisSoldMinor > 0n) {
      lineSpecs.push({
        accountId: investment.id,
        side: "CREDIT",
        amountMinor: calculation.costBasisSoldMinor,
        fxRateNumerator: fx.numerator,
        fxRateDenominator: fx.denominator,
        memo: "Asset cost basis disposed",
      });
    }
    if (calculation.realizedGainLossBeforeFeeMinor > 0n) {
      const gain = this.requireAccount(
        context,
        input.realizedGainAccountId ?? "",
      );
      if (gain.type !== "INCOME" || gain.currencyCode !== input.currencyCode) {
        throw new Error(
          "Realized gain must be posted to an INCOME account in the asset currency",
        );
      }
      lineSpecs.push({
        accountId: gain.id,
        side: "CREDIT",
        amountMinor: calculation.realizedGainLossBeforeFeeMinor,
        fxRateNumerator: fx.numerator,
        fxRateDenominator: fx.denominator,
        memo: "Realized asset gain",
      });
    } else if (calculation.realizedGainLossBeforeFeeMinor < 0n) {
      const loss = this.requireAccount(
        context,
        input.realizedLossAccountId ?? "",
      );
      if (loss.type !== "EXPENSE" || loss.currencyCode !== input.currencyCode) {
        throw new Error(
          "Realized loss must be posted to an EXPENSE account in the asset currency",
        );
      }
      lineSpecs.push({
        accountId: loss.id,
        side: "DEBIT",
        amountMinor: -calculation.realizedGainLossBeforeFeeMinor,
        fxRateNumerator: fx.numerator,
        fxRateDenominator: fx.denominator,
        memo: "Realized asset loss",
      });
    }

    const occurredAt = input.occurredAt ?? this.options.now();
    const createdAt = this.options.now();
    const posting = buildJournalPosting(
      {
        id: entryId,
        occurredAt,
        description: "Asset sale",
        status: "POSTED",
        baseCurrencyCode: context.baseCurrencyCode,
        idempotencyKey: entryId,
        reversalOfId: null,
        replacementOfId: null,
        transactionKind: "ADJUSTMENT",
        categoryId: null,
        createdAt,
        postedAt: createdAt,
        lines: lineSpecs,
        lineIds: lineSpecs.map((_, index) => entryId + ":line:" + (index + 1)),
      },
      context.postingContext,
    );

    const result = await this.assets.commitSale({
      transaction: {
        id: entryId + ":transaction",
        assetId: input.assetId,
        transactionKind: "SELL",
        lotId: input.lotId,
        quantity: calculation.quantitySold,
        executionPrice: input.executionPrice,
        currencyCode: input.currencyCode,
        grossAmountMinor: calculation.grossProceedsMinor,
        netCashAmountMinor: calculation.netCashReceivedMinor,
        costBasisMinor: calculation.costBasisSoldMinor,
        feeAmountMinor: feeMinor,
        feeCategoryId,
        cashAccountId: cash.id,
        investmentAccountId: investment.id,
        journalEntryId: entryId,
        priceQuoteId: input.priceQuoteId ?? null,
        occurredAt,
        createdAt,
      },
      posting,
      quantityPrecision: facts.assetType.quantityPrecision,
    });
    return result;
  }

  async mergeDca(
    componentLotIds: string[],
  ): Promise<{
    aggregateLotId: string;
    aggregate: Awaited<ReturnType<AssetRepository["mergeDca"]>>;
  }> {
    const aggregateLotId =
      "asset:dca:" + componentLotIds.slice().sort().join(":");
    const aggregate = await this.assets.mergeDca({
      aggregateLotId,
      componentLotIds,
      createdAt: this.options.now(),
    });
    return { aggregateLotId, aggregate };
  }

  private async requireMarketAsset(assetId: string, currencyCode: string) {
    const facts = await this.assets.findAssetForTransaction(assetId);
    if (!facts || facts.asset.isArchived || facts.assetType.isArchived) {
      throw new Error("Asset or asset type does not exist or is archived");
    }
    if (facts.assetType.valuationModel !== "MARKET_VALUED") {
      throw new Error(
        "Only MARKET_VALUED assets use the market cost-basis transaction flow",
      );
    }
    if (
      facts.asset.quoteCurrency !== currencyCode ||
      facts.assetType.quoteCurrency !== currencyCode
    ) {
      throw new Error(
        "Asset transaction currency must match the asset quote currency",
      );
    }
    return facts;
  }

  private async loadPostingContext() {
    const [baseCurrencyCode, accountRows, currencyRows, categoryRows] =
      await Promise.all([
        this.ledger.getBaseCurrencyCode(),
        this.ledger.listAccounts(true),
        this.ledger.listCurrencies(false),
        this.categories.list(true),
      ]);
    if (!baseCurrencyCode)
      throw new Error("Ledger base currency is not configured");
    const accounts = new Map(
      accountRows.map((account) => [account.id, account]),
    );
    const currencies = new Map(
      currencyRows.map((currency) => [currency.code, currency]),
    );
    const categories = new Map(
      categoryRows.map((category) => [category.id, category]),
    );
    const postingContext: PostingContext = {
      accounts,
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
      categories: new Map(
        categoryRows.map((category) => [
          category.id,
          {
            id: category.id,
            kind: category.kind,
            isArchived: category.isArchived,
          },
        ]),
      ),
    };
    return {
      baseCurrencyCode,
      accounts,
      currencies,
      categories,
      postingContext,
    };
  }

  private requireAccount(
    context: Awaited<ReturnType<AssetTransactionService["loadPostingContext"]>>,
    id: string,
  ): Account {
    const account = context.accounts.get(id);
    if (!account) throw new Error("Account does not exist: " + id);
    return account;
  }

  private assertAssetAccount(
    account: Account,
    currencyCode: string,
    label: string,
  ): void {
    if (account.type !== "ASSET" || account.currencyCode !== currencyCode) {
      throw new Error(
        label + " account must be an ASSET account in the transaction currency",
      );
    }
  }

  private assertInvestmentAccount(
    account: Account,
    currencyCode: string,
  ): void {
    if (
      account.type !== "ASSET" ||
      !account.isInvestment ||
      account.currencyCode !== currencyCode
    ) {
      throw new Error(
        "Investment account must be a designated INVESTMENT ASSET account in the transaction currency",
      );
    }
  }

  private assertExpenseAccount(account: Account, currencyCode: string): void {
    if (account.type !== "EXPENSE" || account.currencyCode !== currencyCode) {
      throw new Error(
        "Fee account must be an EXPENSE account in the transaction currency",
      );
    }
  }

  private requireExpenseCategory(
    context: Awaited<ReturnType<AssetTransactionService["loadPostingContext"]>>,
    categoryId: string | null,
  ): void {
    const category = categoryId ? context.categories.get(categoryId) : null;
    if (!category || category.kind !== "EXPENSE" || category.isArchived) {
      throw new Error(
        "A non-archived EXPENSE category is required for transaction fees",
      );
    }
  }

  private requireKey(value: string): string {
    const key = value.trim();
    if (!key) throw new Error("An idempotency key is required");
    return key;
  }
}
