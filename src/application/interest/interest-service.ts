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
    if (input.annualRatePpm < 0n || input.annualRatePpm > 10_000_000n) {
      throw new Error("Annual APR must be between 0% and 1000%");
    }
    const maturityDate = input.maturityDate ?? null;
    countActualDays(
      input.startDate,
      maturityDate ?? this.nextDate(input.startDate),
    );
    if (maturityDate && maturityDate <= input.startDate) {
      throw new Error("Maturity date must be after start date");
    }
    if (input.postingFrequency === "AT_MATURITY" && !maturityDate) {
      throw new Error("At-maturity posting requires a maturity date");
    }
    const compounding = input.compounding ?? "SIMPLE";
    if (compounding === "SIMPLE" && !input.payoutAccountId) {
      throw new Error(
        "Simple-interest plans require a payout destination; capitalization would compound interest",
      );
    }

    const principal = await this.requireAccount(input.principalAccountId);
    const income = await this.requireAccount(input.interestIncomeAccountId);
    const payout = input.payoutAccountId
      ? await this.requireAccount(input.payoutAccountId)
      : null;
    const baseCurrency = await this.ledger.getBaseCurrencyCode();
    const existingPlan = (await this.repository.listPlans()).find(
      (plan) =>
        plan.status === "ACTIVE" && plan.principalAccountId === principal.id,
    );
    if (existingPlan) {
      throw new Error(
        `Principal account already has an active interest plan: ${existingPlan.id}`,
      );
    }

    if (principal.type !== "ASSET" || principal.isInvestment !== true) {
      throw new Error("Principal must be a dedicated INVESTMENT ASSET account");
    }
    if (income.type !== "INCOME") {
      throw new Error("Interest counterpart must be an INCOME account");
    }
    if (payout && payout.type !== "ASSET") {
      throw new Error("Payout destination must be an ASSET account");
    }
    if (payout && payout.id === principal.id) {
      throw new Error(
        "Payout destination must differ from the principal account",
      );
    }
    if (
      principal.currencyCode !== income.currencyCode ||
      (payout && payout.currencyCode !== principal.currencyCode)
    ) {
      throw new Error(
        "All accounts in an interest plan must use the same currency",
      );
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
      compounding,
      postingFrequency: input.postingFrequency,
      startDate: input.startDate,
      maturityDate,
      timezoneId,
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.readPrincipalBalance(plan);
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
        throw new Error(
          "An interest plan with unposted accruals cannot be closed",
        );
      }
    }
    await this.repository.setPlanStatus(planId, status, this.now());
  }

  async preview(planId: string, startDate: string, endDate: string) {
    const plan = await this.requirePlan(planId);
    if (startDate < plan.startDate) {
      throw new Error("Preview period cannot start before the plan start date");
    }
    if (plan.maturityDate && endDate > plan.maturityDate) {
      throw new Error("Preview period cannot end after plan maturity");
    }
    if (await this.repository.hasExternalPrincipalMovements(plan)) {
      throw new Error("Principal changed outside this InterestPlan after its start date; preview is not reliable in this MVP");
    }
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
  }): Promise<{
    accrual: InterestAccrual | null;
    calculation: ReturnType<typeof calculateSimpleInterest>;
  }> {
    const plan = await this.requirePlan(input.planId);
    if (plan.status !== "ACTIVE") {
      throw new Error("Only an ACTIVE interest plan can accrue");
    }
    if (input.periodStart < plan.startDate) {
      throw new Error("Accrual period cannot start before the plan start date");
    }
    if (input.periodEnd > this.todayForTimeZone(plan.timezoneId)) {
      throw new Error("Accrual period cannot end in the future");
    }
    if (plan.maturityDate && input.periodEnd > plan.maturityDate) {
      throw new Error("Accrual period cannot end after plan maturity");
    }
    if (input.kind === "PAYOUT" && !plan.payoutAccountId) {
      throw new Error("This plan has no payout destination account");
    }
    if (
      input.kind === "CAPITALIZATION" &&
      plan.compounding !== "AFTER_CAPITALIZATION"
    ) {
      throw new Error(
        "Simple-interest plans cannot capitalize interest; use payout instead",
      );
    }

    const history = await this.repository.listAccruals(plan.id);
    const existing = history.find(
      (item) =>
        item.periodStart === input.periodStart &&
        item.periodEnd === input.periodEnd &&
        item.accrualKind === input.kind,
    );
    if (existing)
      return {
        accrual: existing,
        calculation: {
          dayCount: countActualDays(input.periodStart, input.periodEnd),
          principalMinor: existing.principalMinor,
          annualRatePpm: plan.annualRatePpm,
          numerator: existing.accruedNumerator,
          denominator: existing.accruedDenominator,
          amountMinor: roundHalfUp(
            existing.accruedNumerator,
            existing.accruedDenominator,
          ),
        },
      };
    if (history.some((item) => item.status === "ACCRUED")) {
      throw new Error("An earlier accrual is still pending posting");
    }
    const settled = history
      .filter((item) => item.status === "POSTED" || item.status === "PAID")
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    const expectedStart =
      settled.length > 0
        ? settled[settled.length - 1]!.periodEnd
        : plan.startDate;
    if (input.periodStart !== expectedStart) {
      throw new Error(
        `Accrual must continue from the last settled boundary: ${expectedStart}`,
      );
    }

    if (await this.repository.hasExternalPrincipalMovements(plan)) {
      throw new Error(
        "Principal changed outside this InterestPlan after its start date; variable-principal accrual is not supported in this MVP",
      );
    }
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
    const raced =
      await this.repository.findAccrualByIdempotencyKey(idempotencyKey);
    if (raced) return { accrual: raced, calculation };
    await this.repository.createAccrual(accrual);
    return { accrual, calculation };
  }

  async postAccrual(accrualId: string): Promise<InterestAccrual> {
    const accrual = await this.repository.findAccrualById(accrualId);
    if (!accrual)
      throw new Error(`Interest accrual does not exist: ${accrualId}`);
    if (accrual.status !== "ACCRUED") return accrual;
    const plan = await this.requirePlan(accrual.planId);
    const amountMinor = roundHalfUp(
      accrual.accruedNumerator,
      accrual.accruedDenominator,
    );
    if (amountMinor <= 0n) {
      throw new Error(
        "Accrued interest is below one currency minor unit; extend the accrual period before posting",
      );
    }

    const debitAccountId =
      accrual.accrualKind === "CAPITALIZATION"
        ? plan.principalAccountId
        : plan.payoutAccountId;
    if (!debitAccountId) {
      throw new Error("Payout destination account is not configured");
    }
    const baseCurrencyCode = await this.ledger.getBaseCurrencyCode();
    if (!baseCurrencyCode)
      throw new Error("Ledger base currency is not configured");
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

  /**
   * Runs deterministic foreground catch-up. Periods are processed in order;
   * each successful capitalization is committed before the next period reads
   * its principal from Ledger. Missed sub-minor-unit periods are accumulated
   * as exact fractions and posted once the combined amount reaches one minor
   * unit, avoiding daily/monthly rounding drift.
   */
  async catchUpActivePlans(): Promise<
    { planId: string; processed: number; error: string | null }[]
  > {
    const plans = await this.repository.listPlans();
    const outcomes: {
      planId: string;
      processed: number;
      error: string | null;
    }[] = [];
    for (const plan of plans) {
      if (plan.status !== "ACTIVE") continue;
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: plan.timezoneId,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date(this.now()));
      const values = new Map(parts.map((part) => [part.type, part.value]));
      const asOfDate = `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
      const kind: InterestAccrualKind =
        plan.compounding === "AFTER_CAPITALIZATION"
          ? "CAPITALIZATION"
          : "PAYOUT";
      try {
        const posted = await this.catchUp(plan.id, asOfDate, kind);
        outcomes.push({
          planId: plan.id,
          processed: posted.length,
          error: null,
        });
      } catch (error) {
        outcomes.push({
          planId: plan.id,
          processed: 0,
          error:
            error instanceof Error ? error.message : "Unknown catch-up failure",
        });
      }
    }
    return outcomes;
  }

  async catchUp(
    planId: string,
    asOfDate: string,
    kind: InterestAccrualKind,
  ): Promise<InterestAccrual[]> {
    const plan = await this.requirePlan(planId);
    if (plan.status !== "ACTIVE") return [];
    if (await this.repository.hasExternalPrincipalMovements(plan)) {
      throw new Error(
        "Principal changed outside this InterestPlan after its start date; variable-principal catch-up is not supported in this MVP",
      );
    }
    if (
      kind === "CAPITALIZATION" &&
      plan.compounding !== "AFTER_CAPITALIZATION"
    ) {
      throw new Error("Simple-interest plans cannot capitalize interest");
    }
    if (kind === "PAYOUT" && !plan.payoutAccountId) {
      throw new Error("This plan has no payout destination account");
    }
    if (asOfDate <= plan.startDate) return [];
    countActualDays(plan.startDate, asOfDate);

    const completed: InterestAccrual[] = [];
    let existing = await this.repository.listAccruals(planId);
    for (const pending of existing.filter(
      (item) => item.status === "ACCRUED",
    )) {
      completed.push(await this.postAccrual(pending.id));
    }
    existing = await this.repository.listAccruals(planId);
    const settled = existing
      .filter((item) => item.status === "POSTED" || item.status === "PAID")
      .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
    let periodStart =
      settled.length > 0
        ? settled[settled.length - 1]!.periodEnd
        : plan.startDate;
    if (plan.maturityDate && periodStart >= plan.maturityDate) return completed;

    if (plan.postingFrequency === "AT_MATURITY") {
      const maturity = plan.maturityDate;
      if (!maturity || asOfDate < maturity) return completed;
      const accrual = await this.accruePeriod({
        planId,
        periodStart,
        periodEnd: maturity,
        kind,
      });
      if (accrual.accrual) {
        completed.push(await this.postAccrual(accrual.accrual.id));
      }
      return completed;
    }

    let monthOffset = 1;
    while (
      this.addMonthsFromAnchor(plan.startDate, monthOffset) <= periodStart
    ) {
      monthOffset += 1;
      if (monthOffset > 1200)
        throw new Error(
          "Interest plan period history exceeds the supported range",
        );
    }

    let carryStart = periodStart;
    let carryPrincipal = 0n;
    let carryNumerator = 0n;
    const denominator = 365_000_000n;

    while (true) {
      let periodEnd = this.addMonthsFromAnchor(plan.startDate, monthOffset);
      if (plan.maturityDate && periodEnd > plan.maturityDate) {
        periodEnd = plan.maturityDate;
      }
      if (periodEnd > asOfDate || periodEnd <= periodStart) break;

      const principalMinor = await this.readPrincipalBalance(plan);
      const calculation = calculateSimpleInterest({
        principalMinor,
        annualRatePpm: plan.annualRatePpm,
        startDate: periodStart,
        endDate: periodEnd,
      });
      if (carryNumerator === 0n) {
        carryStart = periodStart;
        carryPrincipal = principalMinor;
      } else if (carryPrincipal !== principalMinor) {
        throw new Error(
          "Principal changed while fractional interest was carried; reconcile the principal change before catch-up",
        );
      }
      carryNumerator += calculation.numerator;
      const rounded = roundHalfUp(carryNumerator, denominator);

      if (rounded > 0n) {
        const accrual = await this.persistAccrual({
          plan,
          periodStart: carryStart,
          periodEnd,
          kind,
          principalMinor: carryPrincipal,
          numerator: carryNumerator,
          denominator,
        });
        completed.push(await this.postAccrual(accrual.id));
        carryNumerator = 0n;
        carryPrincipal = 0n;
      }

      periodStart = periodEnd;
      monthOffset += 1;
      if (plan.maturityDate && periodStart >= plan.maturityDate) break;
    }
    return completed;
  }

  private async persistAccrual(input: {
    plan: InterestPlan;
    periodStart: string;
    periodEnd: string;
    kind: InterestAccrualKind;
    principalMinor: bigint;
    numerator: bigint;
    denominator: bigint;
  }): Promise<InterestAccrual> {
    const idempotencyKey = [
      "interest",
      input.plan.id,
      input.periodStart,
      input.periodEnd,
      input.kind,
    ].join(":");
    const existing =
      await this.repository.findAccrualByIdempotencyKey(idempotencyKey);
    if (existing) return existing;
    const accrual: InterestAccrual = {
      id: this.options.createId(),
      planId: input.plan.id,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      principalMinor: input.principalMinor,
      accruedNumerator: input.numerator,
      accruedDenominator: input.denominator,
      amountMinor: 0n,
      status: "ACCRUED",
      accrualKind: input.kind,
      journalEntryId: null,
      idempotencyKey,
      createdAt: this.now(),
      postedAt: null,
      paidAt: null,
    };
    try {
      await this.repository.createAccrual(accrual);
      return accrual;
    } catch (error) {
      const raced =
        await this.repository.findAccrualByIdempotencyKey(idempotencyKey);
      if (raced) return raced;
      throw error;
    }
  }

  private todayForTimeZone(timezoneId: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezoneId,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(this.now()));
    const values = new Map(parts.map((part) => [part.type, part.value]));
    return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
  }

  private addMonthsFromAnchor(anchor: string, months: number): string {
    const [year, month, day] = anchor.split("-").map(Number);
    const monthIndex = year * 12 + month - 1 + months;
    const targetYear = Math.floor(monthIndex / 12);
    const targetMonth = monthIndex % 12;
    const lastDay = new Date(
      Date.UTC(targetYear, targetMonth + 1, 0),
    ).getUTCDate();
    const targetDay = Math.min(day, lastDay);
    return `${targetYear.toString().padStart(4, "0")}-${(targetMonth + 1).toString().padStart(2, "0")}-${targetDay.toString().padStart(2, "0")}`;
  }

  private async readPrincipalBalance(plan: InterestPlan): Promise<bigint> {
    const account = await this.requireAccount(plan.principalAccountId);
    const currencyRecord = (await this.ledger.listCurrencies(true)).find(
      (item) => item.code === account.currencyCode,
    );
    if (!currencyRecord)
      throw new Error("Principal account currency is unavailable");
    const lines = await this.ledger.listPostedJournalLinesForAccount(
      account.id,
    );
    const balance = calculateAccountBalance(
      account,
      lines,
      new Currency(currencyRecord.code, currencyRecord.minorUnit),
    ).minorUnits;
    if (balance <= 0n) {
      throw new Error(
        "Interest principal account must have a positive posted Ledger balance",
      );
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
