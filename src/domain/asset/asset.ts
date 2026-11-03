export type AssetValuationModel = "STABLE_VALUE" | "MARKET_VALUED";
export type AssetLotStatus = "ACTIVE" | "MERGED" | "CLOSED";
export type QuoteSource = "COINPAPRIKA" | "COINGECKO" | "FRANKFURTER" | "METALS_PROVIDER" | "MANUAL";
export type QuoteStatus = "FRESH" | "STALE" | "REJECTED";

export interface AssetLot {
  id: string;
  assetId: string;
  currencyCode: string;
  quantity: string;
  remainingQuantity: string;
  costBasisMinor: bigint;
  remainingCostBasisMinor: bigint;
  acquiredAt: string;
  status: AssetLotStatus;
}

export interface DcaAggregate {
  assetId: string;
  currencyCode: string;
  quantity: string;
  costBasisMinor: bigint;
  weightedAverageUnitCostMinor: string;
  componentIds: string[];
}

export interface MarketQuote {
  assetId: string;
  price: string;
  currencyCode: string;
  source: QuoteSource;
  status: QuoteStatus;
  observedAt: string;
  capturedAt: string;
  conversionBasis?: "USDT_USD_PARITY";
}

export interface DailyValuation {
  assetId: string;
  valuationDate: string;
  quantity: string;
  unitPrice: string;
  totalValue: string;
  currencyCode: string;
  source: QuoteSource;
  quoteStatus: QuoteStatus;
  observedAt: string;
  capturedAt: string;
  closedAt: string | null;
}

export interface PurchaseCalculation {
  quantity: string;
  grossPurchaseMinor: bigint;
  feeMinor: bigint;
  totalCashOutflowMinor: bigint;
  assetCostBasisMinor: bigint;
}

export function multiplyDecimalToMinor(params: {
  quantity: string;
  quantityPrecision: number;
  unitPrice: string;
  pricePrecision: number;
  currencyMinorUnit: number;
}): bigint {
  const quantity = decimalParts(params.quantity, params.quantityPrecision);
  const price = decimalParts(params.unitPrice, params.pricePrecision);
  if (quantity.units <= 0n || price.units <= 0n) {
    throw new Error("Quantity and unit price must be positive");
  }
  if (!Number.isInteger(params.currencyMinorUnit) || params.currencyMinorUnit < 0 || params.currencyMinorUnit > 6) {
    throw new Error("Currency precision must be between 0 and 6");
  }
  const numerator = quantity.units * price.units;
  const denominatorPower = params.quantityPrecision + params.pricePrecision - params.currencyMinorUnit;
  if (denominatorPower <= 0) return numerator * (10n ** BigInt(-denominatorPower));
  const denominator = 10n ** BigInt(denominatorPower);
  return (numerator + denominator / 2n) / denominator;
}

export function calculatePurchase(params: {
  quantity: string;
  unitPrice: string;
  quantityPrecision: number;
  pricePrecision: number;
  currencyMinorUnit: number;
  feeMinor: bigint;
  feeCategoryId: string | null;
}): PurchaseCalculation {
  assertTransactionFee(params.feeMinor, params.feeCategoryId);
  const gross = multiplyDecimalToMinor(params);
  return {
    quantity: normalizeDecimal(params.quantity, params.quantityPrecision),
    grossPurchaseMinor: gross,
    feeMinor: params.feeMinor,
    totalCashOutflowMinor: gross + params.feeMinor,
    assetCostBasisMinor: gross,
  };
}

export interface SaleCalculation {
  quantitySold: string;
  remainingQuantity: string;
  costBasisSoldMinor: bigint;
  remainingCostBasisMinor: bigint;
  grossProceedsMinor: bigint;
  feeMinor: bigint;
  netCashReceivedMinor: bigint;
  realizedGainLossBeforeFeeMinor: bigint;
  realizedGainLossAfterFeeMinor: bigint;
}

