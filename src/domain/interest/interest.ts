export type InterestRateConvention = "NOMINAL_APR";
export type InterestDayCount = "ACT_365_FIXED";
export type InterestCompounding = "SIMPLE" | "AFTER_CAPITALIZATION";
export type InterestPostingFrequency = "MONTHLY" | "AT_MATURITY";
export type InterestPlanStatus = "ACTIVE" | "PAUSED" | "CLOSED";
export type InterestAccrualStatus = "ACCRUED" | "POSTED" | "PAID";
export type InterestAccrualKind = "CAPITALIZATION" | "PAYOUT";

export interface InterestPlan {
  id: string;
  name: string;
  principalAccountId: string;
  interestIncomeAccountId: string;
  payoutAccountId: string | null;
  annualRatePpm: bigint;
  rateConvention: InterestRateConvention;
  dayCount: InterestDayCount;
  compounding: InterestCompounding;
  postingFrequency: InterestPostingFrequency;
  startDate: string;
  maturityDate: string | null;
  timezoneId: string;
  status: InterestPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface InterestAccrual {
  id: string;
  planId: string;
  periodStart: string;
  periodEnd: string;
  principalMinor: bigint;
  accruedNumerator: bigint;
  accruedDenominator: bigint;
  amountMinor: bigint;
  status: InterestAccrualStatus;
  accrualKind: InterestAccrualKind;
  journalEntryId: string | null;
  idempotencyKey: string;
  createdAt: string;
  postedAt: string | null;
  paidAt: string | null;
}

export interface InterestCalculationInput {
  principalMinor: bigint;
  annualRatePpm: bigint;
  startDate: string;
  endDate: string;
}

export interface InterestCalculation {
  dayCount: number;
  principalMinor: bigint;
  annualRatePpm: bigint;
  numerator: bigint;
  denominator: bigint;
  /** Rounded once to the currency minor unit using HALF_UP. */
  amountMinor: bigint;
}

const RATE_SCALE = 1_000_000n;
const DAYS_PER_YEAR = 365n;
const ACT_365_DENOMINATOR = RATE_SCALE * DAYS_PER_YEAR;
const MAX_ANNUAL_RATE_PPM = 10_000_000n;

function parseDateOnly(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date must use YYYY-MM-DD format");
  }
  const [year, month, day] = value.split("-").map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Date is invalid");
  }
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Date is invalid");
  }
  return timestamp;
}

export function countActualDays(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (end <= start) {
    throw new Error("Interest period end must be after its start");
  }
  const days = (end - start) / 86_400_000;
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error("Interest period day count is invalid");
  }
  return days;
}

/** HALF_UP for non-negative rational amounts. No floating-point arithmetic. */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new Error(
      "HALF_UP accepts a non-negative numerator and positive denominator",
    );
  }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

/**
 * Nominal APR, ACT/365 Fixed, daily accrual, simple interest.
 * The start date is inclusive and end date is exclusive.
 * annualRatePpm uses 1,000,000 parts per unit (5.5% = 55,000 ppm).
 * The exact numerator is retained so sub-minor-unit fractions can carry
 * across daily accruals and are rounded only at posting.
 */
export function calculateSimpleInterest(
  input: InterestCalculationInput,
): InterestCalculation {
  if (input.principalMinor <= 0n) {
    throw new Error("Principal must be greater than zero");
  }
  if (input.annualRatePpm < 0n || input.annualRatePpm > MAX_ANNUAL_RATE_PPM) {
    throw new Error("Annual APR must be between 0% and 1000%");
  }

  const dayCount = countActualDays(input.startDate, input.endDate);
  const numerator =
    input.principalMinor * input.annualRatePpm * BigInt(dayCount);
  return {
    dayCount,
    principalMinor: input.principalMinor,
    annualRatePpm: input.annualRatePpm,
    numerator,
    denominator: ACT_365_DENOMINATOR,
    amountMinor: roundHalfUp(numerator, ACT_365_DENOMINATOR),
  };
}

export function addAccrualFractions(
  fractions: readonly { numerator: bigint; denominator: bigint }[],
): { numerator: bigint; denominator: bigint; amountMinor: bigint } {
  let numerator = 0n;
  for (const fraction of fractions) {
    if (fraction.numerator < 0n || fraction.denominator <= 0n) {
      throw new Error(
        "Accrual fractions must be non-negative with positive denominators",
      );
    }
    if (ACT_365_DENOMINATOR % fraction.denominator !== 0n) {
      throw new Error(
        "Accrual denominator is not compatible with ACT/365 Fixed",
      );
    }
    numerator +=
      fraction.numerator * (ACT_365_DENOMINATOR / fraction.denominator);
  }
  return {
    numerator,
    denominator: ACT_365_DENOMINATOR,
    amountMinor: roundHalfUp(numerator, ACT_365_DENOMINATOR),
  };
}
