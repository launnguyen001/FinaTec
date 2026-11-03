import { LiabilityService } from "./liability-service";
import type {
  Liability,
  LiabilityInstallment,
  LiabilityPayment,
} from "../../domain/liability/liability";
import type {
  Account,
  CurrencyRecord,
  LedgerRepository,
} from "../../domain/ledger/repository";
import type { LiabilityRepository } from "../../domain/liability/repository";
import { calculateRepaymentSchedule } from "../../domain/liability/repayment-schedule";

const timestamp = "2026-11-04T12:00:00.000Z";
const currency: CurrencyRecord = {
  code: "VND",
  name: "Vietnamese dong",
  minorUnit: 0,
  isActive: true,
  createdAt: timestamp,
};

const accounts: Account[] = [
  {
    id: "loan",
    name: "Loan",
    type: "LIABILITY",
    currencyCode: "VND",
    isSystem: false,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "cash-in",
    name: "Cash received",
    type: "ASSET",
    currencyCode: "VND",
    isSystem: false,
    isArchived: false,
    subtype: "CASH",
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "interest-expense",
    name: "Interest expense",
    type: "EXPENSE",
    currencyCode: "VND",
    isSystem: false,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  {
    id: "cash-out",
    name: "Cash paid",
    type: "ASSET",
    currencyCode: "VND",
    isSystem: false,
    isArchived: false,
    subtype: "CASH",
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

function createHarness(
  liability: Liability,
  installments: LiabilityInstallment[] = [],
) {
  let id = 0;
  const createId = () => `test-id-${++id}`;
  const repository = {
    createLiability: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(liability),
    list: jest.fn().mockResolvedValue([liability]),
    listInstallments: jest.fn().mockResolvedValue(installments),
    listPayments: jest.fn().mockResolvedValue([]),
    commitPayment: jest.fn(
      async (input: { payment: LiabilityPayment }) => input.payment,
    ),
    syncStatuses: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    reconcile: jest.fn().mockResolvedValue({
      ledgerPrincipalMinor: liability.outstandingPrincipalMinor,
      recordedPrincipalMinor: liability.outstandingPrincipalMinor,
      differenceMinor: 0n,
    }),
  } as unknown as jest.Mocked<LiabilityRepository>;
  const ledger = {
    getBaseCurrencyCode: jest.fn().mockResolvedValue("VND"),
    listCurrencies: jest.fn().mockResolvedValue([currency]),
    findAccountById: jest.fn(
      async (id: string) => accounts.find((item) => item.id === id) ?? null,
    ),
    listPostedJournalLinesForAccount: jest.fn().mockResolvedValue([]),
  } as unknown as LedgerRepository;
  const service = new LiabilityService(repository, ledger, {
    createId,
    now: () => timestamp,
  });
  return { service, repository, ledger };
}

function baseLiability(overrides: Partial<Liability> = {}): Liability {
  return {
    id: "liability-1",
    name: "Personal loan",
    liabilityAccountId: "loan",
    interestExpenseAccountId: "interest-expense",
    currencyCode: "VND",
    originalPrincipalMinor: 100_000n,
    outstandingPrincipalMinor: 100_000n,
    annualRatePpm: 120_000n,
    repaymentMethod: "EQUAL_PRINCIPAL",
    termMonths: 3,
    startDate: "2026-11-01",
    firstDueDate: "2026-12-01",
    timezoneId: "UTC",
    earlyPaymentPolicy: "KEEP_MATURITY_REDUCE_INSTALLMENT",
    status: "ACTIVE",
    createdAt: timestamp,
    updatedAt: timestamp,
    paidOffAt: null,
    ...overrides,
  };
}

function installment(
  sequence: number,
  dueDate: string,
  principalDueMinor: bigint,
  interestDueMinor: bigint,
): LiabilityInstallment {
  return {
    id: `schedule-${sequence}`,
    liabilityId: "liability-1",
    sequence,
    periodStart: sequence === 1 ? "2026-11-01" : "2026-12-01",
    dueDate,
    openingPrincipalMinor: 100_000n,
    principalDueMinor,
    interestDueMinor,
    totalDueMinor: principalDueMinor + interestDueMinor,
    closingPrincipalMinor: 100_000n - principalDueMinor,
    annualRatePpm: 120_000n,
    principalPaidMinor: 0n,
    interestPaidMinor: 0n,
    status: "UPCOMING",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("LiabilityService", () => {
  it("originates a loan with a balanced ASSET debit and LIABILITY credit", async () => {
    const { service, repository } = createHarness(baseLiability());
    const created = await service.create({
      name: "Car loan",
      liabilityAccountId: "loan",
      receivingAccountId: "cash-in",
      interestExpenseAccountId: "interest-expense",
      principalMinor: 120_000n,
      annualRatePpm: 120_000n,
      repaymentMethod: "EQUAL_PRINCIPAL",
      termMonths: 3,
      startDate: "2026-11-01",
      firstDueDate: "2026-12-01",
    });

    const commit = (repository.createLiability as jest.Mock).mock.calls[0]![0];
    expect(created.outstandingPrincipalMinor).toBe(120_000n);
    expect(commit.installments).toHaveLength(3);
    expect(
      commit.journal.journalLines.map(
        (line: { accountId: string; side: string; amountMinor: bigint }) => ({
          accountId: line.accountId,
          side: line.side,
          amountMinor: line.amountMinor,
        }),
      ),
    ).toEqual([
      { accountId: "cash-in", side: "DEBIT", amountMinor: 120_000n },
      { accountId: "loan", side: "CREDIT", amountMinor: 120_000n },
    ]);
  });

  it("allocates a partial payment to due interest before principal", async () => {
    const current = baseLiability();
    const due = installment(1, "2026-11-01", 10_000n, 1_000n);
    const { service, repository } = createHarness(current, [due]);

    const payment = await service.recordPayment({
      liabilityId: current.id,
      sourceAccountId: "cash-out",
      amountMinor: 5_000n,
      paidAt: timestamp,
      idempotencyKey: "payment-partial-1",
    });

    const commit = (repository.commitPayment as jest.Mock).mock.calls[0]![0];
    expect(payment.principalPaidMinor).toBe(4_000n);
    expect(payment.interestPaidMinor).toBe(1_000n);
    expect(commit.outstandingPrincipalMinor).toBe(96_000n);
    expect(commit.installmentUpdates[0]).toMatchObject({
      principalPaidMinor: 4_000n,
      interestPaidMinor: 1_000n,
      status: "PARTIALLY_PAID",
    });
    expect(
      commit.journalLines.map(
        (line: { accountId: string; side: string; amountMinor: bigint }) => ({
          accountId: line.accountId,
          side: line.side,
          amountMinor: line.amountMinor,
        }),
      ),
    ).toEqual([
      { accountId: "loan", side: "DEBIT", amountMinor: 4_000n },
      { accountId: "interest-expense", side: "DEBIT", amountMinor: 1_000n },
      { accountId: "cash-out", side: "CREDIT", amountMinor: 5_000n },
    ]);
  });

  it("cancels the old future schedule and rebuilds it after an early principal payment", async () => {
    const current = baseLiability();
    const calculated = calculateRepaymentSchedule({
      principalMinor: current.outstandingPrincipalMinor,
      annualRatePpm: current.annualRatePpm,
      termMonths: 3,
      method: current.repaymentMethod,
      startDate: current.startDate,
      firstDueDate: current.firstDueDate,
    });
    const schedule = calculated.installments.map((item) => ({
      ...item,
      id: `schedule-${item.sequence}`,
      liabilityId: current.id,
      annualRatePpm: current.annualRatePpm,
      principalPaidMinor: 0n,
      interestPaidMinor: 0n,
      status: "UPCOMING" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const { service, repository } = createHarness(current, schedule);
    await service.recordPayment({
      liabilityId: current.id,
      sourceAccountId: "cash-out",
      amountMinor: 20_000n,
      paidAt: timestamp,
      idempotencyKey: "payment-early-1",
    });

    const commit = (repository.commitPayment as jest.Mock).mock.calls[0]![0];
    expect(commit.outstandingPrincipalMinor).toBe(80_000n);
    expect(commit.installmentUpdates).toHaveLength(3);
    expect(
      commit.installmentUpdates.every(
        (item: LiabilityInstallment) => item.status === "CANCELLED",
      ),
    ).toBe(true);
    expect(commit.newInstallments).toHaveLength(3);
    expect(
      commit.newInstallments.reduce(
        (sum: bigint, item: LiabilityInstallment) =>
          sum + item.principalDueMinor,
        0n,
      ),
    ).toBe(80_000n);
    expect(commit.newInstallments[0]!.sequence).toBe(4);
  });

  it("cancels all future installments when an early payment pays the loan off", async () => {
    const current = baseLiability();
    const calculated = calculateRepaymentSchedule({
      principalMinor: current.outstandingPrincipalMinor,
      annualRatePpm: current.annualRatePpm,
      termMonths: 3,
      method: current.repaymentMethod,
      startDate: current.startDate,
      firstDueDate: current.firstDueDate,
    });
    const schedule = calculated.installments.map((item) => ({
      ...item,
      id: `schedule-${item.sequence}`,
      liabilityId: current.id,
      annualRatePpm: current.annualRatePpm,
      principalPaidMinor: 0n,
      interestPaidMinor: 0n,
      status: "UPCOMING" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const { service, repository } = createHarness(current, schedule);
    await service.recordPayment({
      liabilityId: current.id,
      sourceAccountId: "cash-out",
      amountMinor: current.outstandingPrincipalMinor,
      paidAt: timestamp,
      idempotencyKey: "payment-early-full-payoff",
    });

    const commit = (repository.commitPayment as jest.Mock).mock.calls[0]![0];
    expect(commit.outstandingPrincipalMinor).toBe(0n);
    expect(commit.installmentUpdates).toHaveLength(3);
    expect(
      commit.installmentUpdates.every(
        (item: LiabilityInstallment) => item.status === "CANCELLED",
      ),
    ).toBe(true);
    expect(commit.newInstallments).toHaveLength(0);
  });

  it("shortens the remaining term when the selected early-payment policy keeps installment size", async () => {
    const current = baseLiability({
      earlyPaymentPolicy: "KEEP_INSTALLMENT_SHORTEN_TERM",
    });
    const calculated = calculateRepaymentSchedule({
      principalMinor: current.outstandingPrincipalMinor,
      annualRatePpm: current.annualRatePpm,
      termMonths: 3,
      method: current.repaymentMethod,
      startDate: current.startDate,
      firstDueDate: current.firstDueDate,
    });
    const schedule = calculated.installments.map((item) => ({
      ...item,
      id: `schedule-${item.sequence}`,
      liabilityId: current.id,
      annualRatePpm: current.annualRatePpm,
      principalPaidMinor: 0n,
      interestPaidMinor: 0n,
      status: "UPCOMING" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const { service, repository } = createHarness(current, schedule);
    await service.recordPayment({
      liabilityId: current.id,
      sourceAccountId: "cash-out",
      amountMinor: 20_000n,
      paidAt: timestamp,
      idempotencyKey: "payment-early-shorter-term",
    });

    const commit = (repository.commitPayment as jest.Mock).mock.calls[0]![0];
    expect(commit.outstandingPrincipalMinor).toBe(80_000n);
    expect(commit.newInstallments).toHaveLength(2);
    expect(
      commit.newInstallments.reduce(
        (sum: bigint, item: LiabilityInstallment) =>
          sum + item.principalDueMinor,
        0n,
      ),
    ).toBe(80_000n);
  });

  it("returns an existing payment for the same idempotency key", async () => {
    const current = baseLiability();
    const existing: LiabilityPayment = {
      id: "payment-existing",
      liabilityId: current.id,
      scheduleId: null,
      sourceAccountId: "cash-out",
      journalEntryId: "journal-existing",
      idempotencyKey: "payment-retry",
      paidAt: timestamp,
      principalPaidMinor: 5_000n,
      interestPaidMinor: 0n,
      feePaidMinor: 0n,
      note: null,
      createdAt: timestamp,
    };
    const { service, repository } = createHarness(current);
    (repository.listPayments as jest.Mock).mockResolvedValue([existing]);

    await expect(
      service.recordPayment({
        liabilityId: current.id,
        sourceAccountId: "cash-out",
        amountMinor: 5_000n,
        idempotencyKey: "payment-retry",
      }),
    ).resolves.toBe(existing);
    expect(repository.commitPayment).not.toHaveBeenCalled();
  });
});
