import type {
  AssetLot,
  AssetValuationModel,
  DcaAggregate,
  DailyValuation,
  MarketQuote,
} from "./asset";
import type { PostingCommitInput } from "../ledger/repository";

export interface AssetTypeRecord {
  id: string;
  name: string;
  assetClass: "CRYPTO" | "METAL" | "STOCK" | "OTHER";
  valuationModel: AssetValuationModel;
  unitCode: string;
  quantityPrecision: number;
  pricePrecision: number;
  quoteCurrency: string;
  isArchived: boolean;
}

export interface AssetRecord {
  id: string;
  assetTypeId: string;
  name: string;
  symbol: string;
  providerSymbol: string | null;
  quoteCurrency: string;
  isArchived: boolean;
}

export interface AssetLotRecord extends AssetLot {
  mergedIntoId: string | null;
}

export interface AssetRefreshStateRecord {
  providerKey: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  failureCount: number;
  nextAttemptAt: string | null;
  lastError: string | null;
}

export interface AssetRealizedPnlRecord {
  assetId: string;
  currencyCode: string;
  transactionCount: number;
  grossProceedsMinor: bigint;
  costBasisSoldMinor: bigint;
  saleFeeMinor: bigint;
  purchaseFeeMinor: bigint;
  realizedPnlBeforeFeeMinor: bigint;
  realizedPnlAfterSaleFeeMinor: bigint;
}

export interface AssetSettingsRecord {
  timezoneMode: "DEVICE" | "CUSTOM";
  timezoneId: string;
  cryptoRefreshMinutes: number;
  metalRefreshMinutes: number;
  fiatRefreshMinutes: number;
  primaryCryptoProvider: "COINPAPRIKA" | "COINGECKO";
  fallbackCryptoProvider: "COINPAPRIKA" | "COINGECKO";
  updatedAt: string;
}

export interface AssetTransactionWrite {
  id: string;
  assetId: string;
  transactionKind: "BUY" | "SELL";
  lotId: string;
  quantity: string;
  executionPrice: string;
  currencyCode: string;
  grossAmountMinor: bigint;
  netCashAmountMinor: bigint;
  costBasisMinor: bigint;
  feeAmountMinor: bigint;
  feeCategoryId: string | null;
  cashAccountId: string;
  investmentAccountId: string;
  journalEntryId: string;
  priceQuoteId: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface AssetLotWrite {
  id: string;
  assetId: string;
  currencyCode: string;
  quantity: string;
  remainingQuantity: string;
  costBasisMinor: number;
  remainingCostBasisMinor: number;
  acquiredAt: string;
  status: "ACTIVE";
  mergedIntoId: null;
  createdAt: string;
}

export interface AssetRepository {
  createAssetType(input: {
    id: string;
    name: string;
    assetClass: "CRYPTO" | "METAL" | "STOCK" | "OTHER";
    valuationModel: AssetValuationModel;
    unitCode: string;
    quantityPrecision: number;
    pricePrecision: number;
    quoteCurrency: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<AssetTypeRecord>;
  createAsset(input: {
    id: string;
    assetTypeId: string;
    name: string;
    symbol: string;
    providerSymbol: string | null;
    quoteCurrency: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<AssetRecord>;
  listAssetTypes(includeArchived?: boolean): Promise<AssetTypeRecord[]>;
  listAssets(includeArchived?: boolean): Promise<AssetRecord[]>;
  archiveAsset(assetId: string, archivedAt: string): Promise<void>;
  archiveAssetType(assetTypeId: string, archivedAt: string): Promise<void>;
  getSettings(): Promise<AssetSettingsRecord>;
  updateSettings(settings: AssetSettingsRecord): Promise<AssetSettingsRecord>;
  getLatestQuote(assetId: string): Promise<MarketQuote | null>;
  getRefreshState(providerKey: string): Promise<AssetRefreshStateRecord>;
  claimRefreshAttempt(
    providerKey: string,
    attemptedAt: string,
    minimumGapMs: number,
  ): Promise<boolean>;
  saveRefreshState(state: AssetRefreshStateRecord): Promise<void>;
  findAssetForTransaction(
    assetId: string,
  ): Promise<{ asset: AssetRecord; assetType: AssetTypeRecord } | null>;
  findLotForSale(
    lotId: string,
  ): Promise<{ lot: AssetLotRecord; isDcaComponent: boolean } | null>;
  findAssetTransactionByJournalEntryId(
    journalEntryId: string,
  ): Promise<{ transactionKind: "BUY" | "SELL"; lotId: string } | null>;
  commitPurchase(input: {
    lot: AssetLotWrite;
    transaction: AssetTransactionWrite;
    posting: PostingCommitInput;
  }): Promise<{ created: boolean }>;
  commitSale(input: {
    transaction: AssetTransactionWrite;
    posting: PostingCommitInput;
    quantityPrecision: number;
  }): Promise<{
    created: boolean;
    calculation: import("./asset").SaleCalculation | null;
  }>;
  mergeDca(input: {
    aggregateLotId: string;
    componentLotIds: string[];
    createdAt: string;
  }): Promise<DcaAggregate>;
  getCurrentQuantity(assetId: string): Promise<string>;
  listLots(assetId: string): Promise<AssetLotRecord[]>;
  listDailyValuations(assetId: string): Promise<DailyValuation[]>;
  getRealizedPnl(assetId: string): Promise<AssetRealizedPnlRecord>;
  recordQuoteAndSnapshot(input: {
    quoteId: string;
    snapshotId: string;
    quote: MarketQuote;
    quantity: string;
    valuationDate: string;
    snapshotCapturedAt: string;
    quantityPrecision: number;
    pricePrecision: number;
    currencyMinorUnit: number;
  }): Promise<DailyValuation | null>;
}
