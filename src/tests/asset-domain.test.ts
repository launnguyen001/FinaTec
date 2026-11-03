import {
  aggregateDcaLots,
  canManualRefresh,
  canRefreshPrice,
  calculatePurchase,
  assertTransactionFee,
  calculateSale,
  getMinimumRefreshIntervalMs,
  getRefreshBackoffMs,
  getValuationDate,
  resolveQuoteAfterRefresh,
  resolveAssetTimeZone,
  sumDecimalQuantities,
  type AssetLot,
  type MarketQuote,
} from "../domain/asset/asset";

const lot = (overrides: Partial<AssetLot> = {}): AssetLot => ({
  id: "lot-1",
  assetId: "btc",
  currencyCode: "USDT",
  quantity: "1",
  remainingQuantity: "1",
  costBasisMinor: 10_000n,
  remainingCostBasisMinor: 10_000n,
  acquiredAt: "2026-11-01T00:00:00.000Z",
  status: "ACTIVE",
  ...overrides,
});

describe("Task04 asset domain rules", () => {
  it("sums current quantities with exact decimal arithmetic", () => {
    expect(sumDecimalQuantities(["0.125", "1.2", "0.00000001"], 8)).toBe(
      "1.32500001",
    );
  });

  it("aggregates DCA lots without mutating their source records", () => {
    const source = [
      lot(),
      lot({
        id: "lot-2",
        quantity: "2",
        remainingQuantity: "2",
        costBasisMinor: 30_000n,
        remainingCostBasisMinor: 30_000n,
      }),
    ];
    const aggregate = aggregateDcaLots(source, 8);
    expect(aggregate.quantity).toBe("3");
    expect(aggregate.costBasisMinor).toBe(40_000n);
    expect(aggregate.componentIds).toEqual(["lot-1", "lot-2"]);
    expect(source[0]?.status).toBe("ACTIVE");
  });

  it("rejects DCA across assets or inactive lots", () => {
    expect(() =>
      aggregateDcaLots([lot(), lot({ id: "other", assetId: "eth" })], 8),
    ).toThrow(/same asset/);
    expect(() =>
      aggregateDcaLots([lot(), lot({ id: "merged", status: "MERGED" })], 8),
    ).toThrow(/ACTIVE/);
  });

  it("sells only the explicitly selected lot quantity and preserves residual basis", () => {
    const result = calculateSale({
      lot: lot({
        remainingQuantity: "2",
        costBasisMinor: 20_000n,
        remainingCostBasisMinor: 20_000n,
      }),
      quantitySold: "0.5",
      quantityPrecision: 8,
      grossProceedsMinor: 15_000n,
      feeMinor: 100n,
    });
    expect(result.remainingQuantity).toBe("1.5");
    expect(result.costBasisSoldMinor).toBe(5_000n);
    expect(result.remainingCostBasisMinor).toBe(15_000n);
    expect(result.netCashReceivedMinor).toBe(14_900n);
    expect(result.realizedGainLossAfterFeeMinor).toBe(9_900n);
  });

  it("allows a sale from a verified DCA component but rejects an unverified merged lot", () => {
    const component = lot({
      status: "MERGED",
      remainingQuantity: "0.5",
      remainingCostBasisMinor: 5_000n,
    });
    expect(() =>
      calculateSale({
        lot: component,
        quantitySold: "0.25",
        quantityPrecision: 8,
        grossProceedsMinor: 2_000n,
        feeMinor: 0n,
      }),
    ).toThrow(/ACTIVE lot or a verified DCA component/);
    const result = calculateSale({
      lot: component,
      isDcaComponent: true,
      quantitySold: "0.25",
      quantityPrecision: 8,
      grossProceedsMinor: 2_000n,
      feeMinor: 0n,
    });
    expect(result.remainingQuantity).toBe("0.25");
    expect(result.costBasisSoldMinor).toBe(2_500n);
    expect(result.remainingCostBasisMinor).toBe(2_500n);
  });

  it("uses remaining cost basis when aggregating a partially sold lot into DCA", () => {
    const aggregate = aggregateDcaLots(
      [
        lot({ remainingQuantity: "0.5", remainingCostBasisMinor: 5_000n }),
        lot({
          id: "lot-2",
          remainingQuantity: "2",
          costBasisMinor: 30_000n,
          remainingCostBasisMinor: 30_000n,
        }),
      ],
      8,
    );
    expect(aggregate.quantity).toBe("2.5");
    expect(aggregate.costBasisMinor).toBe(35_000n);
  });

  it("keeps purchase fee outside the asset cost basis", () => {
    const result = calculatePurchase({
      quantity: "0.25",
      unitPrice: "60000",
      quantityPrecision: 8,
      pricePrecision: 2,
      currencyMinorUnit: 2,
      feeMinor: 125n,
      feeCategoryId: "trading-fee",
    });
    expect(result.grossPurchaseMinor).toBe(1_500_000n);
    expect(result.assetCostBasisMinor).toBe(1_500_000n);
    expect(result.totalCashOutflowMinor).toBe(1_500_125n);
  });

  it("rejects overselling and fee without an expense category", () => {
    expect(() =>
      calculateSale({
        lot: lot(),
        quantitySold: "1.01",
        quantityPrecision: 8,
        grossProceedsMinor: 100n,
        feeMinor: 0n,
      }),
    ).toThrow(/exceeds/);
    expect(() => assertTransactionFee(10n, null)).toThrow(/EXPENSE category/);
    expect(() => assertTransactionFee(0n, null)).not.toThrow();
  });

  it("keeps the last known quote stale when providers fail", () => {
    const previous: MarketQuote = {
      assetId: "btc",
      price: "60000",
      currencyCode: "USDT",
      source: "COINPAPRIKA",
      status: "FRESH",
      observedAt: "2026-11-03T10:00:00.000Z",
      capturedAt: "2026-11-03T10:00:05.000Z",
    };
    expect(resolveQuoteAfterRefresh(previous, null)?.status).toBe("STALE");
    expect(
      resolveQuoteAfterRefresh(previous, {
        ...previous,
        price: "0",
      })?.status,
    ).toBe("STALE");
  });

  it("uses application timezone for valuation date and clamps refresh intervals", () => {
    expect(
      getValuationDate("2026-11-03T18:00:00.000Z", "Asia/Ho_Chi_Minh"),
    ).toBe("2026-11-04");
    expect(getMinimumRefreshIntervalMs("CRYPTO", 15)).toBe(900_000);
    expect(() => getMinimumRefreshIntervalMs("CRYPTO", 1)).toThrow(
      /15 minutes/,
    );
    expect(getMinimumRefreshIntervalMs("FIAT_FX")).toBe(86_400_000);
  });

  it("enforces scheduled refresh intervals and manual cooldown", () => {
    expect(
      canRefreshPrice({
        nowMs: 60_000,
        lastSuccessAtMs: null,
        intervalMs: 900_000,
      }),
    ).toBe(true);
    expect(
      canRefreshPrice({
        nowMs: 60_000,
        lastSuccessAtMs: 0,
        intervalMs: 900_000,
      }),
    ).toBe(false);
    expect(canManualRefresh(0, 29_999)).toBe(false);
    expect(canManualRefresh(0, 30_000)).toBe(true);
  });

  it("uses device timezone by default and validates custom timezone", () => {
    expect(resolveAssetTimeZone("DEVICE", "UTC", "Asia/Ho_Chi_Minh")).toBe(
      "Asia/Ho_Chi_Minh",
    );
    expect(
      resolveAssetTimeZone("CUSTOM", "Europe/London", "Asia/Ho_Chi_Minh"),
    ).toBe("Europe/London");
    expect(() => resolveAssetTimeZone("CUSTOM", "Not/A_Timezone")).toThrow(
      /timezone is invalid/,
    );
  });

  it("uses bounded exponential backoff and Retry-After", () => {
    expect(getRefreshBackoffMs(0)).toBe(30_000);
    expect(getRefreshBackoffMs(20)).toBe(21_600_000);
    expect(getRefreshBackoffMs(1, 120_000)).toBe(120_000);
  });
});
