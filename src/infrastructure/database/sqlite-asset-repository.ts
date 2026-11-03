import { and, eq } from "drizzle-orm";

import { aggregateDcaLots, calculateSale, type AssetLot, type DcaAggregate } from "../../domain/asset/asset";
import { toSqliteSafeInteger } from "../../domain/ledger/money";
import { validateJournalEntry, type PostingContext } from "../../domain/ledger/posting";
import type { JournalEntry, JournalLine, PostingCommitInput } from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import {
  accounts,
  assetDcaComponents,
  assetLots,
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

type LedgerTransaction = Parameters<
  Parameters<LedgerDatabase["transaction"]>[0]
>[0];

/**
 * Asset writes that affect Ledger are deliberately implemented in this
 * repository. A purchase/sale is not split across AccountingService and an
 * asset repository because those two independent commits cannot be atomic.
 */
export class SqliteAssetRepository {
  constructor(private readonly db: LedgerDatabase) {}

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
        transaction.lotId !== lot.id ||
        transaction.journalEntryId !== posting.entry.id ||
        transaction.costBasisMinor !== BigInt(lot.costBasisMinor) ||
        BigInt(lot.remainingCostBasisMinor) !== BigInt(lot.costBasisMinor) ||
        lot.quantity !== lot.remainingQuantity ||
        lot.status !== "ACTIVE" ||
        lot.mergedIntoId !== null
      ) {
        throw new Error("Purchase lot and transaction facts are inconsistent");
      }

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
  }): Promise<{ created: boolean; calculation: ReturnType<typeof calculateSale> | null }> {
    return this.db.transaction((tx) => {
      const { transaction, posting, quantityPrecision } = input;
      if (transaction.transactionKind !== "SELL") {
        throw new Error("Sale command requires a SELL asset transaction");
      }
      if (transaction.journalEntryId !== posting.entry.id) {
        throw new Error("Sale transaction must reference its posted Journal Entry");
      }

      const lot = tx.select().from(assetLots).where(eq(assetLots.id, transaction.lotId)).get();
      if (!lot || lot.assetId !== transaction.assetId) {
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
        throw new Error("Sale transaction amounts do not match the lot calculation");
      }

      if (!this.insertPostedJournal(tx, posting)) return { created: false, calculation: null };

      const nextStatus = calculation.remainingQuantity === "0" ? "CLOSED" : lot.status;
      const update = tx
        .update(assetLots)
        .set({
          remainingQuantity: calculation.remainingQuantity,
          remainingCostBasisMinor: toSqliteSafeInteger(calculation.remainingCostBasisMinor),
          status: nextStatus,
        })
        .where(and(eq(assetLots.id, lot.id), eq(assetLots.remainingQuantity, lot.remainingQuantity)))
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
            .innerJoin(assetLots, eq(assetLots.id, assetDcaComponents.componentLotId))
            .where(eq(assetDcaComponents.aggregateLotId, link.aggregateLotId))
            .all();
          if (components.every((component) => component.remainingQuantity === "0")) {
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

  async mergeDca(input: {
    aggregateLotId: string;
    componentLotIds: string[];
    createdAt: string;
  }): Promise<DcaAggregate> {
    return this.db.transaction((tx) => {
      if (!input.aggregateLotId.trim() || input.componentLotIds.length < 2) {
        throw new Error("DCA requires a new aggregate identity and at least two lots");
      }
      if (new Set(input.componentLotIds).size !== input.componentLotIds.length) {
        throw new Error("A DCA component cannot be selected more than once");
      }
      if (tx.select().from(assetLots).where(eq(assetLots.id, input.aggregateLotId)).get()) {
        throw new Error("DCA aggregate identity already exists");
      }

      const rows = input.componentLotIds.map((id) => {
        const row = tx.select().from(assetLots).where(eq(assetLots.id, id)).get();
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

      const aggregate = aggregateDcaLots(lots, this.readQuantityPrecision(tx, lots[0]!.assetId));
      tx.insert(assetLots).values({
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
      }).run();

      for (const component of rows) {
        const changed = tx.update(assetLots)
          .set({ status: "MERGED", mergedIntoId: input.aggregateLotId })
          .where(and(eq(assetLots.id, component.id), eq(assetLots.status, "ACTIVE")))
          .run();
        if (changed.changes !== 1) {
          throw new Error("A DCA source lot is no longer ACTIVE: " + component.id);
        }
        tx.insert(assetDcaComponents).values({
          aggregateLotId: input.aggregateLotId,
          componentLotId: component.id,
          createdAt: input.createdAt,
        }).run();
      }
      return aggregate;
    });
  }

  private readQuantityPrecision(tx: LedgerTransaction, assetId: string): number {
    const row = tx
      .select({ quantityPrecision: assetTypes.quantityPrecision })
      .from(assets)
      .innerJoin(assetTypes, eq(assetTypes.id, assets.assetTypeId))
      .where(eq(assets.id, assetId))
      .get();
    if (!row) throw new Error("Asset type does not exist for DCA source lots");
    return row.quantityPrecision;
  }

  private insertAssetTransaction(tx: LedgerTransaction, transaction: AssetTransactionWrite): void {
    tx.insert(assetTransactions).values({
      ...transaction,
      grossAmountMinor: toSqliteSafeInteger(transaction.grossAmountMinor),
      netCashAmountMinor: toSqliteSafeInteger(transaction.netCashAmountMinor),
      costBasisMinor: toSqliteSafeInteger(transaction.costBasisMinor),
      feeAmountMinor: toSqliteSafeInteger(transaction.feeAmountMinor),
    }).run();
  }

  private insertPostedJournal(tx: LedgerTransaction, posting: PostingCommitInput): boolean {
    const { entry, lines } = posting;
    if (entry.status !== "POSTED" || entry.postedAt === null || !entry.idempotencyKey?.trim()) {
      throw new Error("Asset posting requires a POSTED entry and idempotency key");
    }
    const existing = tx
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.idempotencyKey, entry.idempotencyKey))
      .get();
    if (existing) {
      if (existing.id !== entry.id) {
        throw new Error("Asset posting idempotency key is already used");
      }
      const transaction = tx
        .select({ id: assetTransactions.id })
        .from(assetTransactions)
        .where(eq(assetTransactions.journalEntryId, existing.id))
        .get();
      if (!transaction) {
        throw new Error("Idempotency key belongs to a Journal Entry without an asset transaction");
      }
      return false;
    }

    const accountRows = tx.select().from(accounts).all();
    const currencyRows = tx.select().from(currencies).all();
    const categoryRows = tx.select().from(categories).all();
    const context: PostingContext = {
      accounts: new Map(accountRows.map((account) => [account.id, account])),
      currencies: new Map(currencyRows.map((currency) => [currency.code, {
        code: currency.code,
        minorUnit: currency.minorUnit,
        isActive: currency.isActive,
      }])),
      categories: new Map(categoryRows.map((category) => [category.id, {
        id: category.id,
        kind: category.kind,
        isArchived: category.isArchived,
      }])),
    };
    validateJournalEntry(entry, lines, context);

    tx.insert(journalEntries).values({
      ...entry,
      status: "DRAFT",
      postedAt: null,
      transactionKind: entry.transactionKind ?? "LEGACY",
      categoryId: entry.categoryId ?? null,
    }).run();
    tx.insert(journalLines).values(lines.map((line) => ({
      ...line,
      amountMinor: toSqliteSafeInteger(line.amountMinor),
      baseAmountMinor: toSqliteSafeInteger(line.baseAmountMinor),
    }))).run();
    const posted = tx.update(journalEntries)
      .set({ status: "POSTED", postedAt: entry.postedAt })
      .where(eq(journalEntries.id, entry.id))
      .run();
    if (posted.changes !== 1) throw new Error("Asset Journal Entry could not be posted");
    return true;
  }
}
