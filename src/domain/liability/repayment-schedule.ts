export type RepaymentMethod =
  "DECLINING" | "EQUAL_PRINCIPAL" | "ANNUITY" | "INTEREST_ONLY";

export interface RepaymentScheduleInput {
  principalMinor: bigint;
  annualRatePpm: bigint;
  termMonths: number;
  method: RepaymentMethod;
  startDate: string;
  firstDueDate: string;
  /** Required for DECLINING; each item is the planned principal for that period. */
  decliningPrincipalMinor?: readonly bigint[];
}

export interface RepaymentInstallment {
  sequence: number;
  periodStart: string;
  dueDate: string;
  openingPrincipalMinor: bigint;
  principalDueMinor: bigint;
  interestDueMinor: bigint;
  totalDueMinor: bigint;
  closingPrincipalMinor: bigint;
}

export interface RepaymentSchedule {
  method: RepaymentMethod;
  principalMinor: bigint;
  annualRatePpm: bigint;
  scheduledPaymentMinor: bigint | null;
  installments: RepaymentInstallment[];
  totalPrincipalMinor: bigint;
  totalInterestMinor: bigint;
  totalPaymentMinor: bigint;
}

const RATE_SCALE = 1_000_000n;
const MONTHLY_RATE_DENOMINATOR = RATE_SCALE * 12n;
const MAX_ANNUAL_RATE_PPM = 10_000_000n;
const MAX_TERM_MONTHS = 600;

export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new Error(
      "HALF_UP requires a non-negative numerator and positive denominator",
    );
  }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

function parseDate(value: string): {
  year: number;
  month: number;
  day: number;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date must use YYYY-MM-DD format");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !year ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Date is invalid");
  }
  return { year, month, day };
}

function dateToString(year: number, month: number, day: number): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Adds months relative to the original anchor day, clamping short months. */
export function addMonthsClamped(anchorDate: string, months: number): string {
  const anchor = parseDate(anchorDate);
  if (!Number.isInteger(months) || months < 0) {
    throw new Error("Month offset must be a non-negative integer");
  }
  const absoluteMonth = anchor.year * 12 + (anchor.month - 1) + months;
  const year = Math.floor(absoluteMonth / 12);
  const month = (absoluteMonth % 12) + 1;
  return dateToString(
    year,
    month,
    Math.min(anchor.day, daysInMonth(year, month)),
  );
}

export function countActualDays(startDate: string, endDate: string): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const startTime = Date.UTC(start.year, start.month - 1, start.day);
  const endTime = Date.UTC(end.year, end.month - 1, end.day);
  const days = (endTime - startTime) / 86_400_000;
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new Error("Period end must be after period start");
  }
  return days;
}

/** Exact nominal APR/12 PMT, rounded once to the currency minor unit. */
export function calculateAnnuityPayment(
  principalMinor: bigint,
  annualRatePpm: bigint,
  termMonths: number,
): bigint {
  if (
    principalMinor <= 0n ||
    !Number.isInteger(termMonths) ||
    termMonths <= 0
  ) {
    throw new Error("Principal and term must be positive");
  }
  if (annualRatePpm < 0n || annualRatePpm > MAX_ANNUAL_RATE_PPM) {
    throw new Error("APR must be between 0% and 1000%");
  }
  if (annualRatePpm === 0n) {
    return roundHalfUp(principalMinor, BigInt(termMonths));
  }
  const denominator = MONTHLY_RATE_DENOMINATOR;
  const rate = annualRatePpm;
  const base = denominator + rate;
  const basePower = base ** BigInt(termMonths);
  const denominatorPower = denominator ** BigInt(termMonths);
  const numerator = principalMinor * rate * basePower;
  const divisor = denominator * (basePower - denominatorPower);
  return roundHalfUp(numerator, divisor);
}