function decimalParts(value: string, precision: number): { units: bigint; scale: bigint } {
  const normalized = value.trim();
  if (!Number.isInteger(precision) || precision < 0 || precision > 12) {
    throw new Error("Decimal precision must be between 0 and 12");
  }
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(normalized)) {
    throw new Error("Decimal value must be a non-negative plain decimal");
  }
  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > precision) {
    throw new Error("Decimal value exceeds configured precision");
  }
  const scale = 10n ** BigInt(precision);
  const digits = precision === 0 ? "" : (fraction + "0".repeat(precision)).slice(0, precision);
  return { units: BigInt(whole) * scale + BigInt(digits || "0"), scale };
}

export function normalizeDecimal(value: string, precision: number): string {
  const { units, scale } = decimalParts(value, precision);
  const whole = units / scale;
  if (precision === 0) return whole.toString();
  const fraction = (units % scale).toString().padStart(precision, "0").replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

function formatUnits(units: bigint, precision: number): string {
  const scale = 10n ** BigInt(precision);
  const whole = units / scale;
  if (precision === 0) return whole.toString();
  const fraction = (units % scale).toString().padStart(precision, "0").replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

export function aggregateDcaLots(lots: readonly AssetLot[], quantityPrecision: number): DcaAggregate {
  if (lots.length < 2) throw new Error("DCA requires at least two source lots");
  const first = lots[0];
  if (!first) throw new Error("DCA source lots are missing");
  const ids = new Set<string>();
  let totalQuantity = 0n;
  let totalCost = 0n;
  for (const lot of lots) {
    if (ids.has(lot.id)) throw new Error("A DCA source lot cannot be selected twice");
    ids.add(lot.id);
    if (lot.assetId !== first.assetId || lot.currencyCode !== first.currencyCode) {
      throw new Error("DCA lots must belong to the same asset and currency");
    }
    if (lot.status !== "ACTIVE") throw new Error("Only ACTIVE lots can be merged into DCA");
    const quantity = decimalParts(lot.remainingQuantity, quantityPrecision).units;
    if (quantity <= 0n) throw new Error("DCA source lot must have positive remaining quantity");
    totalQuantity += quantity;
    if (lot.remainingCostBasisMinor < 0n || lot.remainingCostBasisMinor > lot.costBasisMinor) {
      throw new Error("Remaining lot cost basis must be between zero and original cost basis");
    }
    totalCost += lot.remainingCostBasisMinor;
  }
  if (totalQuantity <= 0n) throw new Error("DCA aggregate quantity must be positive");
  const weightedAverage = (totalCost * (10n ** BigInt(quantityPrecision))) / totalQuantity;
  return {
    assetId: first.assetId,
    currencyCode: first.currencyCode,
    quantity: formatUnits(totalQuantity, quantityPrecision),
    costBasisMinor: totalCost,
    weightedAverageUnitCostMinor: formatUnits(weightedAverage, quantityPrecision),
    componentIds: [...ids],
  };
}

export function calculateSale(params: {
  lot: AssetLot;
  quantitySold: string;
  quantityPrecision: number;
  grossProceedsMinor: bigint;
  feeMinor: bigint;
}): SaleCalculation {
  const { lot, quantitySold, quantityPrecision, grossProceedsMinor, feeMinor } = params;
  if (lot.status !== "ACTIVE") throw new Error("Only an ACTIVE lot can be sold");
  if (grossProceedsMinor < 0n || feeMinor < 0n) throw new Error("Sale proceeds and fee cannot be negative");
  const remaining = decimalParts(lot.remainingQuantity, quantityPrecision).units;
  if (lot.remainingCostBasisMinor < 0n || lot.remainingCostBasisMinor > lot.costBasisMinor) {
    throw new Error("Remaining lot cost basis must be between zero and original cost basis");
  }
  const sold = decimalParts(quantitySold, quantityPrecision).units;
  if (sold <= 0n) throw new Error("Sale quantity must be positive");
  if (sold > remaining) throw new Error("Sale quantity exceeds the selected lot's remaining quantity");
  if (feeMinor > grossProceedsMinor) throw new Error("Sale fee cannot exceed gross proceeds");
  const costSold = sold === remaining
    ? lot.remainingCostBasisMinor
    : (lot.remainingCostBasisMinor * sold + remaining / 2n) / remaining;
  const remainingCost = lot.remainingCostBasisMinor - costSold;
  const net = grossProceedsMinor - feeMinor;
  const realizedBeforeFee = grossProceedsMinor - costSold;
  return {
    quantitySold: formatUnits(sold, quantityPrecision),
    remainingQuantity: formatUnits(remaining - sold, quantityPrecision),
    costBasisSoldMinor: costSold,
    remainingCostBasisMinor: remainingCost,
    grossProceedsMinor,
    feeMinor,
    netCashReceivedMinor: net,
    realizedGainLossBeforeFeeMinor: realizedBeforeFee,
    realizedGainLossAfterFeeMinor: realizedBeforeFee - feeMinor,
  };
}

export function resolveQuoteAfterRefresh(
  previous: MarketQuote | null,
  incoming: MarketQuote | null,
): MarketQuote | null {
  if (incoming && incoming.status === "FRESH" && incoming.price.trim() !== "") {
    const parsed = Number(incoming.price);
    if (Number.isFinite(parsed) && parsed > 0) return incoming;
  }
  if (!previous) return null;
  return { ...previous, status: "STALE" };
}

export function resolveAssetTimeZone(
  mode: "DEVICE" | "CUSTOM",
  configuredTimeZone: string,
  deviceTimeZone?: string,
): string {
  const candidate = mode === "DEVICE"
    ? (deviceTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
    : configuredTimeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date(0));
  } catch {
    throw new Error("Configured application timezone is invalid");
  }
  return candidate;
}

export function getValuationDate(timestamp: string, timeZone: string): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw new Error("Valuation timestamp is invalid");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return values.get("year") + "-" + values.get("month") + "-" + values.get("day");
}

