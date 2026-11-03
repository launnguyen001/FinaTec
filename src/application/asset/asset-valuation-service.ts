import {
  calculateUnrealizedPnl,
  decimalToMinorUnits,
  getValuationDate,
  type DailyValuation,
  type MarketQuote,
} from "../../domain/asset/asset";
import type { AssetRepository } from "../../domain/asset/repository";
import type { LedgerRepository } from "../../domain/ledger/repository";

export interface AssetValuationServiceOptions {
  now: () => string;
  createId: () => string;
}

export class AssetValuationService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly ledger: LedgerRepository,
    private readonly options: AssetValuationServiceOptions,
  ) {}

  async getRealizedPnl(assetId: string) {
    return this.assets.getRealizedPnl(assetId);
  }

  async getHistory(assetId: string): Promise<DailyValuation[]> {
    const facts = await this.assets.findAssetForTransaction(assetId);
    if (!facts) throw new Error("Asset does not exist");
    if (facts.assetType.valuationModel !== "MARKET_VALUED") {
      return [];
    }
    return this.assets.listDailyValuations(assetId);
  }

  async getUnrealizedPnl(assetId: string) {
    const facts = await this.assets.findAssetForTransaction(assetId);
    if (!facts || facts.asset.isArchived || facts.assetType.isArchived) {
      throw new Error("Asset does not exist or is archived");
    }
    if (facts.assetType.valuationModel !== "MARKET_VALUED") {
      throw new Error("Unrealized P&L applies only to market-valued assets");
    }
    const [lots, history, currencies] = await Promise.all([
      this.assets.listLots(assetId),
      this.assets.listDailyValuations(assetId),
      this.ledger.listCurrencies(false),
    ]);
    const currency = currencies.find(
      (item) => item.code === facts.asset.quoteCurrency,
    );
    if (!currency) throw new Error("Asset quote currency is unavailable");
    const remainingCostBasisMinor = lots.reduce(
      (total, lot) => total + lot.remainingCostBasisMinor,
      0n,
    );
    const latest = history[history.length - 1] ?? null;
    if (!latest) {
      return {
        assetId,
        currencyCode: facts.asset.quoteCurrency,
        quantity: await this.assets.getCurrentQuantity(assetId),
        remainingCostBasisMinor,
        valuation: null,
        calculation: null,
      };
    }
    const currentValueMinor = decimalToMinorUnits(
      latest.totalValue,
      currency.minorUnit,
    );
    return {
      assetId,
      currencyCode: facts.asset.quoteCurrency,
      quantity: latest.quantity,
      remainingCostBasisMinor,
      valuation: latest,
      calculation: calculateUnrealizedPnl({
        currentValueMinor,
        remainingCostBasisMinor,
      }),
    };
  }

  async recordQuote(
    quote: MarketQuote,
    timeZone: string,
  ): Promise<DailyValuation | null> {
    const facts = await this.assets.findAssetForTransaction(quote.assetId);
    if (!facts || facts.asset.isArchived || facts.assetType.isArchived) {
      throw new Error("Asset or asset type does not exist or is archived");
    }
    if (facts.assetType.valuationModel !== "MARKET_VALUED") {
      throw new Error("Stable-value assets do not accept market quotes");
    }
    if (
      quote.currencyCode !== facts.asset.quoteCurrency ||
      quote.currencyCode !== facts.assetType.quoteCurrency
    ) {
      throw new Error(
        "Market quote currency does not match the asset configuration",
      );
    }

    const [quantity, currencies] = await Promise.all([
      this.assets.getCurrentQuantity(quote.assetId),
      this.ledger.listCurrencies(false),
    ]);
    const currency = currencies.find(
      (item) => item.code === quote.currencyCode,
    );
    if (!currency?.isActive) {
      throw new Error("Quote currency is missing or inactive");
    }

    const snapshotCapturedAt = this.options.now();
    return this.assets.recordQuoteAndSnapshot({
      quoteId: this.options.createId(),
      snapshotId: this.options.createId(),
      quote,
      quantity,
      valuationDate: getValuationDate(snapshotCapturedAt, timeZone),
      snapshotCapturedAt,
      quantityPrecision: facts.assetType.quantityPrecision,
      pricePrecision: facts.assetType.pricePrecision,
      currencyMinorUnit: currency.minorUnit,
    });
  }

  async recordManualPrice(input: {
    assetId: string;
    price: string;
    timeZone: string;
  }): Promise<DailyValuation | null> {
    const facts = await this.assets.findAssetForTransaction(input.assetId);
    if (!facts || facts.asset.isArchived || facts.assetType.isArchived) {
      throw new Error("Asset or asset type does not exist or is archived");
    }
    const now = this.options.now();
    return this.recordQuote(
      {
        assetId: input.assetId,
        price: input.price,
        currencyCode: facts.asset.quoteCurrency,
        source: "MANUAL",
        status: "FRESH",
        observedAt: now,
        capturedAt: now,
      },
      input.timeZone,
    );
  }
}
