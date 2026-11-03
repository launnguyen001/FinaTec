import { FallbackPriceProvider } from "../infrastructure/market-price/providers";
import type {
  PriceProvider,
  PriceRequest,
} from "../domain/asset/price-provider";

const request: PriceRequest = {
  assetId: "btc",
  providerSymbol: "btc-bitcoin",
  quoteCurrency: "USDT",
};

const quote = {
  assetId: "btc",
  price: "100000",
  currencyCode: "USDT",
  source: "COINGECKO" as const,
  status: "FRESH" as const,
  observedAt: "2026-11-03T12:00:00.000Z",
  capturedAt: "2026-11-03T12:00:01.000Z",
  conversionBasis: "USDT_USD_PARITY" as const,
};

describe("FallbackPriceProvider", () => {
  it("uses the next provider when the primary provider fails", async () => {
    const primary: PriceProvider = {
      source: "COINPAPRIKA",
      getPrice: jest.fn().mockRejectedValue(new Error("primary unavailable")),
    };
    const fallback: PriceProvider = {
      source: "COINGECKO",
      getPrice: jest.fn().mockResolvedValue(quote),
    };
    const provider = new FallbackPriceProvider([primary, fallback]);

    await expect(provider.getPrice(request)).resolves.toEqual(quote);
    expect(primary.getPrice).toHaveBeenCalledWith(request);
    expect(fallback.getPrice).toHaveBeenCalledWith(request);
  });

  it("preserves Retry-After when every provider fails", async () => {
    const primaryError = Object.assign(new Error("rate limited"), {
      retryAfter: "45",
    });
    const primary: PriceProvider = {
      source: "COINPAPRIKA",
      getPrice: jest.fn().mockRejectedValue(primaryError),
    };
    const fallback: PriceProvider = {
      source: "COINGECKO",
      getPrice: jest.fn().mockRejectedValue(new Error("offline")),
    };
    const provider = new FallbackPriceProvider([primary, fallback]);

    await expect(provider.getPrice(request)).rejects.toMatchObject({
      retryAfter: "45",
      message: expect.stringContaining("All price providers failed"),
    });
  });
});
