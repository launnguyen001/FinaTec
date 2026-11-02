import { Currency } from "../domain/ledger/currency";
import { FxRate } from "../domain/ledger/fx-rate";
import { Money, fromSqliteInteger, toSqliteSafeInteger } from "../domain/ledger/money";

describe("ledger value objects", () => {
  it("normalizes and validates currency codes and minor units", () => {
    expect(new Currency("vnd", 0)).toEqual(new Currency("VND", 0));
    expect(() => new Currency("US", 2)).toThrow();
    expect(() => new Currency("USD", 7)).toThrow();
  });

  it("prevents arithmetic across different currencies", () => {
    const vnd = new Currency("VND", 0);
    const usd = new Currency("USD", 2);
    expect(new Money(100n, vnd).add(new Money(200n, vnd)).minorUnits).toBe(300n);
    expect(() => new Money(100n, vnd).add(new Money(100n, usd))).toThrow();
  });

  it("converts currencies with exact rational arithmetic and half-up rounding", () => {
    const usd = new Currency("USD", 2);
    const vnd = new Currency("VND", 0);
    const rate = FxRate.fromDecimal("25450.5", usd, vnd);
    expect(rate.convertToBase(new Money(100n, usd)).minorUnits).toBe(25451n);
    expect(rate.convertToBase(new Money(1n, usd)).minorUnits).toBe(255n);
    expect(rate.convertToBase(new Money(-1n, usd)).minorUnits).toBe(-255n);
    expect(() => new FxRate(2n, 1n, usd, usd)).toThrow();
  });

  it("round-trips only safe SQLite integers", () => {
    expect(fromSqliteInteger(toSqliteSafeInteger(123456n))).toBe(123456n);
    expect(() => toSqliteSafeInteger(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
    expect(() => fromSqliteInteger(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
