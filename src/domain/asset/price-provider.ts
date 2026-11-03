import type { MarketQuote } from "./asset";

export interface PriceRequest {
  assetId: string;
  providerSymbol: string;
  quoteCurrency: "USD" | "USDT";
}

export interface PriceProvider {
  readonly source: MarketQuote["source"];
  getPrice(request: PriceRequest): Promise<MarketQuote>;
}
