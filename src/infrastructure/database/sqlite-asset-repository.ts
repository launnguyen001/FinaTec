import { and, asc, desc, eq, isNull } from "drizzle-orm";

import {
  aggregateDcaLots,
  calculateSale,
  multiplyDecimalToMinor,
  normalizeDecimal,
  sumDecimalQuantities,
  type AssetLot,
  type DcaAggregate,
  type DailyValuation,
  type MarketQuote,
} from "../../domain/asset/asset";
import type {
  AssetRefreshStateRecord,
  AssetRepository,
  AssetSettingsRecord,
} from "../../domain/asset/repository";
import { toSqliteSafeInteger } from "../../domain/ledger/money";
import {
  validateJournalEntry,
  type PostingContext,
} from "../../domain/ledger/posting";
import type { PostingCommitInput } from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import {
  accounts,
  assetDcaComponents,
  assetDailyValuations,
  assetSettings,
  assetLots,
  assetPriceQuotes,
  assetRefreshStates,
  assetTransactions,
  assets,
  assetTypes,
  categories,
  currencies,
  journalEntries,
  journalLines,
} from "./schema";

type AssetTransactionWrite = {
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
};

function formatMinorAmount(amount: bigint, precision: number): string {
  const scale = 10n ** BigInt(precision);
  const whole = amount / scale;
  if (precision === 0) return whole.toString();
  const fraction = (amount % scale).toString().padStart(precision, "0");
  return whole.toString() + "." + fraction;
}

type LedgerTransaction = Parameters<
  Parameters<LedgerDatabase["transaction"]>[0]
>[0];

/**
 * Asset writes that affect Ledger are deliberately implemented in this
 * repository. A purchase/sale is not split across AccountingService and an
 * asset repository because those two independent commits cannot be atomic.
 */
