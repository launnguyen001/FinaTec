import {
  addMonthsClamped,
  calculateAnnuityPayment,
  calculateRepaymentSchedule,
  countActualDays,
  roundHalfUp,
} from "./repayment-schedule";

describe("liability repayment schedule calculator", () => {
  it("calculates equal principal and monthly APR/12 interest", () => {
    const result = calculateRepaymentSchedule({
      principalMinor: 1_200_000n,
      annualRatePpm: 120_000n,
      termMonths: 12,
      method: "EQUAL_PRINCIPAL",
      startDate: "2026-01-01",
      firstDueDate: "2026-02-01",
    });
    expect(result.installments[0]).toMatchObject({
      principalDueMinor: 100_000n,
      interestDueMinor: 12_000n,
      totalDueMinor: 112_000n,
      closingPrincipalMinor: 1_100_000n,
    });
    expect(result.totalPrincipalMinor).toBe(1_200_000n);
    expect(result.totalInterestMinor).toBe(78_000n);
    expect(result.installments[11]?.closingPrincipalMinor).toBe(0n);
  });

  it("uses an exact rational annuity PMT and adjusts the final principal", () => {
    const payment = calculateAnnuityPayment(1_200_000n, 120_000n, 12);
    expect(payment).toBe(106_619n);
    const result = calculateRepaymentSchedule({
      principalMinor: 1_200_000n,
      annualRatePpm: 120_000n,
      termMonths: 12,
      method: "ANNUITY",
      startDate: "2026-01-01",
      firstDueDate: "2026-02-01",
    });
    expect(result.installments[0]?.totalDueMinor).toBe(106_619n);
    expect(result.installments[11]?.closingPrincipalMinor).toBe(0n);
    expect(result.totalPrincipalMinor).toBe(1_200_000n);
  });

  it("defers all principal to maturity for interest-only", () => {
    const result = calculateRepaymentSchedule({
      principalMinor: 1_200_000n,
      annualRatePpm: 120_000n,
      termMonths: 3,
      method: "INTEREST_ONLY",
      startDate: "2026-01-01",
      firstDueDate: "2026-02-01",
    });
    expect(result.installments.map((item) => item.principalDueMinor)).toEqual([
      0n,
      0n,
      1_200_000n,
    ]);
    expect(result.installments.map((item) => item.interestDueMinor)).toEqual([
      12_000n,
      12_000n,
      12_000n,
    ]);
  });

  it("uses actual days over 365 for declining balance", () => {
    const result = calculateRepaymentSchedule({
      principalMinor: 100_000n,
      annualRatePpm: 120_000n,
      termMonths: 2,
      method: "DECLINING",
      startDate: "2026-01-01",
      firstDueDate: "2026-02-01",
      decliningPrincipalMinor: [40_000n, 60_000n],
    });
    expect(countActualDays("2026-01-01", "2026-02-01")).toBe(31);
    expect(result.installments[0]?.interestDueMinor).toBe(1_019n);
    expect(result.installments[1]?.interestDueMinor).toBe(552n);
    expect(result.totalPrincipalMinor).toBe(100_000n);
    expect(result.installments[1]?.closingPrincipalMinor).toBe(0n);
  });

  it("clamps end-of-month due dates against the original anchor day", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("rounds HALF_UP and supports zero APR", () => {
    expect(roundHalfUp(1n, 2n)).toBe(1n);
    const result = calculateRepaymentSchedule({
      principalMinor: 10n,
      annualRatePpm: 0n,
      termMonths: 3,
      method: "EQUAL_PRINCIPAL",
      startDate: "2026-01-01",
      firstDueDate: "2026-02-01",
    });
    expect(result.installments.map((item) => item.principalDueMinor)).toEqual([
      4n,
      3n,
      3n,
    ]);
    expect(result.totalInterestMinor).toBe(0n);
  });

  it("rejects invalid custom principal allocations and dates", () => {
    expect(() =>
      calculateRepaymentSchedule({
        principalMinor: 100n,
        annualRatePpm: 100_000n,
        termMonths: 2,
        method: "DECLINING",
        startDate: "2026-01-01",
        firstDueDate: "2026-02-01",
        decliningPrincipalMinor: [20n, 20n],
      }),
    ).toThrow(/sum exactly/);
    expect(() =>
      calculateRepaymentSchedule({
        principalMinor: 100n,
        annualRatePpm: 100_000n,
        termMonths: 2,
        method: "ANNUITY",
        startDate: "2026-01-01",
        firstDueDate: "2026-01-01",
      }),
    ).toThrow(/after the loan start date/);
  });
});
