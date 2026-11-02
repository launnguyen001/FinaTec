import { Currency } from "./currency";

export class Money {
  readonly minorUnits: bigint;
  readonly currency: Currency;

  constructor(minorUnits: bigint, currency: Currency) {
    if (typeof minorUnits !== "bigint") {
      throw new Error("Money must use bigint minor units");
    }
    this.minorUnits = minorUnits;
    this.currency = currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  isPositive(): boolean {
    return this.minorUnits > 0n;
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) {
      throw new Error("Cannot combine Money values with different currencies");
    }
  }
}

export function toSqliteSafeInteger(value: bigint): number {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  if (value > max || value < min) {
    throw new RangeError(
      "Amount exceeds the safe SQLite JavaScript integer range",
    );
  }
  return Number(value);
}

export function fromSqliteInteger(value: number): bigint {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("SQLite amount is not a safe JavaScript integer");
  }
  return BigInt(value);
}
