import { Currency } from "../../domain/ledger/currency";
import { calculateAccountBalance } from "../../domain/ledger/posting";
import type {
  Account,
  JournalEntry,
  JournalLine,
  LedgerRepository,
} from "../../domain/ledger/repository";
import type {
  EarlyPaymentPolicy,
  Liability,
  LiabilityInstallment,
  LiabilityPayment,
  LiabilityRateChange,
  RepaymentStatus,
} from "../../domain/liability/liability";
import type { LiabilityRepository } from "../../domain/liability/repository";
import {
  calculateRepaymentSchedule,
  type RepaymentMethod,
} from "../../domain/liability/repayment-schedule";

export interface CreateLiabilityInput {
  name: string;
  liabilityAccountId: string;
  receivingAccountId: string;
  interestExpenseAccountId: string;
  principalMinor: bigint;
  annualRatePpm: bigint;
  repaymentMethod: RepaymentMethod;
  termMonths: number;
  startDate: string;
  firstDueDate: string;
  timezoneId?: string;
  earlyPaymentPolicy?: EarlyPaymentPolicy;
  decliningPrincipalMinor?: readonly bigint[];
}

export interface RecordLiabilityPaymentInput {
  liabilityId: string;
  sourceAccountId: string;
  amountMinor: bigint;
  feeMinor?: bigint;
  feeExpenseAccountId?: string;
  scheduleId?: string | null;
  paidAt?: string;
  idempotencyKey: string;
  note?: string | null;
}

export interface LiabilityServiceOptions {
  createId: () => string;
  now?: () => string;
}

function localDateAt(timestamp: string, timezoneId: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime()))
    throw new Error("Payment timestamp is invalid");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function allocateEvenly(total: bigint, count: number): bigint[] {
  if (count <= 0) return [];
  const divisor = BigInt(count);
  const base = total / divisor;
  const remainder = total % divisor;
  return Array.from(
    { length: count },
    (_, index) => base + (BigInt(index) < remainder ? 1n : 0n),
  );
}

function installmentStatus(
  principalPaid: bigint,
  interestPaid: bigint,
  principalDue: bigint,
  interestDue: bigint,
): RepaymentStatus {
  if (principalPaid === principalDue && interestPaid === interestDue)
    return "PAID";
  if (principalPaid > 0n || interestPaid > 0n) return "PARTIALLY_PAID";
  return "UPCOMING";
}

export class LiabilityService {
  private readonly now: () => string;

