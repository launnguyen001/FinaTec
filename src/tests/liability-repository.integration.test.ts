import { LiabilityService } from "../application/liability/liability-service";
import type { Account, AccountType } from "../domain/ledger/repository";
import { SqliteLedgerRepository } from "../infrastructure/database/sqlite-ledger-repository";
import { SqliteLiabilityRepository } from "../infrastructure/database/sqlite-liability-repository";
import {
  createRealSqliteTestDatabase,
  openRealSqliteTestDatabase,
} from "./helpers/real-sqlite";

const timestamp = "2026-01-15T12:00:00.000Z";

function account(id: string, type: AccountType): Account {
  return {
    id,
    name: id,
    type,
    currencyCode: "VND",
    isSystem: false,
    isArchived: false,
    subtype: type === "ASSET" ? "CASH" : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function createLiabilityFixture(
  database: Awaited<ReturnType<typeof createRealSqliteTestDatabase>>,
  repaymentMethod: "EQUAL_PRINCIPAL" | "INTEREST_ONLY" = "EQUAL_PRINCIPAL",
) {
  const ledger = new SqliteLedgerRepository(database.db);
  const repository = new SqliteLiabilityRepository(database.db);
  let nextId = 0;
  const service = new LiabilityService(repository, ledger, {
    now: () => timestamp,
    createId: () => `liability-test-${++nextId}`,
  });
  await ledger.setBaseCurrencyCode("VND", timestamp);
  await ledger.createAccount(account("liability-test-cash", "ASSET"));
  await ledger.createAccount(account("liability-test-loan", "LIABILITY"));
  await ledger.createAccount(account("liability-test-interest", "EXPENSE"));
  const liability = await service.create({
    name: "SQLite early repayment fixture",
    liabilityAccountId: "liability-test-loan",
    receivingAccountId: "liability-test-cash",
    interestExpenseAccountId: "liability-test-interest",
    principalMinor: 100_000n,
    annualRatePpm: 120_000n,
    repaymentMethod,
    termMonths: 3,
    startDate: "2026-01-01",
    firstDueDate: "2026-02-01",
    timezoneId: "UTC",
    earlyPaymentPolicy: "KEEP_MATURITY_REDUCE_INSTALLMENT",
  });
  return { ledger, repository, service, liability };
}

describe("SQLite liability payment repository", () => {
  it("commits replacement installments before their schedule audit rows", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      const { ledger, repository, service, liability } =
        await createLiabilityFixture(database);
      const foreignKeys = database.raw.prepare("PRAGMA foreign_keys").get() as {
        foreign_keys: number;
      };
      expect(foreignKeys.foreign_keys).toBe(1);

      const payment = await service.recordPayment({
        liabilityId: liability.id,
        sourceAccountId: "liability-test-cash",
        amountMinor: 20_000n,
        paidAt: timestamp,
        idempotencyKey: "sqlite-early-principal",
      });
      const detail = await service.getDetail(liability.id);
      const scheduleChanges = database.raw
        .prepare(
          `SELECT installment_id AS installmentId, action
           FROM liability_payment_schedule_changes
           WHERE payment_id = ? ORDER BY action, installment_id`,
        )
        .all(payment.id) as { installmentId: string; action: string }[];
      const createdInstallmentIds = scheduleChanges
        .filter((change) => change.action === "CREATED")
        .map((change) => change.installmentId);
      const persistedInstallments = database.raw
        .prepare("SELECT id FROM liability_installments WHERE id IN (?, ?, ?)")
        .all(...createdInstallmentIds) as { id: string }[];
      const persistedPayment = await repository.findPaymentById(payment.id);
      const journal = await ledger.findJournalEntryById(payment.journalEntryId);
      const journalLines = await ledger.listJournalLines(
        payment.journalEntryId,
      );

      expect(createdInstallmentIds).toHaveLength(3);
      expect(persistedInstallments.map((row) => row.id).sort()).toEqual(
        createdInstallmentIds.sort(),
      );
      expect(persistedPayment).toMatchObject({
        id: payment.id,
        journalEntryId: payment.journalEntryId,
        principalPaidMinor: 20_000n,
      });
      expect(journal?.status).toBe("POSTED");
      expect(journalLines.length).toBeGreaterThanOrEqual(2);
      expect(detail.liability.outstandingPrincipalMinor).toBe(80_000n);
      expect(
        detail.installments
          .filter((installment) => installment.status !== "CANCELLED")
          .reduce(
            (sum, installment) => sum + installment.principalDueMinor,
            0n,
          ),
      ).toBe(80_000n);
      expect(detail.reconciliation.differenceMinor).toBe(0n);
      expect(detail.reconciliation.scheduleDifferenceMinor).toBe(0n);
      expect(detail.reconciliation.paymentDifferenceMinor).toBe(0n);
      expect(detail.reconciliation.interestDifferenceMinor).toBe(0n);
      expect(database.raw.prepare("PRAGMA foreign_key_check").all()).toEqual(
        [],
      );

      // This is the old write order's failing operation: SQLite checks the
      // immediate FK as soon as an audit row references a not-yet-inserted row.
      expect(() =>
        database.raw
          .prepare(
            `INSERT INTO liability_payment_schedule_changes
             (id, payment_id, installment_id, action, previous_status)
             VALUES (?, ?, ?, 'CREATED', NULL)`,
          )
          .run("old-order-regression", payment.id, "not-inserted-yet"),
      ).toThrow(/FOREIGN KEY constraint failed/);
    } finally {
      database.close();
    }
  });

  it("reconciles interest ledger and reversal netting", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      const { service, liability } = await createLiabilityFixture(
        database,
        "INTEREST_ONLY",
      );
      const payment = await service.recordPayment({
        liabilityId: liability.id,
        sourceAccountId: "liability-test-cash",
        amountMinor: 1_000n,
        paidAt: "2026-02-01T12:00:00.000Z",
        idempotencyKey: "r3-ledger-interest-payment",
      });
      const afterPayment = await service.getDetail(liability.id);
      expect(
        afterPayment.reconciliation.paymentDerivedInterestPaidMinor,
      ).toBe(1_000n);
      expect(
        afterPayment.reconciliation.ledgerInterestPaidMinor,
      ).toBe(1_000n);
      expect(
        afterPayment.reconciliation.ledgerInterestDifferenceMinor,
      ).toBe(0n);

      await service.reversePayment(payment.id, "R3 reversal coverage");
      const afterReversal = await service.getDetail(liability.id);
      expect(afterReversal.reconciliation.scheduleInterestPaidMinor).toBe(0n);
      expect(
        afterReversal.reconciliation.paymentDerivedInterestPaidMinor,
      ).toBe(0n);
      expect(afterReversal.reconciliation.ledgerInterestPaidMinor).toBe(0n);
      expect(afterReversal.reconciliation.interestDifferenceMinor).toBe(0n);
      expect(
        afterReversal.reconciliation.ledgerInterestDifferenceMinor,
      ).toBe(0n);
      expect(
        database.raw.prepare("PRAGMA foreign_key_check").all(),
      ).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("detects correlated interest corruption against ledger", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      const { service, liability } = await createLiabilityFixture(
        database,
        "INTEREST_ONLY",
      );
      const payment = await service.recordPayment({
        liabilityId: liability.id,
        sourceAccountId: "liability-test-cash",
        amountMinor: 500n,
        paidAt: "2026-02-01T12:00:00.000Z",
        idempotencyKey: "r3-correlated-interest-corruption",
      });
      database.raw.exec("DROP TRIGGER liability_payments_no_update;");
      database.raw
        .prepare(
          "UPDATE liability_payments SET interest_paid_minor=1000 WHERE id=?",
        )
        .run(payment.id);
      database.raw
        .prepare(
          `UPDATE liability_installments
           SET interest_paid_minor = 1000, status = 'PAID'
           WHERE id = (
             SELECT installment_id FROM liability_payment_allocations
             WHERE payment_id = ? LIMIT 1
           )`,
        )
        .run(payment.id);

      const reconciliation = await service.reconcile(liability.id);
      expect(reconciliation.paymentDerivedInterestPaidMinor).toBe(1_000n);
      expect(reconciliation.scheduleInterestPaidMinor).toBe(1_000n);
      expect(reconciliation.interestDifferenceMinor).toBe(0n);
      expect(reconciliation.ledgerInterestPaidMinor).toBe(500n);
      expect(reconciliation.ledgerInterestDifferenceMinor).toBe(-500n);
      expect(
        database.raw.prepare("PRAGMA foreign_key_check").all(),
      ).toEqual([]);
    } finally {
      database.close();
    }
  });

  it("prevents concurrent payments from allocating the same installment interest twice", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      const { repository, service, liability } = await createLiabilityFixture(
        database,
        "INTEREST_ONLY",
      );
      const paidAt = "2026-02-01T12:00:00.000Z";
      const results = await Promise.allSettled([
        service.recordPayment({
          liabilityId: liability.id,
          sourceAccountId: "liability-test-cash",
          amountMinor: 1_000n,
          paidAt,
          idempotencyKey: "concurrent-interest-payment-a",
        }),
        service.recordPayment({
          liabilityId: liability.id,
          sourceAccountId: "liability-test-cash",
          amountMinor: 1_000n,
          paidAt,
          idempotencyKey: "concurrent-interest-payment-b",
        }),
      ]);

      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === "rejected"),
      ).toHaveLength(1);

      const payments = await repository.listPayments(liability.id);
      expect(payments).toHaveLength(1);
      expect(
        payments.reduce(
          (total, payment) => total + payment.interestPaidMinor,
          0n,
        ),
      ).toBe(1_000n);

      const detail = await service.getDetail(liability.id);
      expect(detail.liability.outstandingPrincipalMinor).toBe(100_000n);
      expect(
        detail.installments.find((item) => item.sequence === 1)
          ?.interestPaidMinor,
      ).toBe(1_000n);
      expect(detail.reconciliation.scheduleInterestPaidMinor).toBe(1_000n);
      expect(detail.reconciliation.paymentDerivedInterestPaidMinor).toBe(
        1_000n,
      );
      expect(detail.reconciliation.interestDifferenceMinor).toBe(0n);
      expect(database.raw.prepare("PRAGMA foreign_key_check").all()).toEqual(
        [],
      );
    } finally {
      database.close();
    }
  });

  it("does not overwrite PAID during concurrent status sync", async () => {
    const databasePath = `/tmp/ft-${Date.now()}-${Math.random()}.sqlite`;
    const database = await createRealSqliteTestDatabase(
      undefined,
      databasePath,
    );
    const secondConnection = openRealSqliteTestDatabase(databasePath);
    try {
      const { service, liability } = await createLiabilityFixture(
        database,
        "INTEREST_ONLY",
      );
      const secondLedger = new SqliteLedgerRepository(secondConnection.db);
      const secondRepository = new SqliteLiabilityRepository(
        secondConnection.db,
      );
      let nextSyncId = 0;
      const syncService = new LiabilityService(secondRepository, secondLedger, {
        now: () => "2026-02-02T12:00:00.000Z",
        createId: () => `liability-sync-test-${++nextSyncId}`,
      });

      // Start the overdue catch-up and the payment from separate SQLite
      // connections at the same time. Whichever writer commits first, status
      // sync must derive its result from current paid values, not a stale row.
      const results = await Promise.allSettled([
        syncService.syncStatuses(),
        service.recordPayment({
          liabilityId: liability.id,
          sourceAccountId: "liability-test-cash",
          amountMinor: 1_000n,
          paidAt: "2026-02-02T12:00:00.000Z",
          idempotencyKey: "two-connection-status-race",
        }),
      ]);

      expect(results[0]?.status).toBe("fulfilled");
      expect(results[1]?.status).toBe("fulfilled");

      const detail = await service.getDetail(liability.id);
      const firstInstallment = detail.installments.find(
        (item) => item.sequence === 1,
      );
      expect(firstInstallment).toMatchObject({
        status: "PAID",
        interestDueMinor: 1_000n,
        interestPaidMinor: 1_000n,
      });
      expect(detail.reconciliation.interestDifferenceMinor).toBe(0n);
      expect(database.raw.prepare("PRAGMA foreign_key_check").all()).toEqual(
        [],
      );
      expect(
        secondConnection.raw.prepare("PRAGMA foreign_key_check").all(),
      ).toEqual([]);
    } finally {
      secondConnection.close();
      database.close();
    }
  });

  it("preserves CANCELLED installments during status synchronization", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      const { repository, liability } = await createLiabilityFixture(database);
      const cancelledInstallment = database.raw
        .prepare(
          "SELECT id FROM liability_installments WHERE liability_id = ? ORDER BY sequence LIMIT 1",
        )
        .get(liability.id) as { id: string } | undefined;
      expect(cancelledInstallment).toBeDefined();

      database.raw
        .prepare(
          "UPDATE liability_installments SET status = 'CANCELLED' WHERE id = ?",
        )
        .run(cancelledInstallment!.id);

      await repository.syncStatuses(liability.id, "2026-12-31");

      const persisted = database.raw
        .prepare("SELECT status FROM liability_installments WHERE id = ?")
        .get(cancelledInstallment!.id) as { status: string };

      expect(persisted.status).toBe("CANCELLED");
    } finally {
      database.close();
    }
  });

  it("rolls back every payment write when a late transaction write fails", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      const { service, liability } = await createLiabilityFixture(database);
      const before = {
        entries: database.raw
          .prepare("SELECT COUNT(*) AS count FROM journal_entries")
          .get() as { count: number },
        lines: database.raw
          .prepare("SELECT COUNT(*) AS count FROM journal_lines")
          .get() as { count: number },
        installments: database.raw
          .prepare("SELECT COUNT(*) AS count FROM liability_installments")
          .get() as { count: number },
      };
      database.raw.exec(`
        CREATE TRIGGER fail_payment_after_schedule_writes
        BEFORE UPDATE OF outstanding_principal_minor ON liabilities
        BEGIN
          SELECT RAISE(ABORT, 'forced late payment failure');
        END;
      `);

      await expect(
        service.recordPayment({
          liabilityId: liability.id,
          sourceAccountId: "liability-test-cash",
          amountMinor: 20_000n,
          paidAt: timestamp,
          idempotencyKey: "sqlite-rollback-early-principal",
        }),
      ).rejects.toThrow(/forced late payment failure/);

      const detail = await service.getDetail(liability.id);
      const after = {
        entries: database.raw
          .prepare("SELECT COUNT(*) AS count FROM journal_entries")
          .get() as { count: number },
        lines: database.raw
          .prepare("SELECT COUNT(*) AS count FROM journal_lines")
          .get() as { count: number },
        installments: database.raw
          .prepare("SELECT COUNT(*) AS count FROM liability_installments")
          .get() as { count: number },
        payments: database.raw
          .prepare("SELECT COUNT(*) AS count FROM liability_payments")
          .get() as { count: number },
        allocations: database.raw
          .prepare(
            "SELECT COUNT(*) AS count FROM liability_payment_allocations",
          )
          .get() as { count: number },
        scheduleChanges: database.raw
          .prepare(
            "SELECT COUNT(*) AS count FROM liability_payment_schedule_changes",
          )
          .get() as { count: number },
      };

      expect(after.entries.count).toBe(before.entries.count);
      expect(after.lines.count).toBe(before.lines.count);
      expect(after.installments.count).toBe(before.installments.count);
      expect(after.payments.count).toBe(0);
      expect(after.allocations.count).toBe(0);
      expect(after.scheduleChanges.count).toBe(0);
      expect(detail.liability.outstandingPrincipalMinor).toBe(100_000n);
      expect(
        detail.installments.every((installment) =>
          ["UPCOMING", "DUE"].includes(installment.status),
        ),
      ).toBe(true);
      expect(database.raw.prepare("PRAGMA foreign_key_check").all()).toEqual(
        [],
      );
    } finally {
      database.close();
    }
  });
});
