import { AssetPriceRefreshService } from "../application/asset/asset-price-refresh-service";
import { AssetSettingsService } from "../application/asset/asset-settings-service";
import { AssetValuationService } from "../application/asset/asset-valuation-service";
import type { PriceProvider } from "../domain/asset/price-provider";
import type { AssetRepository } from "../domain/asset/repository";

const now = "2026-11-03T12:00:00.000Z";
const quote = {
  assetId: "btc",
  price: "100000",
  currencyCode: "USDT",
  source: "COINPAPRIKA" as const,
  status: "FRESH" as const,
  observedAt: now,
  capturedAt: now,
  conversionBasis: "USDT_USD_PARITY" as const,
};

function createHarness(overrides?: {
  state?: {
    providerKey: string;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    failureCount: number;
    nextAttemptAt: string | null;
    lastError: string | null;
  };
  latestQuote?: typeof quote | null;
  provider?: PriceProvider;
}) {
  const assets = {
    findAssetForTransaction: jest.fn().mockResolvedValue({
      asset: {
        id: "btc",
        assetTypeId: "crypto",
        name: "Bitcoin",
        symbol: "BTC",
        providerSymbol: "btc-bitcoin",
        quoteCurrency: "USDT",
        isArchived: false,
      },
      assetType: {
        id: "crypto",
        name: "Cryptocurrency",
        assetClass: "CRYPTO",
        valuationModel: "MARKET_VALUED",
        unitCode: "BTC",
        quantityPrecision: 8,
        pricePrecision: 2,
        quoteCurrency: "USDT",
        isArchived: false,
      },
    }),
    getRefreshState: jest.fn().mockResolvedValue(
      overrides?.state ?? {
        providerKey: "CRYPTO:btc",
        lastAttemptAt: null,
        lastSuccessAt: null,
        failureCount: 0,
        nextAttemptAt: null,
        lastError: null,
      },
    ),
    saveRefreshState: jest.fn().mockResolvedValue(undefined),
    getLatestQuote: jest.fn().mockResolvedValue(overrides?.latestQuote ?? null),
  } as unknown as AssetRepository;
  const settings = {
    get: jest.fn().mockResolvedValue({
      timezoneMode: "DEVICE",
      timezoneId: "UTC",
      effectiveTimeZone: "Asia/Ho_Chi_Minh",
      cryptoRefreshMinutes: 15,
      metalRefreshMinutes: 60,
      fiatRefreshMinutes: 1440,
      primaryCryptoProvider: "COINPAPRIKA",
      fallbackCryptoProvider: "COINGECKO",
      updatedAt: now,
    }),
  } as unknown as AssetSettingsService;
  const valuations = {
    recordQuote: jest.fn().mockResolvedValue(null),
  } as unknown as AssetValuationService;
  const provider =
    overrides?.provider ??
    ({
      source: "COINPAPRIKA",
      getPrice: jest.fn().mockResolvedValue(quote),
    } satisfies PriceProvider);
  const createProvider = jest.fn().mockResolvedValue(provider);
  const service = new AssetPriceRefreshService(assets, settings, valuations, {
    now: () => now,
    createProvider,
  });
  return { service, assets, settings, valuations, provider, createProvider };
}

describe("AssetPriceRefreshService", () => {
  it("records a fresh quote and clears provider backoff after success", async () => {
    const harness = createHarness();

    await expect(harness.service.refreshAsset("btc")).resolves.toEqual({
      assetId: "btc",
      status: "UPDATED",
    });

    expect(harness.createProvider).toHaveBeenCalledWith(
      "COINPAPRIKA",
      "COINGECKO",
    );
    expect(harness.valuations.recordQuote).toHaveBeenCalledWith(
      quote,
      "Asia/Ho_Chi_Minh",
    );
    expect(harness.assets.saveRefreshState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        providerKey: "CRYPTO:btc",
        lastSuccessAt: now,
        failureCount: 0,
        nextAttemptAt: null,
        lastError: null,
      }),
    );
  });

  it("honors the 30-second manual refresh cooldown", async () => {
    const harness = createHarness({
      state: {
        providerKey: "CRYPTO:btc",
        lastAttemptAt: "2026-11-03T11:59:50.000Z",
        lastSuccessAt: null,
        failureCount: 0,
        nextAttemptAt: null,
        lastError: null,
      },
    });

    await expect(harness.service.refreshAsset("btc", true)).resolves.toEqual({
      assetId: "btc",
      status: "SKIPPED",
      reason: "Manual refresh cooldown is 30 seconds",
    });
    expect(harness.createProvider).not.toHaveBeenCalled();
  });

  it("uses Retry-After backoff and marks the previous quote stale", async () => {
    const provider: PriceProvider = {
      source: "COINPAPRIKA",
      getPrice: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("rate limited"), { retryAfter: "120" }),
        ),
    };
    const harness = createHarness({
      provider,
      latestQuote: quote,
    });

    await expect(harness.service.refreshAsset("btc")).rejects.toThrow(
      "rate limited",
    );

    expect(harness.assets.saveRefreshState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        failureCount: 1,
        nextAttemptAt: "2026-11-03T12:02:00.000Z",
        lastError: "rate limited",
      }),
    );
    expect(harness.valuations.recordQuote).toHaveBeenCalledWith(
      expect.objectContaining({ status: "STALE", capturedAt: now }),
      "Asia/Ho_Chi_Minh",
    );
  });
});
