import { and, asc, eq } from "drizzle-orm";

import {
  fromSqliteInteger,
  toSqliteSafeInteger,
} from "../../domain/ledger/money";
import {
  validateJournalEntry,
  type PostingContext,
} from "../../domain/ledger/posting";
import type {
  Liability,
  LiabilityInstallment,
  LiabilityPayment,
  LiabilityPaymentCommit,
  LiabilityJournalCommit,
  LiabilityRateChange,
  LiabilityPaymentReversal,
} from "../../domain/liability/liability";
import type {
  CreateLiabilityRecord,
  LiabilityRepository,
} from "../../domain/liability/repository";
import type { JournalLine } from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import {
  accounts,
  categories,
  currencies,
  journalEntries,
  journalLines,
  liabilities,
  liabilityInstallments,
  liabilityPayments,
  liabilityRateChanges,
  liabilityPaymentAllocations,
  liabilityPaymentScheduleChanges,
  liabilityPaymentReversals,
} from "./schema";

type LiabilityTransaction = Parameters<
  Parameters<LedgerDatabase["transaction"]>[0]
>[0];

function mapLiability(row: typeof liabilities.$inferSelect): Liability {
  return {
    ...row,
    originalPrincipalMinor: fromSqliteInteger(row.originalPrincipalMinor),
    outstandingPrincipalMinor: fromSqliteInteger(row.outstandingPrincipalMinor),
    annualRatePpm: BigInt(row.annualRatePpm),
  };
}

function mapInstallment(
  row: typeof liabilityInstallments.$inferSelect,
): LiabilityInstallment {
  return {
    ...row,
    openingPrincipalMinor: fromSqliteInteger(row.openingPrincipalMinor),
    principalDueMinor: fromSqliteInteger(row.principalDueMinor),
    interestDueMinor: fromSqliteInteger(row.interestDueMinor),
    totalDueMinor: fromSqliteInteger(row.totalDueMinor),
    closingPrincipalMinor: fromSqliteInteger(row.closingPrincipalMinor),
    annualRatePpm: BigInt(row.annualRatePpm),
    principalPaidMinor: fromSqliteInteger(row.principalPaidMinor),
    interestPaidMinor: fromSqliteInteger(row.interestPaidMinor),
  };
}

function mapPayment(
  row: typeof liabilityPayments.$inferSelect,
): LiabilityPayment {
  return {
    ...row,
    principalPaidMinor: fromSqliteInteger(row.principalPaidMinor),
    interestPaidMinor: fromSqliteInteger(row.interestPaidMinor),
    feePaidMinor: fromSqliteInteger(row.feePaidMinor),
  };
}

