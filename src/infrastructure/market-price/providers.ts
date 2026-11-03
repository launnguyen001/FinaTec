import type { MarketQuote, QuoteSource } from "../../domain/asset/asset";
import type { PriceProvider, PriceRequest } from "../../domain/asset/price-provider";
export type { PriceProvider, PriceRequest } from "../../domain/asset/price-provider";

async function readJson(
  url: string,
  headers?: Record<string, string>,
): Promise<unknown> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const error = new Error(
      "Price provider returned HTTP " + response.status,
    ) as Error & {
      status?: number;
      retryAfter?: string | null;
    };
    error.status = response.status;
    error.retryAfter = retryAfter;
    throw error;
  }
  return response.json() as Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function quote(
  request: PriceRequest,
  source: QuoteSource,
  price: unknown,
  observedAt: unknown,
  conversionBasis?: "USDT_USD_PARITY",
): MarketQuote {
  const numeric = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Provider returned an invalid market price");
  }
  const observed =
    typeof observedAt === "string"
      ? observedAt
      : typeof observedAt === "number"
        ? new Date(observedAt * 1000).toISOString()
        : new Date().toISOString();
  return {
    assetId: request.assetId,
    price: numeric.toString(),
    currencyCode: request.quoteCurrency,
    source,
    status: "FRESH",
    observedAt: observed,
    capturedAt: new Date().toISOString(),
    ...(conversionBasis ? { conversionBasis } : {}),
  };
}

export class CoinPaprikaProvider implements PriceProvider {
  readonly source = "COINPAPRIKA" as const;

  async getPrice(request: PriceRequest): Promise<MarketQuote> {
    const data = await readJson(
      "https://api.coinpaprika.com/v1/tickers/" +
        encodeURIComponent(request.providerSymbol),
    );
    if (
      !isRecord(data) ||
      !isRecord(data.quotes) ||
      !isRecord(data.quotes.USD)
    ) {
      throw new Error("CoinPaprika response is missing USD quote data");
    }
    const usd = data.quotes.USD;
    return quote(
      request,
      this.source,
      usd.price,
      data.last_updated,
      request.quoteCurrency === "USDT" ? "USDT_USD_PARITY" : undefined,
    );
  }
}

export class CoinGeckoDemoProvider implements PriceProvider {
  readonly source = "COINGECKO" as const;

  constructor(private readonly apiKey: string) {
    if (!apiKey.trim()) throw new Error("CoinGecko Demo API key is required");
  }

  async getPrice(request: PriceRequest): Promise<MarketQuote> {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=" +
      encodeURIComponent(request.providerSymbol) +
      "&vs_currencies=usd&include_last_updated_at=true";
    const data = await readJson(url, { "x-cg-demo-api-key": this.apiKey });
    if (!isRecord(data)) {
      throw new Error(
        "CoinGecko response does not contain the requested asset",
      );
    }
    const item = data[request.providerSymbol];
    if (!isRecord(item)) {
      throw new Error(
        "CoinGecko response does not contain the requested asset",
      );
    }
    return quote(
      request,
      this.source,
      item.usd,
      item.last_updated_at,
      request.quoteCurrency === "USDT" ? "USDT_USD_PARITY" : undefined,
    );
  }
}

export class FrankfurterProvider {
  async getRate(
    base: string,
    quoteCurrency: string,
  ): Promise<{
    rate: string;
    observedAt: string;
    source: "FRANKFURTER";
  }> {
    const url =
      "https://api.frankfurter.dev/v2/rates?base=" +
      encodeURIComponent(base.toUpperCase()) +
      "&quotes=" +
      encodeURIComponent(quoteCurrency.toUpperCase());
    const data = await readJson(url);
    if (!Array.isArray(data) || !isRecord(data[0])) {
      throw new Error("Frankfurter response does not contain an FX rate");
    }
    const row = data[0];
    const rate = Number(row.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Frankfurter returned an invalid FX rate");
    }
    return {
      rate: rate.toString(),
      observedAt:
        typeof row.date === "string" ? row.date : new Date().toISOString(),
      source: "FRANKFURTER",
    };
  }
}

export class FallbackPriceProvider implements PriceProvider {
  readonly source: QuoteSource;

  constructor(private readonly providers: readonly PriceProvider[]) {
    if (providers.length === 0)
      throw new Error("At least one price provider is required");
    this.source = providers[0]!.source;
  }

  async getPrice(request: PriceRequest): Promise<MarketQuote> {
    const failures: string[] = [];
    for (const provider of this.providers) {
      try {
        return await provider.getPrice(request);
      } catch (error) {
        failures.push(
          provider.source +
            ": " +
            (error instanceof Error ? error.message : "unknown error"),
        );
      }
    }
    throw new Error("All price providers failed. " + failures.join(" | "));
  }
}