export function getMinimumRefreshIntervalMs(
  assetClass: "CRYPTO" | "METAL" | "FIAT_FX",
  configuredMinutes?: number,
): number {
  const defaults = { CRYPTO: 15, METAL: 60, FIAT_FX: 1440 };
  const minimum = 15;
  const maximum = assetClass === "FIAT_FX" ? 10_080 : 1_440;
  const selected = configuredMinutes ?? defaults[assetClass];
  if (!Number.isFinite(selected) || selected < minimum || selected > maximum) {
    throw new Error("Price refresh interval must be between " + minimum + " and " + maximum + " minutes");
  }
  return selected * 60_000;
}

export function canRefreshPrice(params: {
  nowMs: number;
  lastSuccessAtMs: number | null;
  intervalMs: number;
}): boolean {
  if (!Number.isFinite(params.nowMs) || !Number.isFinite(params.intervalMs) || params.intervalMs < 15 * 60_000) {
    throw new Error("Refresh schedule is invalid");
  }
  return params.lastSuccessAtMs === null || params.nowMs - params.lastSuccessAtMs >= params.intervalMs;
}

export function canManualRefresh(lastManualRefreshAtMs: number | null, nowMs: number): boolean {
  if (!Number.isFinite(nowMs)) throw new Error("Current time is invalid");
  return lastManualRefreshAtMs === null || nowMs - lastManualRefreshAtMs >= 30_000;
}

export function getRefreshBackoffMs(failureCount: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs) && retryAfterMs > 0) {
    return retryAfterMs;
  }
  const exponent = Math.max(0, Math.min(10, Math.floor(failureCount)));
  return Math.min(30_000 * 2 ** exponent, 6 * 60 * 60 * 1000);
}

export function assertTransactionFee(feeMinor: bigint, feeCategoryId: string | null): void {
  if (feeMinor < 0n) throw new Error("Transaction fee cannot be negative");
  if (feeMinor > 0n && !feeCategoryId?.trim()) {
    throw new Error("A transaction fee must be assigned to an EXPENSE category");
  }
}
