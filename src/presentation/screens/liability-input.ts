export function parseFxRateRatio(value: string): {
  numerator: string;
  denominator: string;
} {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(normalized)) {
    throw new Error("Tỷ giá phải là số thập phân dương, tối đa 8 chữ số");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(whole!) * denominator + BigInt(fraction || "0");
  if (numerator <= 0n) throw new Error("Tỷ giá phải lớn hơn 0");
  return {
    numerator: numerator.toString(),
    denominator: denominator.toString(),
  };
}

export function splitDecliningPrincipalInput(value: string): string[] {
  return value
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