export class SqliteLiabilityRepository implements LiabilityRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async createLiability(input: CreateLiabilityRecord): Promise<void> {
    this.db.transaction((tx) => {
      const context = this.readPostingContext(tx);
      validateJournalEntry(
        input.journal.journalEntry,
        input.journal.journalLines,
        context,
      );
      const entry = input.journal.journalEntry;
      if (
        entry.status !== "POSTED" ||
        !entry.postedAt ||
        entry.idempotencyKey === null
      ) {
        throw new Error(
          "Liability origination requires a posted, idempotent journal entry",
        );
      }
      const account = context.accounts.get(input.liability.liabilityAccountId);
      if (
        !account ||
        account.type !== "LIABILITY" ||
        account.currencyCode !== input.liability.currencyCode
      ) {
        throw new Error(
          "Liability account must be a matching LIABILITY account",
        );
      }
      const assetLines = input.journal.journalLines.filter(
        (line) => line.side === "DEBIT",
      );
      const liabilityLines = input.journal.journalLines.filter(
        (line) => line.accountId === account.id && line.side === "CREDIT",
      );
      if (
        assetLines.length !== 1 ||
        liabilityLines.length !== 1 ||
        liabilityLines[0]!.amountMinor !==
          input.liability.originalPrincipalMinor ||
        assetLines[0]!.amountMinor !== input.liability.originalPrincipalMinor
      ) {
        throw new Error(
          "Loan origination journal must debit the receiving ASSET and credit the full LIABILITY principal",
        );
      }

      tx.insert(liabilities)
        .values({
          ...input.liability,
          originalPrincipalMinor: toSqliteSafeInteger(
            input.liability.originalPrincipalMinor,
          ),
          outstandingPrincipalMinor: toSqliteSafeInteger(
            input.liability.outstandingPrincipalMinor,
          ),
          annualRatePpm: toSqliteSafeInteger(input.liability.annualRatePpm),
        })
        .run();
      this.insertPostedJournal(
        tx,
        input.journal.journalEntry,
        input.journal.journalLines,
      );
      const timestamp = input.liability.createdAt;
      if (input.installments.length > 0) {
        tx.insert(liabilityInstallments)
          .values(
            input.installments.map((item) =>
              this.installmentRow(item, timestamp),
            ),
          )
          .run();
      }
    });
  }

  async findById(id: string): Promise<Liability | null> {
    const row = await this.db
      .select()
      .from(liabilities)
      .where(eq(liabilities.id, id))
      .get();
    return row ? mapLiability(row) : null;
  }

  async list(includeArchived = false): Promise<Liability[]> {
    const rows = await this.db
      .select()
      .from(liabilities)
      .orderBy(asc(liabilities.createdAt))
      .all();
    return rows
      .filter((row) => includeArchived || row.status !== "ARCHIVED")
      .map(mapLiability);
  }

  async listInstallments(liabilityId: string): Promise<LiabilityInstallment[]> {
    const rows = await this.db
      .select()
      .from(liabilityInstallments)
      .where(eq(liabilityInstallments.liabilityId, liabilityId))
      .orderBy(asc(liabilityInstallments.sequence))
      .all();
    return rows.map(mapInstallment);
  }

  async findPaymentById(id: string): Promise<LiabilityPayment | null> {
    const row = await this.db
      .select()
      .from(liabilityPayments)
      .where(eq(liabilityPayments.id, id))
      .get();
    return row ? mapPayment(row) : null;
  }

  async findPaymentReversal(
    paymentId: string,
  ): Promise<LiabilityPaymentReversal | null> {
    const row = await this.db
      .select()
      .from(liabilityPaymentReversals)
      .where(eq(liabilityPaymentReversals.paymentId, paymentId))
      .get();
    return row ?? null;
  }

  async listPaymentReversals(
    liabilityId: string,
  ): Promise<LiabilityPaymentReversal[]> {
    return this.db
      .select({
        id: liabilityPaymentReversals.id,
        paymentId: liabilityPaymentReversals.paymentId,
        journalEntryId: liabilityPaymentReversals.journalEntryId,
        reason: liabilityPaymentReversals.reason,
        createdAt: liabilityPaymentReversals.createdAt,
      })
      .from(liabilityPaymentReversals)
      .innerJoin(
        liabilityPayments,
        eq(liabilityPayments.id, liabilityPaymentReversals.paymentId),
      )
      .where(eq(liabilityPayments.liabilityId, liabilityId))
      .all();
  }

  async listPayments(liabilityId: string): Promise<LiabilityPayment[]> {
    const rows = await this.db
      .select()
      .from(liabilityPayments)
      .where(eq(liabilityPayments.liabilityId, liabilityId))
      .orderBy(asc(liabilityPayments.paidAt))
      .all();
    return rows.map(mapPayment);
  }

  async listRateChanges(liabilityId: string): Promise<LiabilityRateChange[]> {
    const rows = await this.db
      .select()
      .from(liabilityRateChanges)
      .where(eq(liabilityRateChanges.liabilityId, liabilityId))
      .orderBy(asc(liabilityRateChanges.effectiveDate))
      .all();
    return rows.map((row) => ({
      ...row,
      annualRatePpm: BigInt(row.annualRatePpm),
    }));
  }

  async addRateChange(
    change: LiabilityRateChange,
    installments: LiabilityInstallment[],
  ): Promise<void> {
    this.db.transaction((tx) => {
      const liability = tx
        .select()
        .from(liabilities)
        .where(eq(liabilities.id, change.liabilityId))
        .get();
      if (!liability || liability.status !== "ACTIVE") {
        throw new Error("Only an ACTIVE liability can change APR");
      }
      const current = tx
        .select()
        .from(liabilityRateChanges)
        .where(eq(liabilityRateChanges.liabilityId, change.liabilityId))
        .all();
      const latest = current
        .filter((item) => item.effectiveDate <= change.effectiveDate)
        .sort(
          (a, b) =>
            a.effectiveDate.localeCompare(b.effectiveDate) ||
            a.createdAt.localeCompare(b.createdAt),
        )
        .at(-1);
      const currentApr = latest
        ? BigInt(latest.annualRatePpm)
        : BigInt(liability.annualRatePpm);
      if (currentApr === change.annualRatePpm) {
        throw new Error("New APR must differ from the currently effective APR");
      }
      const future = tx
        .select()
        .from(liabilityInstallments)
        .where(eq(liabilityInstallments.liabilityId, change.liabilityId))
        .all()
        .filter(
          (item) =>
            item.dueDate >= change.effectiveDate &&
            item.status !== "PAID" &&
            item.status !== "CANCELLED",
        );
      if (future.length === 0)
        throw new Error("There is no future installment to apply the new APR");
      if (
        future.some(
          (item) =>
            BigInt(item.principalPaidMinor) > 0n ||
            BigInt(item.interestPaidMinor) > 0n,
        )
      ) {
        throw new Error(
          "APR change cannot rewrite an installment with recorded payments",
        );
      }
      tx.insert(liabilityRateChanges)
        .values({
          ...change,
          annualRatePpm: toSqliteSafeInteger(change.annualRatePpm),
        })
        .run();
      for (const item of future) {
        const changed = tx
          .update(liabilityInstallments)
          .set({ status: "CANCELLED", updatedAt: change.createdAt })
          .where(eq(liabilityInstallments.id, item.id))
          .run();
        if (changed.changes !== 1)
          throw new Error("Future installment changed during APR update");
      }
      if (installments.length) {
        tx.insert(liabilityInstallments)
          .values(
            installments.map((item) =>
              this.installmentRow(item, change.createdAt),
            ),
          )
          .run();
      }
    });
  }

  async commitPayment(
    input: LiabilityPaymentCommit,
  ): Promise<LiabilityPayment> {
    return this.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(liabilityPayments)
        .where(
          eq(liabilityPayments.idempotencyKey, input.payment.idempotencyKey),
        )
        .get();
      if (existing) {
        if (
          existing.liabilityId !== input.payment.liabilityId ||
          existing.sourceAccountId !== input.payment.sourceAccountId ||
          existing.scheduleId !== input.payment.scheduleId ||
          existing.fxRateNumerator !== input.payment.fxRateNumerator ||
          existing.fxRateDenominator !== input.payment.fxRateDenominator ||
          existing.replacesPaymentId !== input.payment.replacesPaymentId ||
          existing.note !== input.payment.note ||
          fromSqliteInteger(existing.principalPaidMinor) !==
            input.payment.principalPaidMinor ||
          fromSqliteInteger(existing.interestPaidMinor) !==
            input.payment.interestPaidMinor ||
          fromSqliteInteger(existing.feePaidMinor) !==
            input.payment.feePaidMinor
        ) {
          throw new Error(
            "Payment idempotency key was reused with a different payload",
          );
        }
        return mapPayment(existing);
      }

      const liabilityRow = tx
        .select()
        .from(liabilities)
        .where(eq(liabilities.id, input.payment.liabilityId))
        .get();
      if (!liabilityRow || liabilityRow.status !== "ACTIVE") {
        throw new Error("Only an ACTIVE liability can receive a payment");
      }
      if (
        input.outstandingPrincipalMinor < 0n ||
        input.outstandingPrincipalMinor >
          fromSqliteInteger(liabilityRow.outstandingPrincipalMinor)
      ) {
        throw new Error(
          "Payment principal allocation is outside the outstanding balance",
        );
      }
      if (
        fromSqliteInteger(liabilityRow.outstandingPrincipalMinor) -
          input.payment.principalPaidMinor !==
        input.outstandingPrincipalMinor
      ) {
        throw new Error(
          "Payment principal does not reconcile to the new liability balance",
        );
      }
      if (
        input.journalEntry.id !== input.payment.journalEntryId ||
        input.journalEntry.idempotencyKey !== input.payment.idempotencyKey ||
        input.journalEntry.status !== "POSTED"
      ) {
        throw new Error("Payment and Journal Entry identities do not match");
      }
      validateJournalEntry(
        input.journalEntry,
        input.journalLines,
        this.readPostingContext(tx),
      );
      this.assertPaymentJournal(input, tx);
      this.insertPostedJournal(tx, input.journalEntry, input.journalLines);

      const existingPayments = tx
        .select()
        .from(liabilityPayments)
        .where(eq(liabilityPayments.liabilityId, input.payment.liabilityId))
        .all();
      const postingOrder =
        existingPayments.reduce(
          (maximum, item) => Math.max(maximum, item.postingOrder),
          0,
        ) + 1;
      tx.insert(liabilityPayments)
        .values({
          ...input.payment,
          postingOrder,
          principalPaidMinor: toSqliteSafeInteger(
            input.payment.principalPaidMinor,
          ),
          interestPaidMinor: toSqliteSafeInteger(
            input.payment.interestPaidMinor,
          ),
          feePaidMinor: toSqliteSafeInteger(input.payment.feePaidMinor),
        })
        .run();

      if (input.allocations.length) {
        tx.insert(liabilityPaymentAllocations)
          .values(
            input.allocations.map((item) => ({
              ...item,
              principalMinor: toSqliteSafeInteger(item.principalMinor),
              interestMinor: toSqliteSafeInteger(item.interestMinor),
              principalBeforeMinor: toSqliteSafeInteger(
                item.principalBeforeMinor,
              ),
              interestBeforeMinor: toSqliteSafeInteger(
                item.interestBeforeMinor,
              ),
            })),
          )
          .run();
      }
      for (const item of input.installmentUpdates) {
        const changed = tx
          .update(liabilityInstallments)
          .set({
            principalPaidMinor: toSqliteSafeInteger(item.principalPaidMinor),
            interestPaidMinor: toSqliteSafeInteger(item.interestPaidMinor),
            status: item.status,
            updatedAt: item.updatedAt,
          })
          .where(
            and(
              eq(liabilityInstallments.id, item.id),
              eq(liabilityInstallments.liabilityId, item.liabilityId),
            ),
          )
          .run();
        if (changed.changes !== 1)
          throw new Error(`Installment disappeared during payment: ${item.id}`);
      }

      if (input.newInstallments.length > 0) {
        tx.insert(liabilityInstallments)
          .values(
            input.newInstallments.map((item) =>
              this.installmentRow(item, input.payment.createdAt),
            ),
          )
          .run();
      }

      // Schedule-change audit rows may reference newly generated installments.
      // Persist those installments first to satisfy the FK to liability_installments.
      if (input.scheduleChanges.length) {
        tx.insert(liabilityPaymentScheduleChanges)
          .values(input.scheduleChanges)
          .run();
      }

      const paidOff = input.outstandingPrincipalMinor === 0n;
      const changedLiability = tx
        .update(liabilities)
        .set({
          outstandingPrincipalMinor: toSqliteSafeInteger(
            input.outstandingPrincipalMinor,
          ),
          status: paidOff ? "PAID_OFF" : "ACTIVE",
          paidOffAt: paidOff ? input.payment.paidAt : null,
          updatedAt: input.payment.createdAt,
        })
        .where(eq(liabilities.id, input.payment.liabilityId))
        .run();
      if (changedLiability.changes !== 1)
        throw new Error("Liability balance could not be updated");
      const persistedPayment = tx
        .select()
        .from(liabilityPayments)
        .where(eq(liabilityPayments.id, input.payment.id))
        .get();
      if (!persistedPayment)
        throw new Error("Committed payment could not be reloaded");
      return mapPayment(persistedPayment);
    });
  }

  async reversePayment(input: {
    paymentId: string;
    reversal: LiabilityJournalCommit;
    record: LiabilityPaymentReversal;
  }): Promise<void> {
    this.db.transaction((tx) => {
      const payment = tx
        .select()
        .from(liabilityPayments)
        .where(eq(liabilityPayments.id, input.paymentId))
        .get();
      if (!payment) throw new Error("Liability payment does not exist");
      const existing = tx
        .select()
        .from(liabilityPaymentReversals)
        .where(eq(liabilityPaymentReversals.paymentId, input.paymentId))
        .get();
      if (existing) throw new Error("Payment has already been reversed");
      const liability = tx
        .select()
        .from(liabilities)
        .where(eq(liabilities.id, payment.liabilityId))
        .get();
      if (!liability) throw new Error("Liability does not exist");
      const paymentRows = tx
        .select()
        .from(liabilityPayments)
        .where(eq(liabilityPayments.liabilityId, payment.liabilityId))
        .all();
      const reversals = tx.select().from(liabilityPaymentReversals).all();
      const reversedIds = new Set(reversals.map((item) => item.paymentId));
      if (
        paymentRows.some(
          (item) =>
            item.id !== payment.id &&
            item.postingOrder > payment.postingOrder &&
            !reversedIds.has(item.id),
        )
      ) {
        throw new Error("Reverse payments in reverse posting order");
      }
      if (
        input.reversal.journalEntry.reversalOfId !== payment.journalEntryId ||
        input.reversal.journalEntry.transactionKind !== "REVERSAL" ||
        input.reversal.journalEntry.status !== "POSTED"
      ) {
        throw new Error("Payment reversal journal link is invalid");
      }
      validateJournalEntry(
        input.reversal.journalEntry,
        input.reversal.journalLines,
        this.readPostingContext(tx),
      );
      const originalLines = tx
        .select()
        .from(journalLines)
        .where(eq(journalLines.entryId, payment.journalEntryId))
        .all();
      if (originalLines.length !== input.reversal.journalLines.length) {
        throw new Error(
          "Payment reversal must reverse every original journal line",
        );
      }
      const originalByLine = originalLines
        .slice()
        .sort((a, b) => a.lineNumber - b.lineNumber);
      const reversalByLine = input.reversal.journalLines
        .slice()
        .sort((a, b) => a.lineNumber - b.lineNumber);
      for (let index = 0; index < originalByLine.length; index += 1) {
        const source = originalByLine[index]!;
        const reversed = reversalByLine[index]!;
        if (
          source.accountId !== reversed.accountId ||
          source.currencyCode !== reversed.currencyCode ||
          fromSqliteInteger(source.amountMinor) !== reversed.amountMinor ||
          fromSqliteInteger(source.baseAmountMinor) !==
            reversed.baseAmountMinor ||
          source.fxRateNumerator !== reversed.fxRateNumerator ||
          source.fxRateDenominator !== reversed.fxRateDenominator ||
          source.side === reversed.side
        ) {
          throw new Error(
            "Payment reversal lines must exactly invert the original journal",
          );
        }
      }
      this.insertPostedJournal(
        tx,
        input.reversal.journalEntry,
        input.reversal.journalLines,
      );
      tx.insert(liabilityPaymentReversals).values(input.record).run();

      const allocations = tx
        .select()
        .from(liabilityPaymentAllocations)
        .where(eq(liabilityPaymentAllocations.paymentId, payment.id))
        .all();
      for (const allocation of allocations) {
        const changed = tx
          .update(liabilityInstallments)
          .set({
            principalPaidMinor: allocation.principalBeforeMinor,
            interestPaidMinor: allocation.interestBeforeMinor,
            status: allocation.statusBefore as LiabilityInstallment["status"],
            updatedAt: input.record.createdAt,
          })
          .where(eq(liabilityInstallments.id, allocation.installmentId))
          .run();
        if (changed.changes !== 1)
          throw new Error("Allocated installment is missing during reversal");
      }
      const scheduleChanges = tx
        .select()
        .from(liabilityPaymentScheduleChanges)
        .where(eq(liabilityPaymentScheduleChanges.paymentId, payment.id))
        .all();
      for (const change of scheduleChanges) {
        const status =
          change.action === "CREATED" ? "CANCELLED" : change.previousStatus;
        if (status) {
          const updated = tx
            .update(liabilityInstallments)
            .set({
              status: status as LiabilityInstallment["status"],
              updatedAt: input.record.createdAt,
            })
            .where(eq(liabilityInstallments.id, change.installmentId))
            .run();
          if (updated.changes !== 1)
            throw new Error("Changed installment is missing during reversal");
        }
      }
      const nextPrincipal =
        fromSqliteInteger(liability.outstandingPrincipalMinor) +
        fromSqliteInteger(payment.principalPaidMinor);
      if (nextPrincipal > fromSqliteInteger(liability.originalPrincipalMinor)) {
        throw new Error("Reversal would exceed the original loan principal");
      }
      tx.update(liabilities)
        .set({
          outstandingPrincipalMinor: toSqliteSafeInteger(nextPrincipal),
          status: "ACTIVE",
          paidOffAt: null,
          updatedAt: input.record.createdAt,
        })
        .where(eq(liabilities.id, payment.liabilityId))
        .run();
    });
  }

  async syncStatuses(liabilityId: string, localDate: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(liabilityInstallments)
      .where(eq(liabilityInstallments.liabilityId, liabilityId))
      .all();
    for (const row of rows) {
      if (row.status === "PAID" || row.status === "CANCELLED") continue;
      const principalLeft =
        fromSqliteInteger(row.principalDueMinor) -
        fromSqliteInteger(row.principalPaidMinor);
      const interestLeft =
        fromSqliteInteger(row.interestDueMinor) -
        fromSqliteInteger(row.interestPaidMinor);
      const paid = principalLeft === 0n && interestLeft === 0n;
      const partial =
        fromSqliteInteger(row.principalPaidMinor) > 0n ||
        fromSqliteInteger(row.interestPaidMinor) > 0n;
      const status = paid
        ? "PAID"
        : row.dueDate < localDate
          ? "OVERDUE"
          : partial
            ? "PARTIALLY_PAID"
            : row.dueDate === localDate
              ? "DUE"
              : "UPCOMING";
      if (status !== row.status) {
        await this.db
          .update(liabilityInstallments)
          .set({ status, updatedAt: new Date().toISOString() })
          .where(eq(liabilityInstallments.id, row.id))
          .run();
      }
    }
  }

  async archive(id: string, archivedAt: string): Promise<void> {
    const result = await this.db
      .update(liabilities)
      .set({ status: "ARCHIVED", updatedAt: archivedAt })
      .where(
        and(
          eq(liabilities.id, id),
          eq(liabilities.outstandingPrincipalMinor, 0),
        ),
      )
      .run();
    if (result.changes !== 1)
      throw new Error("Liability must be paid off before it can be archived");
  }

  async reconcile(id: string) {
    const row = await this.db
      .select()
      .from(liabilities)
      .where(eq(liabilities.id, id))
      .get();
    if (!row) throw new Error(`Liability does not exist: ${id}`);
    const lines = await this.db
      .select({
        side: journalLines.side,
        amountMinor: journalLines.amountMinor,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
      .where(
        and(
          eq(journalLines.accountId, row.liabilityAccountId),
          eq(journalEntries.status, "POSTED"),
        ),
      )
      .all();
    const ledgerPrincipalMinor = lines.reduce(
      (balance, line) =>
        balance +
        (line.side === "CREDIT"
          ? fromSqliteInteger(line.amountMinor)
          : -fromSqliteInteger(line.amountMinor)),
      0n,
    );
    const recordedPrincipalMinor = fromSqliteInteger(
      row.outstandingPrincipalMinor,
    );
    const installments = await this.db
      .select()
      .from(liabilityInstallments)
      .where(eq(liabilityInstallments.liabilityId, id))
      .all();
    const schedulePrincipalMinor = installments
      .filter((item) => item.status !== "CANCELLED")
      .reduce(
        (balance, item) =>
          balance +
          fromSqliteInteger(item.principalDueMinor) -
          fromSqliteInteger(item.principalPaidMinor),
        0n,
      );
    const [payments, reversals] = await Promise.all([
      this.db
        .select()
        .from(liabilityPayments)
        .where(eq(liabilityPayments.liabilityId, id))
        .all(),
      this.db
        .select({ paymentId: liabilityPaymentReversals.paymentId })
        .from(liabilityPaymentReversals)
        .all(),
    ]);
    const reversedPaymentIds = new Set(reversals.map((item) => item.paymentId));
    const netPrincipalPaidMinor = payments
      .filter((item) => !reversedPaymentIds.has(item.id))
      .reduce(
        (total, item) => total + fromSqliteInteger(item.principalPaidMinor),
        0n,
      );
    const paymentDerivedPrincipalMinor =
      fromSqliteInteger(row.originalPrincipalMinor) - netPrincipalPaidMinor;
    return {
      ledgerPrincipalMinor,
      recordedPrincipalMinor,
      schedulePrincipalMinor,
      paymentDerivedPrincipalMinor,
      differenceMinor: ledgerPrincipalMinor - recordedPrincipalMinor,
      scheduleDifferenceMinor: schedulePrincipalMinor - recordedPrincipalMinor,
      paymentDifferenceMinor:
        paymentDerivedPrincipalMinor - recordedPrincipalMinor,
    };
  }

  private installmentRow(item: LiabilityInstallment, timestamp: string) {
    return {
      ...item,
      openingPrincipalMinor: toSqliteSafeInteger(item.openingPrincipalMinor),
      principalDueMinor: toSqliteSafeInteger(item.principalDueMinor),
      interestDueMinor: toSqliteSafeInteger(item.interestDueMinor),
      totalDueMinor: toSqliteSafeInteger(item.totalDueMinor),
      closingPrincipalMinor: toSqliteSafeInteger(item.closingPrincipalMinor),
      annualRatePpm: toSqliteSafeInteger(item.annualRatePpm),
      principalPaidMinor: toSqliteSafeInteger(item.principalPaidMinor),
      interestPaidMinor: toSqliteSafeInteger(item.interestPaidMinor),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private insertPostedJournal(
    tx: LiabilityTransaction,
    entry: LiabilityPaymentCommit["journalEntry"],
    lines: JournalLine[],
  ) {
    tx.insert(journalEntries)
      .values({
        ...entry,
        status: "DRAFT",
        postedAt: null,
        transactionKind: entry.transactionKind ?? "ADJUSTMENT",
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
    const updated = tx
      .update(journalEntries)
      .set({ status: "POSTED", postedAt: entry.postedAt })
      .where(eq(journalEntries.id, entry.id))
      .run();
    if (updated.changes !== 1)
      throw new Error("Liability journal could not be posted");
  }

  private assertPaymentJournal(
    input: LiabilityPaymentCommit,
    tx: LiabilityTransaction,
  ) {
    const liability = tx
      .select()
      .from(liabilities)
      .where(eq(liabilities.id, input.payment.liabilityId))
      .get();
    if (!liability) throw new Error("Liability does not exist");
    const accountRows = tx.select().from(accounts).all();
    const accountById = new Map(accountRows.map((row) => [row.id, row]));
    const sum = (accountId: string, side: "DEBIT" | "CREDIT") =>
      input.journalLines
        .filter((line) => line.accountId === accountId && line.side === side)
        .reduce((total, line) => total + line.amountMinor, 0n);
    const expectedTotal =
      input.payment.principalPaidMinor +
      input.payment.interestPaidMinor +
      input.payment.feePaidMinor;
    const source = accountById.get(input.payment.sourceAccountId);
    if (!source || source.type !== "ASSET")
      throw new Error("Payment source must be an ASSET account");
    if (
      sum(liability.liabilityAccountId, "DEBIT") !==
        input.payment.principalPaidMinor ||
      sum(liability.interestExpenseAccountId, "DEBIT") !==
        input.payment.interestPaidMinor ||
      sum(input.payment.sourceAccountId, "CREDIT") !== expectedTotal
    ) {
      throw new Error(
        "Payment journal lines do not match principal, interest and payment source allocations",
      );
    }
    const feeLines = input.journalLines.filter(
      (line) =>
        line.side === "DEBIT" &&
        line.accountId !== liability.liabilityAccountId &&
        line.accountId !== liability.interestExpenseAccountId,
    );
    if (
      feeLines.reduce((total, line) => total + line.amountMinor, 0n) !==
        input.payment.feePaidMinor ||
      feeLines.some(
        (line) => accountById.get(line.accountId)?.type !== "EXPENSE",
      )
    ) {
      throw new Error(
        "Payment fee must be posted to a separate EXPENSE account",
      );
    }
    const allowed = new Set([
      liability.liabilityAccountId,
      liability.interestExpenseAccountId,
      input.payment.sourceAccountId,
      ...feeLines.map((line) => line.accountId),
    ]);
    if (input.journalLines.some((line) => !allowed.has(line.accountId))) {
      throw new Error("Payment journal contains an unexpected account line");
    }
  }

  private readPostingContext(tx: LiabilityTransaction): PostingContext {
    const accountRows = tx.select().from(accounts).all();
    const currencyRows = tx.select().from(currencies).all();
    const categoryRows = tx.select().from(categories).all();
    return {
      accounts: new Map(accountRows.map((row) => [row.id, row])),
      currencies: new Map(
        currencyRows.map((row) => [
          row.code,
          { code: row.code, minorUnit: row.minorUnit, isActive: row.isActive },
        ]),
      ),
      categories: new Map(
        categoryRows.map((row) => [
          row.id,
          { id: row.id, kind: row.kind, isArchived: row.isArchived },
        ]),
      ),
    };
  }
}