export function calculateRepaymentSchedule(
  input: RepaymentScheduleInput,
): RepaymentSchedule {
  if (input.principalMinor <= 0n) throw new Error("Principal must be positive");
  if (input.annualRatePpm < 0n || input.annualRatePpm > MAX_ANNUAL_RATE_PPM) {
    throw new Error("APR must be between 0% and 1000%");
  }
  if (
    !Number.isInteger(input.termMonths) ||
    input.termMonths < 1 ||
    input.termMonths > MAX_TERM_MONTHS
  ) {
    throw new Error(`Term must be between 1 and ${MAX_TERM_MONTHS} months`);
  }
  parseDate(input.startDate);
  parseDate(input.firstDueDate);
  if (input.firstDueDate <= input.startDate) {
    throw new Error("First due date must be after the loan start date");
  }

  const declining = input.decliningPrincipalMinor;
  if (input.method === "DECLINING") {
    if (!declining || declining.length !== input.termMonths) {
      throw new Error(
        "DECLINING requires one principal amount for every installment",
      );
    }
    if (declining.some((amount) => amount < 0n)) {
      throw new Error("Scheduled principal cannot be negative");
    }
    if (
      declining.reduce((sum, amount) => sum + amount, 0n) !==
      input.principalMinor
    ) {
      throw new Error(
        "DECLINING principal installments must sum exactly to the original principal",
      );
    }
  } else if (declining !== undefined) {
    throw new Error(
      "Custom principal installments are only valid for DECLINING",
    );
  }

  const annuityPayment =
    input.method === "ANNUITY"
      ? calculateAnnuityPayment(
          input.principalMinor,
          input.annualRatePpm,
          input.termMonths,
        )
      : null;
  const equalBase = input.principalMinor / BigInt(input.termMonths);
  const equalRemainder = input.principalMinor % BigInt(input.termMonths);
  let balance = input.principalMinor;
  let periodStart = input.startDate;
  let totalPrincipalMinor = 0n;
  let totalInterestMinor = 0n;
  let totalPaymentMinor = 0n;
  const installments: RepaymentInstallment[] = [];

  for (let index = 0; index < input.termMonths; index += 1) {
    const dueDate = addMonthsClamped(input.firstDueDate, index);
    const openingPrincipalMinor = balance;
    const interestNumerator =
      input.method === "DECLINING"
        ? balance *
          input.annualRatePpm *
          BigInt(countActualDays(periodStart, dueDate))
        : balance * input.annualRatePpm;
    const interestDenominator =
      input.method === "DECLINING"
        ? RATE_SCALE * 365n
        : MONTHLY_RATE_DENOMINATOR;
    const interestDueMinor = roundHalfUp(
      interestNumerator,
      interestDenominator,
    );

    let principalDueMinor: bigint;
    switch (input.method) {
      case "DECLINING":
        principalDueMinor = declining![index]!;
        break;
      case "EQUAL_PRINCIPAL":
        principalDueMinor =
          equalBase + (BigInt(index) < equalRemainder ? 1n : 0n);
        break;
      case "ANNUITY":
        principalDueMinor =
          index === input.termMonths - 1
            ? balance
            : annuityPayment! - interestDueMinor;
        if (principalDueMinor < 0n) {
          throw new Error(
            "Annuity payment is below the period interest; increase payment or reduce APR",
          );
        }
        if (principalDueMinor > balance) principalDueMinor = balance;
        break;
      case "INTEREST_ONLY":
        principalDueMinor = index === input.termMonths - 1 ? balance : 0n;
        break;
    }
    if (principalDueMinor > balance) {
      throw new Error(
        `Principal due exceeds outstanding balance at installment ${index + 1}`,
      );
    }
    balance -= principalDueMinor;
    const totalDueMinor = principalDueMinor + interestDueMinor;
    installments.push({
      sequence: index + 1,
      periodStart,
      dueDate,
      openingPrincipalMinor,
      principalDueMinor,
      interestDueMinor,
      totalDueMinor,
      closingPrincipalMinor: balance,
    });
    totalPrincipalMinor += principalDueMinor;
    totalInterestMinor += interestDueMinor;
    totalPaymentMinor += totalDueMinor;
    periodStart = dueDate;
  }

  if (balance !== 0n || totalPrincipalMinor !== input.principalMinor) {
    throw new Error(
      "Repayment schedule does not fully amortize the original principal",
    );
  }
  return {
    method: input.method,
    principalMinor: input.principalMinor,
    annualRatePpm: input.annualRatePpm,
    scheduledPaymentMinor: annuityPayment,
    installments,
    totalPrincipalMinor,
    totalInterestMinor,
    totalPaymentMinor,
  };
}
