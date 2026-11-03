import { and, asc, eq } from "drizzle-orm";

import {
  fromSqliteInteger,
  toSqliteSafeInteger,
} from "../../domain/ledger/money";
import { validateJournalEntry, type PostingContext } from "../../domain/ledger/posting";
import type {
  Liability,
  LiabilityInstallment,
  LiabilityPayment,
  LiabilityPaymentCommit,
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
} from "./schema";

type LiabilityTransaction = Parameters<Parameters<LedgerDatabase["transaction"]>[0]>[0];

function mapLiability(row: typeof liabilities.$inferSelect): Liability {
  return {
    ...row,
    originalPrincipalMinor: fromSqliteInteger(row.originalPrincipalMinor),
    outstandingPrincipalMinor: fromSqliteInteger(row.outstandingPrincipalMinor),
    annualRatePpm: BigInt(row.annualRatePpm),
  };
}

function mapInstallment(row: typeof liabilityInstallments.$inferSelect): LiabilityInstallment {
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

function mapPayment(row: typeof liabilityPayments.$inferSelect): LiabilityPayment {
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
      validateJournalEntry(input.journal.journalEntry, input.journal.journalLines, context);
      const entry = input.journal.journalEntry;
      if (entry.status !== "POSTED" || !entry.postedAt || entry.idempotencyKey === null) {
        throw new Error("Liability origination requires a posted, idempotent journal entry");
      }
      const account = context.accounts.get(input.liability.liabilityAccountId);
      if (!account || account.type !== "LIABILITY" || account.currencyCode !== input.liability.currencyCode) {
        throw new Error("Liability account must be a matching LIABILITY account");
      }
      const assetLines = input.journal.journalLines.filter((line) => line.side === "DEBIT");
      const liabilityLines = input.journal.journalLines.filter((line) => line.accountId === account.id && line.side === "CREDIT");
      if (assetLines.length !== 1 || liabilityLines.length !== 1 ||
          liabilityLines[0]!.amountMinor !== input.liability.originalPrincipalMinor ||
          assetLines[0]!.amountMinor !== input.liability.originalPrincipalMinor) {
        throw new Error("Loan origination journal must debit the receiving ASSET and credit the full LIABILITY principal");
      }

      tx.insert(liabilities).values({
        ...input.liability,
        originalPrincipalMinor: toSqliteSafeInteger(input.liability.originalPrincipalMinor),
        outstandingPrincipalMinor: toSqliteSafeInteger(input.liability.outstandingPrincipalMinor),
        annualRatePpm: toSqliteSafeInteger(input.liability.annualRatePpm),
      }).run();
      this.insertPostedJournal(tx, input.journal.journalEntry, input.journal.journalLines);
      const timestamp = input.liability.createdAt;
      if (input.installments.length > 0) {
        tx.insert(liabilityInstallments).values(input.installments.map((item) => this.installmentRow(item, timestamp))).run();
      }
    });
  }

  async findById(id: string): Promise<Liability | null> {
    const row = await this.db.select().from(liabilities).where(eq(liabilities.id, id)).get();
    return row ? mapLiability(row) : null;
  }

  async list(includeArchived = false): Promise<Liability[]> {
    const rows = await this.db.select().from(liabilities).orderBy(asc(liabilities.createdAt)).all();
    return rows.filter((row) => includeArchived || row.status !== "ARCHIVED").map(mapLiability);
  }

  async listInstallments(liabilityId: string): Promise<LiabilityInstallment[]> {
    const rows = await this.db.select().from(liabilityInstallments)
      .where(eq(liabilityInstallments.liabilityId, liabilityId))
      .orderBy(asc(liabilityInstallments.sequence)).all();
    return rows.map(mapInstallment);
  }

  async listPayments(liabilityId: string): Promise<LiabilityPayment[]> {
    const rows = await this.db.select().from(liabilityPayments)
      .where(eq(liabilityPayments.liabilityId, liabilityId))
      .orderBy(asc(liabilityPayments.paidAt)).all();
    return rows.map(mapPayment);
  }

  async commitPayment(input: LiabilityPaymentCommit): Promise<LiabilityPayment> {
    return this.db.transaction((tx) => {
      const existing = tx.select().from(liabilityPayments)
        .where(eq(liabilityPayments.idempotencyKey, input.payment.idempotencyKey)).get();
      if (existing) return mapPayment(existing);

      const liabilityRow = tx.select().from(liabilities)
        .where(eq(liabilities.id, input.payment.liabilityId)).get();
      if (!liabilityRow || liabilityRow.status !== "ACTIVE") {
        throw new Error("Only an ACTIVE liability can receive a payment");
      }
      if (input.outstandingPrincipalMinor < 0n ||
          input.outstandingPrincipalMinor > fromSqliteInteger(liabilityRow.outstandingPrincipalMinor)) {
        throw new Error("Payment principal allocation is outside the outstanding balance");
      }
      if (fromSqliteInteger(liabilityRow.outstandingPrincipalMinor) - input.payment.principalPaidMinor !== input.outstandingPrincipalMinor) {
        throw new Error("Payment principal does not reconcile to the new liability balance");
      }
      validateJournalEntry(input.journalEntry, input.journalLines, this.readPostingContext(tx));
      this.assertPaymentJournal(input, tx);
      this.insertPostedJournal(tx, input.journalEntry, input.journalLines);

      tx.insert(liabilityPayments).values({
        ...input.payment,
        principalPaidMinor: toSqliteSafeInteger(input.payment.principalPaidMinor),
        interestPaidMinor: toSqliteSafeInteger(input.payment.interestPaidMinor),
        feePaidMinor: toSqliteSafeInteger(input.payment.feePaidMinor),
      }).run();

      for (const item of input.installmentUpdates) {
        const changed = tx.update(liabilityInstallments).set({
          principalPaidMinor: toSqliteSafeInteger(item.principalPaidMinor),
          interestPaidMinor: toSqliteSafeInteger(item.interestPaidMinor),
          status: item.status,
          updatedAt: item.updatedAt,
        }).where(and(
          eq(liabilityInstallments.id, item.id),
          eq(liabilityInstallments.liabilityId, item.liabilityId),
        )).run();
        if (changed.changes !== 1) throw new Error(`Installment disappeared during payment: ${item.id}`);
      }

      const paidOff = input.outstandingPrincipalMinor === 0n;
      const changedLiability = tx.update(liabilities).set({
        outstandingPrincipalMinor: toSqliteSafeInteger(input.outstandingPrincipalMinor),
        status: paidOff ? "PAID_OFF" : "ACTIVE",
        paidOffAt: paidOff ? input.payment.paidAt : null,
        updatedAt: input.payment.createdAt,
      }).where(eq(liabilities.id, input.payment.liabilityId)).run();
      if (changedLiability.changes !== 1) throw new Error("Liability balance could not be updated");
      return input.payment;
    });
  }

  async syncStatuses(liabilityId: string, localDate: string): Promise<void> {
    const rows = await this.db.select().from(liabilityInstallments)
      .where(eq(liabilityInstallments.liabilityId, liabilityId)).all();
    for (const row of rows) {
      if (row.status === "PAID" || row.status === "CANCELLED") continue;
      const principalLeft = fromSqliteInteger(row.principalDueMinor) - fromSqliteInteger(row.principalPaidMinor);
      const interestLeft = fromSqliteInteger(row.interestDueMinor) - fromSqliteInteger(row.interestPaidMinor);
      const paid = principalLeft === 0n && interestLeft === 0n;
      const partial = fromSqliteInteger(row.principalPaidMinor) > 0n || fromSqliteInteger(row.interestPaidMinor) > 0n;
      const status = paid ? "PAID" : row.dueDate < localDate ? "OVERDUE" : row.dueDate === localDate ? "DUE" : partial ? "PARTIALLY_PAID" : "UPCOMING";
      if (status !== row.status) {
        await this.db.update(liabilityInstallments).set({ status, updatedAt: new Date().toISOString() })
          .where(eq(liabilityInstallments.id, row.id)).run();
      }
    }
  }

  async archive(id: string, archivedAt: string): Promise<void> {
    const result = await this.db.update(liabilities).set({ status: "ARCHIVED", updatedAt: archivedAt })
      .where(and(eq(liabilities.id, id), eq(liabilities.outstandingPrincipalMinor, 0))).run();
    if (result.changes !== 1) throw new Error("Liability must be paid off before it can be archived");
  }

  async reconcile(id: string) {
    const row = await this.db.select().from(liabilities).where(eq(liabilities.id, id)).get();
    if (!row) throw new Error(`Liability does not exist: ${id}`);
    const lines = await this.db.select({ side: journalLines.side, amountMinor: journalLines.amountMinor })
      .from(journalLines).innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
      .where(and(eq(journalLines.accountId, row.liabilityAccountId), eq(journalEntries.status, "POSTED"))).all();
    const ledgerPrincipalMinor = lines.reduce((balance, line) =>
      balance + (line.side === "CREDIT" ? fromSqliteInteger(line.amountMinor) : -fromSqliteInteger(line.amountMinor)), 0n);
    const recordedPrincipalMinor = fromSqliteInteger(row.outstandingPrincipalMinor);
    return { ledgerPrincipalMinor, recordedPrincipalMinor, differenceMinor: ledgerPrincipalMinor - recordedPrincipalMinor };
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

  private insertPostedJournal(tx: LiabilityTransaction, entry: LiabilityPaymentCommit["journalEntry"], lines: JournalLine[]) {
    tx.insert(journalEntries).values({
      ...entry,
      status: "DRAFT",
      postedAt: null,
      transactionKind: entry.transactionKind ?? "ADJUSTMENT",
      categoryId: entry.categoryId ?? null,
    }).run();
    tx.insert(journalLines).values(lines.map((line) => ({
      ...line,
      amountMinor: toSqliteSafeInteger(line.amountMinor),
      baseAmountMinor: toSqliteSafeInteger(line.baseAmountMinor),
    }))).run();
    const updated = tx.update(journalEntries).set({ status: "POSTED", postedAt: entry.postedAt })
      .where(eq(journalEntries.id, entry.id)).run();
    if (updated.changes !== 1) throw new Error("Liability journal could not be posted");
  }

  private assertPaymentJournal(input: LiabilityPaymentCommit, tx: LiabilityTransaction) {
    const debitLiability = input.journalLines.filter((line) => line.accountId === input.payment.liabilityId && line.side === "DEBIT")
      .reduce((sum, line) => sum + line.amountMinor, 0n);
    const liability = tx.select().from(liabilities).where(eq(liabilities.id, input.payment.liabilityId)).get();
    if (!liability) throw new Error("Liability does not exist");
    const principalDebits = input.journalLines.filter((line) => line.accountId === liability.liabilityAccountId && line.side === "DEBIT")
      .reduce((sum, line) => sum + line.amountMinor, 0n);
    const interestDebits = input.journalLines.filter((line) => line.accountId === liability.interestExpenseAccountId && line.side === "DEBIT")
      .reduce((sum, line) => sum + line.amountMinor, 0n);
    const sourceCredits = input.journalLines.filter((line) => line.accountId === input.payment.sourceAccountId && line.side === "CREDIT")
      .reduce((sum, line) => sum + line.amountMinor, 0n);
    const expected = input.payment.principalPaidMinor + input.payment.interestPaidMinor + input.payment.feePaidMinor;
    if (debitLiability !== 0n || principalDebits !== input.payment.principalPaidMinor ||
        interestDebits !== input.payment.interestPaidMinor || sourceCredits !== expected) {
      throw new Error("Payment journal lines do not match principal, interest and payment source allocations");
    }
  }

  private readPostingContext(tx: LiabilityTransaction): PostingContext {
    const accountRows = tx.select().from(accounts).all();
    const currencyRows = tx.select().from(currencies).all();
    const categoryRows = tx.select().from(categories).all();
    return {
      accounts: new Map(accountRows.map((row) => [row.id, row])),
      currencies: new Map(currencyRows.map((row) => [row.code, { code: row.code, minorUnit: row.minorUnit, isActive: row.isActive }])),
      categories: new Map(categoryRows.map((row) => [row.id, { id: row.id, kind: row.kind, isArchived: row.isArchived }])),
    };
  }
}
