import { Currency } from "../../domain/ledger/currency";
import { calculateAccountBalance } from "../../domain/ledger/posting";
import type { LedgerRepository } from "../../domain/ledger/repository";
import {
  calculateSimpleInterest,
  countActualDays,
  roundHalfUp,
  type InterestAccrual,
  type InterestAccrualKind,
  type InterestPlan,
  type InterestPlanStatus,
} from "../../domain/interest/interest";
import type { InterestRepository } from "../../domain/interest/repository";

export interface InterestServiceOptions {
  createId: () => string;
  now?: () => string;
  deviceTimeZone?: () => string;
}

export interface CreateInterestPlanInput {
  name: string;
  principalAccountId: string;
  interestIncomeAccountId: string;
  payoutAccountId?: string | null;
  annualRatePpm: bigint;
  compounding?: "SIMPLE" | "AFTER_CAPITALIZATION";
  postingFrequency: "MONTHLY" | "AT_MATURITY";
  startDate: string;
  maturityDate?: string | null;
  timezoneId?: string;
}

export class InterestService {
  private readonly now: () => string;
  private readonly deviceTimeZone: () => string;

  constructor(
    private readonly repository: InterestRepository,
    private readonly ledger: LedgerRepository,
    private readonly options: InterestServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.deviceTimeZone =
      options.deviceTimeZone ??
      (() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }

  async createPlan(input: CreateInterestPlanInput): Promise<InterestPlan> {
    const name = input.name.trim();
    if (!name) throw new Error("Interest plan name is required");
    if (input.annualRatePpm < 0n || input.annualRatePpm > 1_000_000_000n) {
      throw new Error("Annual APR must be between 0% and 1000%");
    }
    const maturityDate = input.maturityDate ?? null;
    countActualDays(input.startDate, maturityDate ?? this.nextDate(input.startDate));
    if (maturityDate && maturityDate <= input.startDate) {
      throw new Error("Maturity date must be after start date");
    }
    if (input.postingFrequency === "AT_MATURITY" && !maturityDate) {
      throw new Error("At-maturity posting requires a maturity date");
    }

    const principal = await this.requireAccount(input.principalAccountId);
    const income = await this.requireAccount(input.interestIncomeAccountId);
    const payout = input.payoutAccountId
      ? await this.requireAccount(input.payoutAccountId)
      : null;
    const baseCurrency = await this.ledger.getBaseCurrencyCode();

    if (principal.type !== "ASSET" || principal.isInvestment !== true) {
      throw new Error("Principal must be a dedicated INVESTMENT ASSET account");
    }
    if (income.type !== "INCOME") {
      throw new Error("Interest counterpart must be an INCOME account");
    }
    if (payout && payout.type !== "ASSET") {
      throw new Error("Payout destination must be an ASSET account");
    }
    if (
      principal.currencyCode !== income.currencyCode ||
      (payout && payout.currencyCode !== principal.currencyCode)
    ) {
      throw new Error("All accounts in an interest plan must use the same currency");
    }
    if (principal.currencyCode !== baseCurrency) {
      throw new Error(
        "MVP interest posting currently requires plan accounts in the Ledger base currency; foreign-currency FX posting is not yet supported",
      );
    }

    const timezoneId = input.timezoneId ?? this.deviceTimeZone();
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezoneId });
    } catch {
      throw new Error("Interest plan timezone is not a valid IANA timezone");
    }

    const timestamp = this.now();
    const plan: InterestPlan = {
      id: this.options.createId(),
      name,
      principalAccountId: principal.id,
      interestIncomeAccountId: income.id,
      payoutAccountId: payout?.id ?? null,
      annualRatePpm: input.annualRatePpm,
      rateConvention: "NOMINAL_APR",
      dayCount: "ACT_365_FIXED",
      compounding: input.compounding ?? "SIMPLE",
      postingFrequency: input.postingFrequency,
      startDate: input.startDate,
      maturityDate,
      timezoneId,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.createPlan(plan);
    return plan;
  }

  async listPlans(includeClosed = false): Promise<InterestPlan[]> {
    return this.repository.listPlans(includeClosed);
  }

  async listAccruals(planId: string): Promise<InterestAccrual[]> {
    await this.requirePlan(planId);
    return this.repository.listAccruals(planId);
  }

  async setPlanStatus(
    planId: string,
    status: InterestPlanStatus,
  ): Promise<void> {
    const plan = await this.requirePlan(planId);
    if (plan.status === "CLOSED" && status !== "CLOSED") {
      throw new Error("Closed interest plans cannot be reopened");
    }
    if (status === "CLOSED") {
      const pending = (await this.repository.listAccruals(planId)).some(
        (item) => item.status === "ACCRUED",
      );
      if (pending) {
        throw new Error("An interest plan with unposted accruals cannot be closed");
      }
    }
    await this.repository.setPlanStatus(planId, status, this.now());
  }

  async preview(
    planId: string,
    startDate: string,
    endDate: string,
  ) {
    const plan = await this.requirePlan(planId);
    const principalMinor = await this.readPrincipalBalance(plan);
    return calculateSimpleInterest({
      principalMinor,
      annualRatePpm: plan.annualRatePpm,
      startDate,
      endDate,
    });
  }

  async accruePeriod(input: {
    planId: string;
    periodStart: string;
    periodEnd: string;
    kind: InterestAccrualKind;
  }): Promise<{ accrual: InterestAccrual | null; calculation: ReturnType<typeof calculateSimpleInterest> }> {
    const plan = await this.requirePlan(input.planId);
    if (plan.status !== "ACTIVE") {
      throw new Error("Only an ACTIVE interest plan can accrue");
    }
    if (input.periodStart < plan.startDate) {
      throw new Error("Accrual period cannot start before the plan start date");
    }
    if (plan.maturityDate && input.periodEnd > plan.maturityDate) {
      throw new Error("Accrual period cannot end after plan maturity");
    }
    if (input.kind === "PAYOUT" && !plan.payoutAccountId) {
      throw new Error("This plan has no payout destination account");
    }

    const existing = (await this.repository.listAccruals(plan.id)).find(
      (item) =>
        item.periodStart === input.periodStart &&
        item.periodEnd === input.periodEnd &&
        item.accrualKind === input.kind,
    );
    if (existing) return { accrual: existing, calculation: {
      dayCount: countActualDays(input.periodStart, input.periodEnd),
      principalMinor: existing.principalMinor,
      annualRatePpm: plan.annualRatePpm,
      numerator: existing.accruedNumerator,
      denominator: existing.accruedDenominator,
      amountMinor: roundHalfUp(existing.accruedNumerator, existing.accruedDenominator),
    } };

    const principalMinor = await this.readPrincipalBalance(plan);
    const calculation = calculateSimpleInterest({
      principalMinor,
      annualRatePpm: plan.annualRatePpm,
      startDate: input.periodStart,
      endDate: input.periodEnd,
    });
    const roundedAtPosting = roundHalfUp(
      calculation.numerator,
      calculation.denominator,
    );
    if (roundedAtPosting === 0n) {
      // Do not discard fractional interest: the caller can preview the exact
      // rational amount and accrue a longer combined period before posting.
      return { accrual: null, calculation };
    }

    const timestamp = this.now();
    const idempotencyKey = [
      "interest",
      plan.id,
      input.periodStart,
      input.periodEnd,
      input.kind,
    ].join(":");
    const accrual: InterestAccrual = {
      id: this.options.createId(),
      planId: plan.id,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      principalMinor,
      accruedNumerator: calculation.numerator,
      accruedDenominator: calculation.denominator,
      amountMinor: 0n,
      status: "ACCRUED",
      accrualKind: input.kind,
      journalEntryId: null,
      idempotencyKey,
      createdAt: timestamp,
      postedAt: null,
      paidAt: null,
    };
    const raced = await this.repository.findAccrualByIdempotencyKey(idempotencyKey);
    if (raced) return { accrual: raced, calculation };
    await this.repository.createAccrual(accrual);
    return { accrual, calculation };
  }

  async postAccrual(accrualId: string): Promise<InterestAccrual> {
    const accrual = await this.repository.findAccrualById(accrualId);
    if (!accrual) throw new Error(`Interest accrual does not exist: ${accrualId}`);
    if (accrual.status !== "ACCRUED") return accrual;
    const plan = await this.requirePlan(accrual.planId);
    const amountMinor = roundHalfUp(
      accrual.accruedNumerator,
      accrual.accruedDenominator,
    );
    if (amountMinor <= 0n) {
      throw new Error("Accrued interest is below one currency minor unit; extend the accrual period before posting");
    }

    const debitAccountId =
      accrual.accrualKind === "CAPITALIZATION"
        ? plan.principalAccountId
        : plan.payoutAccountId;
    if (!debitAccountId) {
      throw new Error("Payout destination account is not configured");
    }
    const baseCurrencyCode = await this.ledger.getBaseCurrencyCode();
    if (!baseCurrencyCode) throw new Error("Ledger base currency is not configured");
    const timestamp = this.now();
    const entryId = this.options.createId();
    const description =
      accrual.accrualKind === "CAPITALIZATION"
        ? `Interest capitalization: ${plan.name}`
        : `Interest payout: ${plan.name}`;
    const journalEntry = {
      id: entryId,
      occurredAt: `${accrual.periodEnd}T00:00:00.000Z`,
      description,
      status: "POSTED" as const,
      baseCurrencyCode,
      idempotencyKey: accrual.idempotencyKey,
      reversalOfId: null,
      replacementOfId: null,
      transactionKind: "ADJUSTMENT" as const,
      categoryId: null,
      createdAt: timestamp,
      postedAt: timestamp,
    };
    const journalLines = [
      {
        id: this.options.createId(),
        entryId,
        lineNumber: 1,
        accountId: debitAccountId,
        currencyCode: baseCurrencyCode,
        side: "DEBIT" as const,
        amountMinor,
        fxRateNumerator: "1",
        fxRateDenominator: "1",
        baseAmountMinor: amountMinor,
        memo: description,
        createdAt: timestamp,
      },
      {
        id: this.options.createId(),
        entryId,
        lineNumber: 2,
        accountId: plan.interestIncomeAccountId,
        currencyCode: baseCurrencyCode,
        side: "CREDIT" as const,
        amountMinor,
        fxRateNumerator: "1",
        fxRateDenominator: "1",
        baseAmountMinor: amountMinor,
        memo: description,
        createdAt: timestamp,
      },
    ];
    return this.repository.commitPostedAccrual({
      accrualId,
      journalEntry,
      journalLines,
      postedAt: timestamp,
      amountMinor,
    });
  }

  private async readPrincipalBalance(plan: InterestPlan): Promise<bigint> {
    const account = await this.requireAccount(plan.principalAccountId);
    const currencyRecord = (await this.ledger.listCurrencies(true)).find(
      (item) => item.code === account.currencyCode,
    );
    if (!currencyRecord) throw new Error("Principal account currency is unavailable");
    const lines = await this.ledger.listPostedJournalLinesForAccount(account.id);
    const balance = calculateAccountBalance(
      account,
      lines,
      new Currency(currencyRecord.code, currencyRecord.minorUnit),
    ).minorUnits;
    if (balance <= 0n) {
      throw new Error("Interest principal account must have a positive posted Ledger balance");
    }
    return balance;
  }

  private async requireAccount(id: string) {
    const account = await this.ledger.findAccountById(id);
    if (!account || account.isArchived) {
      throw new Error(`Active Ledger account does not exist: ${id}`);
    }
    return account;
  }

  private async requirePlan(id: string): Promise<InterestPlan> {
    const plan = await this.repository.findPlanById(id);
    if (!plan) throw new Error(`Interest plan does not exist: ${id}`);
    return plan;
  }

  private nextDate(date: string): string {
    const [year, month, day] = date.split("-").map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return next.toISOString().slice(0, 10);
  }
}
