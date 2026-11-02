import { Currency } from "./currency";
import { Money } from "./money";

/**
 * Exact rational FX quote: base major units per one native major unit.
 * Numerator and denominator are stored as positive integers, never float.
 */
export class FxRate {
  readonly numerator: bigint;
  readonly denominator: bigint;
  readonly nativeCurrency: Currency;
  readonly baseCurrency: Currency;

  constructor(
    numerator: bigint,
    denominator: bigint,
    nativeCurrency: Currency,
    baseCurrency: Currency,
  ) {
    if (numerator <= 0n || denominator <= 0n) {
      throw new Error("FX rate numerator and denominator must be positive");
    }
    this.numerator = numerator;
    this.denominator = denominator;
    this.nativeCurrency = nativeCurrency;
    this.baseCurrency = baseCurrency;
  }

  convertToBase(money: Money): Money {
    if (!money.currency.equals(this.nativeCurrency)) {
      throw new Error("FX rate native currency does not match Money currency");
    }

    const numerator =
      money.minorUnits *
      this.numerator *
      10n ** BigInt(this.baseCurrency.minorUnit);
    const denominator =
      this.denominator * 10n ** BigInt(this.nativeCurrency.minorUnit);

    const sign = numerator < 0n ? -1n : 1n;
    const absoluteNumerator = numerator < 0n ? -numerator : numerator;
    const quotient = absoluteNumerator / denominator;
    const remainder = absoluteNumerator % denominator;
    const roundedAbsolute =
      remainder * 2n >= denominator ? quotient + 1n : quotient;

    return new Money(sign * roundedAbsolute, this.baseCurrency);
  }

  static fromDecimal(
    decimalRate: string,
    nativeCurrency: Currency,
    baseCurrency: Currency,
  ): FxRate {
    const normalized = decimalRate.trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
      throw new Error("FX rate must be a positive decimal string");
    }
    const [whole, fraction = ""] = normalized.split(".");
    const denominator = 10n ** BigInt(fraction.length);
    const numerator = BigInt(whole) * denominator + BigInt(fraction || "0");
    return new FxRate(numerator, denominator, nativeCurrency, baseCurrency);
  }
}