  constructor(
    private readonly repository: LiabilityRepository,
    private readonly ledger: LedgerRepository,
    private readonly options: LiabilityServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async create(input: CreateLiabilityInput): Promise<Liability> {
    const name = input.name.trim();
    if (!name) throw new Error("Liability name is required");
    if (input.principalMinor <= 0n)
      throw new Error("Loan principal must be positive");
    if (input.annualRatePpm < 0n || input.annualRatePpm > 10_000_000n) {
      throw new Error("Annual APR must be between 0% and 1000%");
    }
    const [liabilityAccount, receivingAccount, interestAccount] =
      await Promise.all([
        this.requireAccount(input.liabilityAccountId),
        this.requireAccount(input.receivingAccountId),
        this.requireAccount(input.interestExpenseAccountId),
      ]);
    if (liabilityAccount.type !== "LIABILITY")
      throw new Error("Loan account must have LIABILITY type");
    if (receivingAccount.type !== "ASSET")
      throw new Error("Loan proceeds must be received by an ASSET account");
    if (interestAccount.type !== "EXPENSE")
      throw new Error("Interest counterpart must have EXPENSE type");
    const currencyCode = liabilityAccount.currencyCode;
    const currencyRecord = (await this.ledger.listCurrencies(false)).find(
      (item) => item.code === currencyCode,
    );
    if (!currencyRecord)
      throw new Error("Liability account currency is unavailable");
    const liabilityBalance = calculateAccountBalance(
      liabilityAccount,
      await this.ledger.listPostedJournalLinesForAccount(liabilityAccount.id),
      new Currency(currencyRecord.code, currencyRecord.minorUnit),
    ).minorUnits;
    if (liabilityBalance !== 0n)
      throw new Error(
        "A new liability must use an account with zero Ledger balance",
      );
    if (
      [receivingAccount, interestAccount].some(
        (account) => account.currencyCode !== currencyCode,
      )
    ) {
      throw new Error(
        "Loan, receiving and interest accounts must use the same currency",
      );
    }
    const baseCurrency = await this.ledger.getBaseCurrencyCode();
    if (baseCurrency !== currencyCode) {
      throw new Error(
        "Liability MVP posting currently requires accounts in the Ledger base currency",
      );
    }
    const timezoneId =
      input.timezoneId ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      "UTC";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezoneId });
    } catch {
      throw new Error("Timezone must be a valid IANA timezone");
    }
    const timestamp = this.now();
    const id = this.options.createId();
    const liability: Liability = {
      id,
      name,
      liabilityAccountId: liabilityAccount.id,
      interestExpenseAccountId: interestAccount.id,
      currencyCode,
      originalPrincipalMinor: input.principalMinor,
      outstandingPrincipalMinor: input.principalMinor,
      annualRatePpm: input.annualRatePpm,
      repaymentMethod: input.repaymentMethod,
      termMonths: input.termMonths,
      startDate: input.startDate,
      firstDueDate: input.firstDueDate,
      timezoneId,
      earlyPaymentPolicy:
        input.earlyPaymentPolicy ?? "KEEP_MATURITY_REDUCE_INSTALLMENT",
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
      paidOffAt: null,
    };
    const schedule = calculateRepaymentSchedule({
      principalMinor: input.principalMinor,
      annualRatePpm: input.annualRatePpm,
      termMonths: input.termMonths,
      method: input.repaymentMethod,
      startDate: input.startDate,
      firstDueDate: input.firstDueDate,
      decliningPrincipalMinor: input.decliningPrincipalMinor,
    });
    const installments = schedule.installments.map((item) => ({
      ...item,
      id: this.options.createId(),
      liabilityId: id,
      annualRatePpm: input.annualRatePpm,
      principalPaidMinor: 0n,
      interestPaidMinor: 0n,
      status: "UPCOMING" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const journalEntry = this.createJournalEntry(
      `liability:origination:${id}`,
      `Loan received: ${name}`,
      timestamp,
      baseCurrency!,
    );
    const journalLines = [
      this.createLine(
        journalEntry.id,
        1,
        receivingAccount,
        "DEBIT",
        input.principalMinor,
        timestamp,
        "Loan proceeds received",
      ),
      this.createLine(
        journalEntry.id,
        2,
        liabilityAccount,
        "CREDIT",
        input.principalMinor,
        timestamp,
        "Initial loan principal",
      ),
    ];
    await this.repository.createLiability({
      liability,
      installments,
      journal: { journalEntry, journalLines },
    });
    return liability;
  }

  async list(includeArchived = false): Promise<Liability[]> {
    return this.repository.list(includeArchived);
  }

  async getDetail(id: string) {
    const liability = await this.requireLiability(id);
    const installments = await this.repository.listInstallments(id);
    const payments = await this.repository.listPayments(id);
    const [reconciliation, rateChanges] = await Promise.all([
      this.repository.reconcile(id),
      this.repository.listRateChanges(id),
    ]);
    return { liability, installments, payments, rateChanges, reconciliation };
  }

  async syncStatuses(): Promise<void> {
    for (const liability of await this.repository.list()) {
      if (liability.status !== "ACTIVE") continue;
      await this.repository.syncStatuses(
        liability.id,
        localDateAt(this.now(), liability.timezoneId),
      );
    }
  }

  async changeApr(
    liabilityId: string,
    annualRatePpm: bigint,
    reason?: string | null,
  ): Promise<LiabilityRateChange> {
    if (annualRatePpm < 0n || annualRatePpm > 10_000_000n) {
      throw new Error("Annual APR must be between 0% and 1000%");
    }
    const liability = await this.requireLiability(liabilityId);
    if (liability.status !== "ACTIVE") throw new Error("Only an ACTIVE liability can change APR");
    const localDate = localDateAt(this.now(), liability.timezoneId);
    const schedule = await this.repository.listInstallments(liabilityId);
    const pastOutstanding = schedule.filter(
      (item) => item.dueDate < localDate && item.status !== "PAID" && item.status !== "CANCELLED",
    );
    if (pastOutstanding.length) {
      throw new Error("Settle overdue installments before changing APR");
    }
    const future = schedule.filter(
      (item) => item.dueDate >= localDate && item.status !== "PAID" && item.status !== "CANCELLED",
    );
    if (!future.length) throw new Error("There is no future installment for the new APR to take effect");
    const first = future[0]!;
    if (first.principalPaidMinor > 0n || first.interestPaidMinor > 0n) {
      throw new Error("The next installment already has payment allocations");
    }
    const currentChanges = await this.repository.listRateChanges(liabilityId);
    const effectiveNow = currentChanges
      .filter((item) => item.effectiveDate <= first.periodStart)
      .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
      .at(-1)?.annualRatePpm ?? liability.annualRatePpm;
    if (effectiveNow === annualRatePpm) throw new Error("New APR matches the currently effective APR");
    const principal = first.openingPrincipalMinor;
    const termMonths = future.length;
    const declining = liability.repaymentMethod === "DECLINING"
      ? future.map((item) => item.principalDueMinor)
      : undefined;
    const calculated = calculateRepaymentSchedule({
      principalMinor: principal,
      annualRatePpm,
      termMonths,
      method: liability.repaymentMethod,
      startDate: first.periodStart,
      firstDueDate: first.dueDate,
      decliningPrincipalMinor: declining,
    });
    const timestamp = this.now();
    const nextSequence = Math.max(...schedule.map((item) => item.sequence), 0) + 1;
    const change: LiabilityRateChange = {
      id: this.options.createId(),
      liabilityId,
      annualRatePpm,
      effectiveDate: first.periodStart,
      reason: reason?.trim() || null,
      createdAt: timestamp,
    };
    const replacements: LiabilityInstallment[] = calculated.installments.map((item) => ({
      ...item,
      id: this.options.createId(),
      liabilityId,
      sequence: nextSequence + item.sequence - 1,
      annualRatePpm,
      principalPaidMinor: 0n,
      interestPaidMinor: 0n,
      status: "UPCOMING",
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    await this.repository.addRateChange(change, replacements);
    return change;
  }

  async recordPayment(
    input: RecordLiabilityPaymentInput,
  ): Promise<LiabilityPayment> {
    const key = input.idempotencyKey.trim();
    if (!key) throw new Error("Payment idempotency key is required");
    const existing = (
      await this.repository.listPayments(input.liabilityId)
    ).find((item) => item.idempotencyKey === key);
    if (existing) return existing;
    if (input.amountMinor <= 0n)
      throw new Error("Payment amount must be positive");
    const feeMinor = input.feeMinor ?? 0n;
    if (feeMinor < 0n) throw new Error("Fee cannot be negative");

    const liability = await this.requireLiability(input.liabilityId);
    if (liability.status !== "ACTIVE")
      throw new Error("Only an ACTIVE liability can be paid");
    const [source, feeAccount] = await Promise.all([
      this.requireAccount(input.sourceAccountId),
      input.feeMinor && input.feeMinor > 0n
        ? this.requireAccount(input.feeExpenseAccountId ?? "")
        : Promise.resolve(null),
    ]);
    if (
      source.type !== "ASSET" ||
      source.currencyCode !== liability.currencyCode
    ) {
      throw new Error(
        "Payment source must be an ASSET account in the liability currency",
      );
    }
    if (
      feeMinor > 0n &&
      (!feeAccount ||
        feeAccount.type !== "EXPENSE" ||
        feeAccount.currencyCode !== liability.currencyCode)
    ) {
      throw new Error(
        "A positive fee requires an EXPENSE account in the liability currency",
      );
    }
    const baseCurrency = await this.ledger.getBaseCurrencyCode();
    if (baseCurrency !== liability.currencyCode) {
      throw new Error(
        "Liability payments currently require the Ledger base currency",
      );
    }

    const paidAt = input.paidAt ?? this.now();
    const localDate = localDateAt(paidAt, liability.timezoneId);
    await this.repository.syncStatuses(liability.id, localDate);
    const schedules = await this.repository.listInstallments(liability.id);
    const due = schedules.filter(
      (item) =>
        item.dueDate <= localDate &&
        item.status !== "PAID" &&
        item.status !== "CANCELLED",
    );
    if (input.scheduleId) {
      const selected = due.find((item) => item.id === input.scheduleId);
      if (!selected)
        throw new Error(
          "Selected installment is not due or does not belong to this liability",
        );
      due.sort((a, b) => {
        if (a.id === b.id) return 0;
        if (a.id === selected.id) return -1;
        if (b.id === selected.id) return 1;
        return a.sequence - b.sequence;
      });
    } else {
      due.sort((a, b) => a.sequence - b.sequence);
    }

    let remaining = input.amountMinor;
    let interestPaid = 0n;
    let principalPaid = 0n;
    const updates = new Map<string, LiabilityInstallment>();
    for (const item of due) {
      if (remaining <= 0n) break;
      const interestLeft = item.interestDueMinor - item.interestPaidMinor;
      const allocated = remaining < interestLeft ? remaining : interestLeft;
      if (allocated > 0n) {
        const next = {
          ...item,
          interestPaidMinor: item.interestPaidMinor + allocated,
        };
        updates.set(item.id, next);
        interestPaid += allocated;
        remaining -= allocated;
      }
    }
    for (const item of due) {
      if (remaining <= 0n) break;
      const current = updates.get(item.id) ?? item;
      const principalLeft =
        current.principalDueMinor - current.principalPaidMinor;
      const allocated = remaining < principalLeft ? remaining : principalLeft;
      if (allocated > 0n) {
        updates.set(item.id, {
          ...current,
          principalPaidMinor: current.principalPaidMinor + allocated,
        });
        principalPaid += allocated;
        remaining -= allocated;
      }
    }
    const outstanding = liability.outstandingPrincipalMinor;
    if (remaining > outstanding - principalPaid) {
      throw new Error("Payment exceeds all outstanding interest and principal");
    }
    const extraPrincipal = remaining;
    principalPaid += extraPrincipal;
    remaining = 0n;
    if (principalPaid > outstanding)
      throw new Error("Principal payment exceeds outstanding balance");

    const timestamp = this.now();
    const installmentUpdates: LiabilityInstallment[] = [];
    for (const item of updates.values()) {
      const principalNow = item.principalPaidMinor;
      const interestNow = item.interestPaidMinor;
      installmentUpdates.push({
        ...item,
        status: installmentStatus(
          principalNow,
          interestNow,
          item.principalDueMinor,
          item.interestDueMinor,
        ),
        updatedAt: timestamp,
      });
    }

    const future = schedules.filter(
      (item) =>
        item.dueDate > localDate &&
        item.status !== "CANCELLED" &&
        item.status !== "PAID",
    );
    const newInstallments: LiabilityInstallment[] = [];
    if (
      (extraPrincipal > 0n || outstanding - principalPaid === 0n) &&
      future.length > 0
    ) {
      for (const item of future)
        installmentUpdates.push({
          ...item,
          status: "CANCELLED",
          updatedAt: timestamp,
        });
      const newBalance = outstanding - principalPaid;
      if (newBalance > 0n) {
        const nextDueDate = future[0]!.dueDate;
        let newTerm = future.length;
        if (liability.earlyPaymentPolicy === "KEEP_INSTALLMENT_SHORTEN_TERM") {
          const target = future[0]!.totalDueMinor;
          let selectedTerm = 1;
          for (let months = 1; months <= future.length; months += 1) {
            const candidatePrincipal =
              liability.repaymentMethod === "DECLINING"
                ? allocateEvenly(newBalance, months)
                : undefined;
            const candidate = calculateRepaymentSchedule({
              principalMinor: newBalance,
              annualRatePpm: liability.annualRatePpm,
              termMonths: months,
              method: liability.repaymentMethod,
              startDate: localDate,
              firstDueDate: nextDueDate,
              decliningPrincipalMinor: candidatePrincipal,
            });
            if (candidate.installments[0]!.totalDueMinor >= target) {
              selectedTerm = months;
            } else {
              break;
            }
          }
          newTerm = selectedTerm;
        }
        const declining =
          liability.repaymentMethod === "DECLINING"
            ? allocateEvenly(newBalance, newTerm)
            : undefined;
        const recalculated = calculateRepaymentSchedule({
          principalMinor: newBalance,
          annualRatePpm: liability.annualRatePpm,
          termMonths: newTerm,
          method: liability.repaymentMethod,
          startDate: localDate,
          firstDueDate: nextDueDate,
          decliningPrincipalMinor: declining,
        });
        const nextSequence =
          Math.max(...schedules.map((item) => item.sequence), 0) + 1;
        for (const item of recalculated.installments) {
          newInstallments.push({
            ...item,
            id: this.options.createId(),
            liabilityId: liability.id,
            sequence: nextSequence + item.sequence - 1,
            annualRatePpm: liability.annualRatePpm,
            principalPaidMinor: 0n,
            interestPaidMinor: 0n,
            status: "UPCOMING",
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }
    }

    const paymentTotal = input.amountMinor + feeMinor;
    const paymentId = this.options.createId();
    const journalEntry = this.createJournalEntry(
      key,
      `Loan payment: ${liability.name}`,
      paidAt,
      baseCurrency!,
    );
    const journalLines: JournalLine[] = [];
    const add = (
      account: Account,
      side: "DEBIT" | "CREDIT",
      amount: bigint,
      memo: string,
    ) => {
      if (amount > 0n)
        journalLines.push(
          this.createLine(
            journalEntry.id,
            journalLines.length + 1,
            account,
            side,
            amount,
            timestamp,
            memo,
          ),
        );
    };
    const liabilityAccount = await this.requireAccount(
      liability.liabilityAccountId,
    );
    const interestAccount = await this.requireAccount(
      liability.interestExpenseAccountId,
    );
    add(liabilityAccount, "DEBIT", principalPaid, "Principal repayment");
    add(interestAccount, "DEBIT", interestPaid, "Interest expense");
    if (feeMinor > 0n && feeAccount)
      add(feeAccount, "DEBIT", feeMinor, "Early repayment fee");
    add(source, "CREDIT", paymentTotal, "Payment source");
    const payment: LiabilityPayment = {
      id: paymentId,
      liabilityId: liability.id,
      scheduleId: input.scheduleId ?? null,
      sourceAccountId: source.id,
      journalEntryId: journalEntry.id,
      idempotencyKey: key,
      paidAt,
      principalPaidMinor: principalPaid,
      interestPaidMinor: interestPaid,
      feePaidMinor: feeMinor,
      note: input.note?.trim() || null,
      createdAt: timestamp,
    };
    return this.repository.commitPayment({
      payment,
      journalEntry,
      journalLines,
      outstandingPrincipalMinor: outstanding - principalPaid,
      installmentUpdates,
      newInstallments,
    });
  }

  async archive(id: string): Promise<void> {
    const liability = await this.requireLiability(id);
    if (
      liability.status !== "PAID_OFF" ||
      liability.outstandingPrincipalMinor !== 0n
    ) {
      throw new Error(
        "Liability can only be archived after principal is fully paid",
      );
    }
    const detail = await this.getDetail(id);
    if (
      detail.installments.some(
        (item) => item.status !== "PAID" && item.status !== "CANCELLED",
      )
    ) {
      throw new Error(
        "Liability has unpaid installments and cannot be archived",
      );
    }
    if (detail.reconciliation.differenceMinor !== 0n) {
      throw new Error(
        "Ledger reconciliation must be balanced before archiving",
      );
    }
    await this.repository.archive(id, this.now());
  }

  async reconcile(id: string) {
    return this.repository.reconcile(id);
  }

  private createJournalEntry(
    idempotencyKey: string,
    description: string,
    occurredAt: string,
    baseCurrencyCode: string,
  ): JournalEntry {
    const timestamp = this.now();
    return {
      id: this.options.createId(),
      occurredAt,
      description,
      status: "POSTED",
      baseCurrencyCode,
      idempotencyKey,
      reversalOfId: null,
      replacementOfId: null,
      transactionKind: "ADJUSTMENT",
      categoryId: null,
      createdAt: timestamp,
      postedAt: timestamp,
    };
  }

  private createLine(
    entryId: string,
    lineNumber: number,
    account: Account,
    side: "DEBIT" | "CREDIT",
    amountMinor: bigint,
    createdAt: string,
    memo: string,
  ): JournalLine {
    return {
      id: this.options.createId(),
      entryId,
      lineNumber,
      accountId: account.id,
      currencyCode: account.currencyCode,
      side,
      amountMinor,
      fxRateNumerator: "1",
      fxRateDenominator: "1",
      baseAmountMinor: amountMinor,
      memo,
      createdAt,
    };
  }

  private async requireAccount(id: string): Promise<Account> {
    const account = await this.ledger.findAccountById(id);
    if (!account || account.isArchived)
      throw new Error(`Active Ledger account does not exist: ${id}`);
    return account;
  }

  private async requireLiability(id: string): Promise<Liability> {
    const liability = await this.repository.findById(id);
    if (!liability) throw new Error(`Liability does not exist: ${id}`);
    return liability;
  }
}