export class SqliteAssetRepository implements AssetRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async createAssetType(input: {
    id: string;
    name: string;
    assetClass: "CRYPTO" | "METAL" | "STOCK" | "OTHER";
    valuationModel: "STABLE_VALUE" | "MARKET_VALUED";
    unitCode: string;
    quantityPrecision: number;
    pricePrecision: number;
    quoteCurrency: string;
    createdAt: string;
    updatedAt: string;
  }) {
    const currency = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.code, input.quoteCurrency))
      .get();
    if (!currency?.isActive)
      throw new Error("Asset quote currency is missing or inactive");
    if (!input.name.trim() || !input.unitCode.trim()) {
      throw new Error("Asset type name and unit code are required");
    }
    if (
      !Number.isInteger(input.quantityPrecision) ||
      input.quantityPrecision < 0 ||
      input.quantityPrecision > 12 ||
      !Number.isInteger(input.pricePrecision) ||
      input.pricePrecision < 0 ||
      input.pricePrecision > 12
    ) {
      throw new Error("Asset precision must be an integer between 0 and 12");
    }
    await this.db
      .insert(assetTypes)
      .values({
        ...input,
        name: input.name.trim(),
        unitCode: input.unitCode.trim().toUpperCase(),
      })
      .run();
    return {
      ...input,
      name: input.name.trim(),
      unitCode: input.unitCode.trim().toUpperCase(),
      isArchived: false,
    };
  }

  async createAsset(input: {
    id: string;
    assetTypeId: string;
    name: string;
    symbol: string;
    providerSymbol: string | null;
    quoteCurrency: string;
    createdAt: string;
    updatedAt: string;
  }) {
    const assetType = await this.db
      .select()
      .from(assetTypes)
      .where(eq(assetTypes.id, input.assetTypeId))
      .get();
    if (!assetType || assetType.isArchived)
      throw new Error("Asset type does not exist or is archived");
    if (assetType.quoteCurrency !== input.quoteCurrency) {
      throw new Error("Asset quote currency must match its asset type");
    }
    if (!input.name.trim() || !input.symbol.trim()) {
      throw new Error("Asset name and symbol are required");
    }
    await this.db
      .insert(assets)
      .values({
        ...input,
        name: input.name.trim(),
        symbol: input.symbol.trim().toUpperCase(),
        providerSymbol: input.providerSymbol?.trim() || null,
      })
      .run();
    return {
      id: input.id,
      assetTypeId: input.assetTypeId,
      name: input.name.trim(),
      symbol: input.symbol.trim().toUpperCase(),
      providerSymbol: input.providerSymbol?.trim() || null,
      quoteCurrency: input.quoteCurrency,
      isArchived: false,
    };
  }

  async listAssetTypes(includeArchived = false) {
    const rows = includeArchived
      ? await this.db.select().from(assetTypes).all()
      : await this.db
          .select()
          .from(assetTypes)
          .where(eq(assetTypes.isArchived, false))
          .all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      assetClass: row.assetClass,
      valuationModel: row.valuationModel,
      unitCode: row.unitCode,
      quantityPrecision: row.quantityPrecision,
      pricePrecision: row.pricePrecision,
      quoteCurrency: row.quoteCurrency,
      isArchived: row.isArchived,
    }));
  }

  async listAssets(includeArchived = false) {
    const rows = includeArchived
      ? await this.db.select().from(assets).all()
      : await this.db
          .select()
          .from(assets)
          .where(eq(assets.isArchived, false))
          .all();
    return rows.map((row) => ({
      id: row.id,
      assetTypeId: row.assetTypeId,
      name: row.name,
      symbol: row.symbol,
      providerSymbol: row.providerSymbol,
      quoteCurrency: row.quoteCurrency,
      isArchived: row.isArchived,
    }));
  }

  async archiveAsset(assetId: string, archivedAt: string): Promise<void> {
    await this.db.transaction((tx) => {
      const asset = tx.select().from(assets).where(eq(assets.id, assetId)).get();
      if (!asset) throw new Error("Asset does not exist");
      if (asset.isArchived) return;
      const type = tx.select().from(assetTypes).where(eq(assetTypes.id, asset.assetTypeId)).get();
      if (!type) throw new Error("Asset type does not exist");
      const rows = tx.select().from(assetLots).where(eq(assetLots.assetId, assetId)).all();
      const activeAggregateIds = new Set(rows.filter((row) => row.status === "ACTIVE").map((row) => row.id));
      const componentIds = new Set(tx.select().from(assetDcaComponents).all().map((row) => row.componentLotId));
      const openLots = rows.filter((row) => {
        if (row.status === "ACTIVE" && row.mergedIntoId === null) return true;
        return row.status === "MERGED" && row.mergedIntoId !== null &&
          activeAggregateIds.has(row.mergedIntoId) && componentIds.has(row.id);
      });
      const quantity = sumDecimalQuantities(openLots.map((row) => row.remainingQuantity), type.quantityPrecision);
      if (quantity !== "0") {
        throw new Error("An asset can only be archived when its remaining quantity is zero");
      }
      tx.update(assets).set({ isArchived: true, updatedAt: archivedAt }).where(eq(assets.id, assetId)).run();
    });
  }

  async archiveAssetType(assetTypeId: string, archivedAt: string): Promise<void> {
    await this.db.transaction((tx) => {
      const type = tx.select().from(assetTypes).where(eq(assetTypes.id, assetTypeId)).get();
      if (!type) throw new Error("Asset type does not exist");
      if (type.isArchived) return;
      const activeAssets = tx.select().from(assets).where(eq(assets.assetTypeId, assetTypeId)).all().filter((asset) => !asset.isArchived);
      if (activeAssets.length > 0) {
        throw new Error("Archive all asset profiles before archiving the asset type");
      }
      tx.update(assetTypes).set({ isArchived: true, updatedAt: archivedAt }).where(eq(assetTypes.id, assetTypeId)).run();
    });
  }

  async getSettings(): Promise<AssetSettingsRecord> {
    const row = await this.db.select().from(assetSettings).where(eq(assetSettings.id, 1)).get();
    if (!row) throw new Error("Asset settings have not been initialized");
    return {
      timezoneMode: row.timezoneMode,
      timezoneId: row.timezoneId,
      cryptoRefreshMinutes: row.cryptoRefreshMinutes,
      metalRefreshMinutes: row.metalRefreshMinutes,
      fiatRefreshMinutes: row.fiatRefreshMinutes,
      primaryCryptoProvider: row.primaryCryptoProvider as AssetSettingsRecord["primaryCryptoProvider"],
      fallbackCryptoProvider: row.fallbackCryptoProvider as AssetSettingsRecord["fallbackCryptoProvider"],
      updatedAt: row.updatedAt,
    };
  }

  async updateSettings(settings: AssetSettingsRecord): Promise<AssetSettingsRecord> {
    const updated = await this.db.update(assetSettings).set({
      timezoneMode: settings.timezoneMode,
      timezoneId: settings.timezoneId,
      cryptoRefreshMinutes: settings.cryptoRefreshMinutes,
      metalRefreshMinutes: settings.metalRefreshMinutes,
      fiatRefreshMinutes: settings.fiatRefreshMinutes,
      primaryCryptoProvider: settings.primaryCryptoProvider,
      fallbackCryptoProvider: settings.fallbackCryptoProvider,
      updatedAt: settings.updatedAt,
    }).where(eq(assetSettings.id, 1)).run();
    if (updated.changes !== 1) throw new Error("Asset settings could not be updated");
    return settings;
  }

  async getLatestQuote(assetId: string): Promise<MarketQuote | null> {
    const row = await this.db
      .select()
      .from(assetPriceQuotes)
      .where(eq(assetPriceQuotes.assetId, assetId))
      .orderBy(desc(assetPriceQuotes.capturedAt))
      .limit(1)
      .get();
    if (!row) return null;
    return {
      assetId: row.assetId,
      price: row.priceDecimal,
      currencyCode: row.currencyCode,
      source: row.source,
      status: row.quoteStatus,
      observedAt: row.observedAt,
      capturedAt: row.capturedAt,
      ...(row.conversionBasis === "USDT_USD_PARITY"
        ? { conversionBasis: "USDT_USD_PARITY" as const }
        : {}),
    };
  }

  async getRefreshState(providerKey: string): Promise<AssetRefreshStateRecord> {
    const row = await this.db
      .select()
      .from(assetRefreshStates)
      .where(eq(assetRefreshStates.providerKey, providerKey))
      .get();
    return row
      ? {
          providerKey: row.providerKey,
          lastAttemptAt: row.lastAttemptAt,
          lastSuccessAt: row.lastSuccessAt,
          failureCount: row.failureCount,
          nextAttemptAt: row.nextAttemptAt,
          lastError: row.lastError,
        }
      : {
          providerKey,
          lastAttemptAt: null,
          lastSuccessAt: null,
          failureCount: 0,
          nextAttemptAt: null,
          lastError: null,
        };
  }

  async saveRefreshState(state: AssetRefreshStateRecord): Promise<void> {
    const values = {
      lastAttemptAt: state.lastAttemptAt,
      lastSuccessAt: state.lastSuccessAt,
      failureCount: state.failureCount,
      nextAttemptAt: state.nextAttemptAt,
      lastError: state.lastError,
    };
    const updated = await this.db
      .update(assetRefreshStates)
      .set(values)
      .where(eq(assetRefreshStates.providerKey, state.providerKey))
      .run();
    if (updated.changes === 0) {
      await this.db.insert(assetRefreshStates).values({
        providerKey: state.providerKey,
        ...values,
      }).run();
    }
  }

  async findAssetForTransaction(assetId: string) {
    const asset = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .get();
    if (!asset) return null;
    const assetType = await this.db
      .select()
      .from(assetTypes)
      .where(eq(assetTypes.id, asset.assetTypeId))
      .get();
    if (!assetType) return null;
    return {
      asset: {
        id: asset.id,
        assetTypeId: asset.assetTypeId,
        name: asset.name,
        symbol: asset.symbol,
        providerSymbol: asset.providerSymbol,
        quoteCurrency: asset.quoteCurrency,
        isArchived: asset.isArchived,
      },
      assetType: {
        id: assetType.id,
        name: assetType.name,
        assetClass: assetType.assetClass,
        valuationModel: assetType.valuationModel,
        unitCode: assetType.unitCode,
        quantityPrecision: assetType.quantityPrecision,
        pricePrecision: assetType.pricePrecision,
        quoteCurrency: assetType.quoteCurrency,
        isArchived: assetType.isArchived,
      },
    };
  }

  async findAssetTransactionByJournalEntryId(journalEntryId: string) {
    const row = await this.db
      .select({
        transactionKind: assetTransactions.transactionKind,
        lotId: assetTransactions.lotId,
      })
      .from(assetTransactions)
      .where(eq(assetTransactions.journalEntryId, journalEntryId))
      .get();
    return row ?? null;
  }

  async findLotForSale(lotId: string) {
    const row = await this.db
      .select()
      .from(assetLots)
      .where(eq(assetLots.id, lotId))
      .get();
    if (!row) return null;
    let isDcaComponent = false;
    if (row.status === "MERGED") {
      const link = await this.db
        .select({ aggregateLotId: assetDcaComponents.aggregateLotId })
        .from(assetDcaComponents)
        .where(eq(assetDcaComponents.componentLotId, row.id))
        .get();
      if (link) {
        const aggregate = await this.db
          .select({ status: assetLots.status })
          .from(assetLots)
          .where(eq(assetLots.id, link.aggregateLotId))
          .get();
        isDcaComponent = aggregate?.status === "ACTIVE";
      }
    }
    return {
      lot: {
        id: row.id,
        assetId: row.assetId,
        currencyCode: row.currencyCode,
        quantity: row.quantity,
        remainingQuantity: row.remainingQuantity,
        costBasisMinor: BigInt(row.costBasisMinor),
        remainingCostBasisMinor: BigInt(row.remainingCostBasisMinor),
        acquiredAt: row.acquiredAt,
        status: row.status,
        mergedIntoId: row.mergedIntoId,
      },
      isDcaComponent,
    };
  }

  async commitPurchase(input: {
    lot: typeof assetLots.$inferInsert;
    transaction: AssetTransactionWrite;
    posting: PostingCommitInput;
  }): Promise<{ created: boolean }> {
    return this.db.transaction((tx) => {
      const { lot, transaction, posting } = input;
      if (transaction.transactionKind !== "BUY") {
        throw new Error("Purchase command requires a BUY asset transaction");
      }
      if (
        transaction.assetId !== lot.assetId ||
        transaction.currencyCode !== lot.currencyCode ||
        transaction.lotId !== lot.id ||
        transaction.journalEntryId !== posting.entry.id ||
        transaction.costBasisMinor !== BigInt(lot.costBasisMinor) ||
        transaction.grossAmountMinor !== BigInt(lot.costBasisMinor) ||
        transaction.netCashAmountMinor !==
          transaction.grossAmountMinor + transaction.feeAmountMinor ||
        BigInt(lot.remainingCostBasisMinor) !== BigInt(lot.costBasisMinor) ||
        lot.quantity !== lot.remainingQuantity ||
        lot.status !== "ACTIVE" ||
        lot.mergedIntoId !== null
      ) {
        throw new Error("Purchase lot and transaction facts are inconsistent");
      }

      if (this.hasExistingAssetPosting(tx, posting)) return { created: false };
      this.validateAssetAccounts(tx, transaction);
      if (!this.insertPostedJournal(tx, posting)) return { created: false };
      tx.insert(assetLots).values(lot).run();
      this.insertAssetTransaction(tx, transaction);
      return { created: true };
    });
  }

  async commitSale(input: {
    transaction: AssetTransactionWrite;
    posting: PostingCommitInput;
    quantityPrecision: number;
  }): Promise<{
    created: boolean;
    calculation: ReturnType<typeof calculateSale> | null;
  }> {
    return this.db.transaction((tx) => {
      const { transaction, posting, quantityPrecision } = input;
      if (transaction.transactionKind !== "SELL") {
        throw new Error("Sale command requires a SELL asset transaction");
      }
      if (transaction.journalEntryId !== posting.entry.id) {
        throw new Error(
          "Sale transaction must reference its posted Journal Entry",
        );
      }
      if (this.hasExistingAssetPosting(tx, posting)) {
        return { created: false, calculation: null };
      }
      this.validateAssetAccounts(tx, transaction);

      const lot = tx
        .select()
        .from(assetLots)
        .where(eq(assetLots.id, transaction.lotId))
        .get();
      if (
        !lot ||
        lot.assetId !== transaction.assetId ||
        lot.currencyCode !== transaction.currencyCode
      ) {
        throw new Error("Selected asset lot does not exist for this asset");
      }

      let isDcaComponent = false;
      if (lot.status === "MERGED") {
        const component = tx
          .select({ aggregateLotId: assetDcaComponents.aggregateLotId })
          .from(assetDcaComponents)
          .where(eq(assetDcaComponents.componentLotId, lot.id))
          .get();
        if (!component) {
          throw new Error("Merged lot is not a registered DCA component");
        }
        const aggregate = tx
          .select({ status: assetLots.status })
          .from(assetLots)
          .where(eq(assetLots.id, component.aggregateLotId))
          .get();
        if (aggregate?.status !== "ACTIVE") {
          throw new Error("DCA aggregate is not active");
        }
        isDcaComponent = true;
      }

      const calculation = calculateSale({
        lot: {
          id: lot.id,
          assetId: lot.assetId,
          currencyCode: lot.currencyCode,
          quantity: lot.quantity,
          remainingQuantity: lot.remainingQuantity,
          costBasisMinor: BigInt(lot.costBasisMinor),
          remainingCostBasisMinor: BigInt(lot.remainingCostBasisMinor),
          acquiredAt: lot.acquiredAt,
          status: lot.status,
        },
        quantitySold: transaction.quantity,
        quantityPrecision,
        grossProceedsMinor: transaction.grossAmountMinor,
        feeMinor: transaction.feeAmountMinor,
        isDcaComponent,
      });

      if (
        calculation.quantitySold !== transaction.quantity ||
        calculation.costBasisSoldMinor !== transaction.costBasisMinor ||
        calculation.netCashReceivedMinor !== transaction.netCashAmountMinor
      ) {
        throw new Error(
          "Sale transaction amounts do not match the lot calculation",
        );
      }

      if (!this.insertPostedJournal(tx, posting))
        return { created: false, calculation: null };

      const nextStatus =
        calculation.remainingQuantity === "0" ? "CLOSED" : lot.status;
      const update = tx
        .update(assetLots)
        .set({
          remainingQuantity: calculation.remainingQuantity,
          remainingCostBasisMinor: toSqliteSafeInteger(
            calculation.remainingCostBasisMinor,
          ),
          status: nextStatus,
        })
        .where(
          and(
            eq(assetLots.id, lot.id),
            eq(assetLots.remainingQuantity, lot.remainingQuantity),
          ),
        )
        .run();
      if (update.changes !== 1) {
        throw new Error("Asset lot changed while committing the sale");
      }

      this.insertAssetTransaction(tx, transaction);

      if (isDcaComponent && calculation.remainingQuantity === "0") {
        const link = tx
          .select({ aggregateLotId: assetDcaComponents.aggregateLotId })
          .from(assetDcaComponents)
          .where(eq(assetDcaComponents.componentLotId, lot.id))
          .get();
        if (link) {
          const components = tx
            .select({ remainingQuantity: assetLots.remainingQuantity })
            .from(assetDcaComponents)
            .innerJoin(
              assetLots,
              eq(assetLots.id, assetDcaComponents.componentLotId),
            )
            .where(eq(assetDcaComponents.aggregateLotId, link.aggregateLotId))
            .all();
          if (
            components.every((component) => component.remainingQuantity === "0")
          ) {
            tx.update(assetLots)
              .set({ status: "CLOSED" })
              .where(eq(assetLots.id, link.aggregateLotId))
              .run();
          }
        }
      }

      return { created: true, calculation };
    });
  }

  async listLots(assetId: string) {
    const facts = await this.findAssetForTransaction(assetId);
    if (!facts) throw new Error("Asset does not exist");
    const rows = await this.db
      .select()
      .from(assetLots)
      .where(eq(assetLots.assetId, assetId))
      .all();
    const activeAggregateIds = new Set(
      rows.filter((row) => row.status === "ACTIVE").map((row) => row.id),
    );
    const componentIds = new Set(
      (await this.db.select().from(assetDcaComponents).all()).map(
        (component) => component.componentLotId,
      ),
    );
    return rows
      .filter((row) => {
        const hasQuantity =
          normalizeDecimal(
            row.remainingQuantity,
            facts.assetType.quantityPrecision,
          ) !== "0";
        if (!hasQuantity) return false;
        if (row.status === "ACTIVE" && row.mergedIntoId === null) return true;
        return (
          row.status === "MERGED" &&
          row.mergedIntoId !== null &&
          activeAggregateIds.has(row.mergedIntoId) &&
          componentIds.has(row.id)
        );
      })
      .map((row) => ({
        id: row.id,
        assetId: row.assetId,
        currencyCode: row.currencyCode,
        quantity: row.quantity,
        remainingQuantity: row.remainingQuantity,
        costBasisMinor: BigInt(row.costBasisMinor),
        remainingCostBasisMinor: BigInt(row.remainingCostBasisMinor),
        acquiredAt: row.acquiredAt,
        status: row.status,
        mergedIntoId: row.mergedIntoId,
      }));
  }

  async getCurrentQuantity(assetId: string): Promise<string> {
    const facts = await this.findAssetForTransaction(assetId);
    if (!facts) throw new Error("Asset does not exist");
    const rows = await this.db
      .select()
      .from(assetLots)
      .where(eq(assetLots.assetId, assetId))
      .all();
    const activeAggregateIds = new Set(
      rows.filter((row) => row.status === "ACTIVE").map((row) => row.id),
    );
    const componentIds = new Set(
      (await this.db.select().from(assetDcaComponents).all()).map(
        (component) => component.componentLotId,
      ),
    );
    const quantities = rows
      .filter((row) => {
        if (row.status === "ACTIVE" && row.mergedIntoId === null) return true;
        return (
          row.status === "MERGED" &&
          row.mergedIntoId !== null &&
          activeAggregateIds.has(row.mergedIntoId) &&
          componentIds.has(row.id)
        );
      })
      .map((row) => row.remainingQuantity);
    return sumDecimalQuantities(quantities, facts.assetType.quantityPrecision);
  }

  async listDailyValuations(assetId: string): Promise<DailyValuation[]> {
    const rows = await this.db
      .select()
      .from(assetDailyValuations)
      .where(eq(assetDailyValuations.assetId, assetId))
      .orderBy(asc(assetDailyValuations.valuationDate));
    return rows.map((row) => ({
      id: row.id,
      assetId: row.assetId,
      valuationDate: row.valuationDate,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      totalValue: row.totalValue,
      currencyCode: row.currencyCode,
      source: row.source,
      quoteStatus: row.quoteStatus,
      observedAt: row.observedAt,
      capturedAt: row.capturedAt,
      closedAt: row.closedAt,
    }));
  }

  async recordQuoteAndSnapshot(input: {
    quoteId: string;
    snapshotId: string;
    quote: MarketQuote;
    quantity: string;
    valuationDate: string;
    snapshotCapturedAt: string;
    quantityPrecision: number;
    pricePrecision: number;
    currencyMinorUnit: number;
  }): Promise<DailyValuation | null> {
    return this.db.transaction((tx) => {
      const { quote } = input;
      const asset = tx
        .select()
        .from(assets)
        .where(eq(assets.id, quote.assetId))
        .get();
      if (
        !asset ||
        asset.isArchived ||
        asset.quoteCurrency !== quote.currencyCode
      ) {
        throw new Error("Quote asset or quote currency is invalid");
      }
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(input.valuationDate)) {
        throw new Error("Valuation date must use YYYY-MM-DD");
      }
      if (
        !Number.isFinite(Date.parse(quote.observedAt)) ||
        !Number.isFinite(Date.parse(quote.capturedAt)) ||
        !Number.isFinite(Date.parse(input.snapshotCapturedAt))
      ) {
        throw new Error(
          "Quote and snapshot timestamps must be valid ISO dates",
        );
      }

      tx.insert(assetPriceQuotes)
        .values({
          id: input.quoteId,
          assetId: quote.assetId,
          priceDecimal: quote.price,
          currencyCode: quote.currencyCode,
          source: quote.source,
          quoteStatus: quote.status,
          observedAt: quote.observedAt,
          capturedAt: quote.capturedAt,
          conversionBasis: quote.conversionBasis ?? null,
          createdAt: input.snapshotCapturedAt,
        })
        .run();

      if (quote.status === "REJECTED") return null;
      const normalizedQuantity = normalizeDecimal(
        input.quantity,
        input.quantityPrecision,
      );
      const normalizedPrice = normalizeDecimal(
        quote.price,
        input.pricePrecision,
      );
      const totalMinor =
        normalizedQuantity === "0"
          ? 0n
          : multiplyDecimalToMinor({
              quantity: normalizedQuantity,
              quantityPrecision: input.quantityPrecision,
              unitPrice: normalizedPrice,
              pricePrecision: input.pricePrecision,
              currencyMinorUnit: input.currencyMinorUnit,
            });
      const totalValue = formatMinorAmount(totalMinor, input.currencyMinorUnit);

      const latest = tx
        .select()
        .from(assetDailyValuations)
        .where(eq(assetDailyValuations.assetId, quote.assetId))
        .orderBy(desc(assetDailyValuations.valuationDate))
        .limit(1)
        .get();
      if (latest && input.valuationDate < latest.valuationDate) return null;

      const sameDay = tx
        .select()
        .from(assetDailyValuations)
        .where(
          and(
            eq(assetDailyValuations.assetId, quote.assetId),
            eq(assetDailyValuations.valuationDate, input.valuationDate),
          ),
        )
        .get();
      if (sameDay) {
        if (sameDay.closedAt !== null) return null;
        const updated = tx
          .update(assetDailyValuations)
          .set({
            quantity: normalizedQuantity,
            unitPrice: normalizedPrice,
            totalValue,
            currencyCode: quote.currencyCode,
            source: quote.source,
            quoteStatus: quote.status,
            observedAt: quote.observedAt,
            capturedAt: input.snapshotCapturedAt,
          })
          .where(
            and(
              eq(assetDailyValuations.id, sameDay.id),
              isNull(assetDailyValuations.closedAt),
            ),
          )
          .run();
        if (updated.changes !== 1)
          throw new Error("Open daily valuation changed during quote capture");
        return {
          id: sameDay.id,
          assetId: quote.assetId,
          valuationDate: input.valuationDate,
          quantity: normalizedQuantity,
          unitPrice: normalizedPrice,
          totalValue,
          currencyCode: quote.currencyCode,
          source: quote.source,
          quoteStatus: quote.status,
          observedAt: quote.observedAt,
          capturedAt: input.snapshotCapturedAt,
          closedAt: null,
        };
      }

      if (latest && latest.closedAt === null) {
        tx.update(assetDailyValuations)
          .set({ closedAt: input.snapshotCapturedAt })
          .where(
            and(
              eq(assetDailyValuations.id, latest.id),
              isNull(assetDailyValuations.closedAt),
            ),
          )
          .run();
      }

      tx.insert(assetDailyValuations)
        .values({
          id: input.snapshotId,
          assetId: quote.assetId,
          valuationDate: input.valuationDate,
          quantity: normalizedQuantity,
          unitPrice: normalizedPrice,
          totalValue,
          currencyCode: quote.currencyCode,
          source: quote.source,
          quoteStatus: quote.status,
          observedAt: quote.observedAt,
          capturedAt: input.snapshotCapturedAt,
          closedAt: null,
          createdAt: input.snapshotCapturedAt,
        })
        .run();
      return {
        id: input.snapshotId,
        assetId: quote.assetId,
        valuationDate: input.valuationDate,
        quantity: normalizedQuantity,
        unitPrice: normalizedPrice,
        totalValue,
        currencyCode: quote.currencyCode,
        source: quote.source,
        quoteStatus: quote.status,
        observedAt: quote.observedAt,
        capturedAt: input.snapshotCapturedAt,
        closedAt: null,
      };
    });
  }

  async mergeDca(input: {
    aggregateLotId: string;
    componentLotIds: string[];
    createdAt: string;
  }): Promise<DcaAggregate> {
    return this.db.transaction((tx) => {
      if (!input.aggregateLotId.trim() || input.componentLotIds.length < 2) {
        throw new Error(
          "DCA requires a new aggregate identity and at least two lots",
        );
      }
      if (
        new Set(input.componentLotIds).size !== input.componentLotIds.length
      ) {
        throw new Error("A DCA component cannot be selected more than once");
      }
      if (
        tx
          .select()
          .from(assetLots)
          .where(eq(assetLots.id, input.aggregateLotId))
          .get()
      ) {
        throw new Error("DCA aggregate identity already exists");
      }

      const rows = input.componentLotIds.map((id) => {
        const row = tx
          .select()
          .from(assetLots)
          .where(eq(assetLots.id, id))
          .get();
        if (!row) throw new Error("DCA source lot does not exist: " + id);
        return row;
      });
      const lots: AssetLot[] = rows.map((row) => ({
        id: row.id,
        assetId: row.assetId,
        currencyCode: row.currencyCode,
        quantity: row.quantity,
        remainingQuantity: row.remainingQuantity,
        costBasisMinor: BigInt(row.costBasisMinor),
        remainingCostBasisMinor: BigInt(row.remainingCostBasisMinor),
        acquiredAt: row.acquiredAt,
        status: row.status,
      }));

      const aggregate = aggregateDcaLots(
        lots,
        this.readQuantityPrecision(tx, lots[0]!.assetId),
      );
      tx.insert(assetLots)
        .values({
          id: input.aggregateLotId,
          assetId: aggregate.assetId,
          currencyCode: aggregate.currencyCode,
          quantity: "0",
          remainingQuantity: "0",
          costBasisMinor: 0,
          remainingCostBasisMinor: 0,
          acquiredAt: input.createdAt,
          status: "ACTIVE",
          mergedIntoId: null,
          createdAt: input.createdAt,
        })
        .run();

      for (const component of rows) {
        const changed = tx
          .update(assetLots)
          .set({ status: "MERGED", mergedIntoId: input.aggregateLotId })
          .where(
            and(eq(assetLots.id, component.id), eq(assetLots.status, "ACTIVE")),
          )
          .run();
        if (changed.changes !== 1) {
          throw new Error(
            "A DCA source lot is no longer ACTIVE: " + component.id,
          );
        }
        tx.insert(assetDcaComponents)
          .values({
            aggregateLotId: input.aggregateLotId,
            componentLotId: component.id,
            createdAt: input.createdAt,
          })
          .run();
      }
      return aggregate;
    });
  }

  private readQuantityPrecision(
    tx: LedgerTransaction,
    assetId: string,
  ): number {
    const row = tx
      .select({ quantityPrecision: assetTypes.quantityPrecision })
      .from(assets)
      .innerJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
      .where(eq(assets.id, assetId))
      .get();
    if (!row) throw new Error("Asset type does not exist for DCA source lots");
    return row.quantityPrecision;
  }

  private validateAssetAccounts(
    tx: LedgerTransaction,
    transaction: AssetTransactionWrite,
  ): void {
    const cash = tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, transaction.cashAccountId))
      .get();
    const investment = tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, transaction.investmentAccountId))
      .get();
    if (
      !cash ||
      cash.type !== "ASSET" ||
      cash.currencyCode !== transaction.currencyCode
    ) {
      throw new Error(
        "Asset transaction cash account must be an ASSET account in the transaction currency",
      );
    }
    if (
      !investment ||
      investment.type !== "ASSET" ||
      !investment.isInvestment ||
      investment.currencyCode !== transaction.currencyCode
    ) {
      throw new Error(
        "Asset transaction requires an INVESTMENT ASSET account in the transaction currency",
      );
    }
  }

  private insertAssetTransaction(
    tx: LedgerTransaction,
    transaction: AssetTransactionWrite,
  ): void {
    tx.insert(assetTransactions)
      .values({
        ...transaction,
        grossAmountMinor: toSqliteSafeInteger(transaction.grossAmountMinor),
        netCashAmountMinor: toSqliteSafeInteger(transaction.netCashAmountMinor),
        costBasisMinor: toSqliteSafeInteger(transaction.costBasisMinor),
        feeAmountMinor: toSqliteSafeInteger(transaction.feeAmountMinor),
      })
      .run();
  }

  private hasExistingAssetPosting(
    tx: LedgerTransaction,
    posting: PostingCommitInput,
  ): boolean {
    const key = posting.entry.idempotencyKey;
    if (!key) throw new Error("Asset posting requires an idempotency key");
    const existing = tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.idempotencyKey, key))
      .get();
    if (!existing) return false;
    if (existing.id !== posting.entry.id) {
      throw new Error("Asset posting idempotency key is already used");
    }
    const transaction = tx
      .select({ id: assetTransactions.id })
      .from(assetTransactions)
      .where(eq(assetTransactions.journalEntryId, existing.id))
      .get();
    if (!transaction) {
      throw new Error(
        "Idempotency key belongs to a Journal Entry without an asset transaction",
      );
    }
    return true;
  }

  private insertPostedJournal(
    tx: LedgerTransaction,
    posting: PostingCommitInput,
  ): boolean {
    const { entry, lines } = posting;
    if (
      entry.status !== "POSTED" ||
      entry.postedAt === null ||
      !entry.idempotencyKey?.trim()
    ) {
      throw new Error(
        "Asset posting requires a POSTED entry and idempotency key",
      );
    }
    if (this.hasExistingAssetPosting(tx, posting)) return false;

    const accountRows = tx.select().from(accounts).all();
    const currencyRows = tx.select().from(currencies).all();
    const categoryRows = tx.select().from(categories).all();
    const context: PostingContext = {
      accounts: new Map(accountRows.map((account) => [account.id, account])),
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
    validateJournalEntry(entry, lines, context);

    tx.insert(journalEntries)
      .values({
        ...entry,
        status: "DRAFT",
        postedAt: null,
        transactionKind: entry.transactionKind ?? "LEGACY",
        categoryId: entry.categoryId ?? null,
      })
      .run();
    tx.insert(journalLines)
      .values(
        lines.map((line) => ({
          ...line,
          amountMinor: toSqliteSafeInteger(line.amountMinor),
          baseAmountMinor: toSqliteSafeInteger(line.baseAmountMinor),
        })),
      )
      .run();
    const posted = tx
      .update(journalEntries)
      .set({ status: "POSTED", postedAt: entry.postedAt })
      .where(eq(journalEntries.id, entry.id))
      .run();
    if (posted.changes !== 1)
      throw new Error("Asset Journal Entry could not be posted");
    return true;
  }
}
