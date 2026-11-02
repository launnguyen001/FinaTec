export class Currency {
  readonly code: string;
  readonly minorUnit: number;

  constructor(code: string, minorUnit: number) {
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCode)) {
      throw new Error("Currency code must be a 3-letter ISO-style code");
    }
    if (!Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > 6) {
      throw new Error("Currency minor unit must be an integer from 0 to 6");
    }
    this.code = normalizedCode;
    this.minorUnit = minorUnit;
  }

  equals(other: Currency): boolean {
    return this.code === other.code && this.minorUnit === other.minorUnit;
  }
}
