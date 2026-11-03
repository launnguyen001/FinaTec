import type { AssetLot, AssetValuationModel, DcaAggregate } from "./asset";
import type { PostingCommitInput } from "../ledger/repository";

export interface AssetTypeRecord {
  id: string;
  valuationModel: AssetValuationModel;
  quantityPrecision: number;
  pricePrecision: number;
  quoteCurrency: string;
  isArchived: boolean;
}

export interface AssetRecord {
  id: string;
  assetTypeId: string;
  quoteCurrency: string;
  isArchived: boolean;
}

export interface AssetLotRecord extends AssetLot {
  mergedIntoId: string | null;
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
}
