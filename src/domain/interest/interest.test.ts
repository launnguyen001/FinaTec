import {
  addAccrualFractions,
  calculateSimpleInterest,
  countActualDays,
  roundHalfUp,
} from "./interest";

describe("ACT/365 Fixed nominal APR calculator", () => {
  it("calculates a 5.5% APR over 365 days exactly", () => {
    const result = calculateSimpleInterest({
      principalMinor: 100_000n,
      annualRatePpm: 55_000n,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
    });
    expect(result.dayCount).toBe(365);
    expect(result.numerator).toBe(2_007_500_000_000n);
    expect(result.denominator).toBe(365_000_000n);
    expect(result.amountMinor).toBe(5_500n);
  });

  it("uses ACT/365 Fixed in leap years, not ACT/366", () => {
    expect(countActualDays("2024-01-01", "2025-01-01")).toBe(366);
    const result = calculateSimpleInterest({
      principalMinor: 100_000n,
      annualRatePpm: 100_000n,
      startDate: "2024-01-01",
      endDate: "2025-01-01",
    });
    expect(result.amountMinor).toBe(10_027n);
  });

  it("treats start as inclusive and end as exclusive", () => {
    expect(countActualDays("2026-01-01", "2026-01-02")).toBe(1);
  });

  it("keeps fractional minor units until final posting", () => {
    const daily = calculateSimpleInterest({
      principalMinor: 1n,
      annualRatePpm: 100_000n,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
    });
    const accumulated = addAccrualFractions([
      daily,
      daily,
      daily,
      daily,
      daily,
    ]);
    expect(daily.amountMinor).toBe(0n);
    expect(accumulated.amountMinor).toBe(0n);
    expect(accumulated.numerator).toBe(500_000n);
  });

  it("carries 365 exact daily fractions into one minor unit without daily rounding", () => {
    const daily = calculateSimpleInterest({
      principalMinor: 1n,
      annualRatePpm: 1_000_000n,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
    });
    const carried = addAccrualFractions(
      Array.from({ length: 365 }, () => daily),
    );
    expect(daily.amountMinor).toBe(0n);
    expect(carried.amountMinor).toBe(1n);
    expect(carried.numerator).toBe(365_000_000n);
  });

  it("accepts the approved maximum nominal APR of 1000 percent", () => {
    const result = calculateSimpleInterest({
      principalMinor: 100_000n,
      annualRatePpm: 10_000_000n,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
    });
    expect(result.amountMinor).toBe(1_000_000n);
  });

  it("rounds HALF_UP only at the posting boundary", () => {
    expect(roundHalfUp(1n, 2n)).toBe(1n);
    expect(roundHalfUp(2n, 3n)).toBe(1n);
    expect(roundHalfUp(1n, 3n)).toBe(0n);
  });

  it("rejects invalid ranges, dates, principal and rates", () => {
    expect(() => countActualDays("2026-02-30", "2026-03-01")).toThrow();
    expect(() => countActualDays("2026-01-02", "2026-01-02")).toThrow();
    expect(() =>
      calculateSimpleInterest({
        principalMinor: 0n,
        annualRatePpm: 10_000n,
        startDate: "2026-01-01",
        endDate: "2026-01-02",
      }),
    ).toThrow();
    expect(() =>
      calculateSimpleInterest({
        principalMinor: 100n,
        annualRatePpm: 1_000_000_001n,
        startDate: "2026-01-01",
        endDate: "2026-01-02",
      }),
    ).toThrow();
  });
});
