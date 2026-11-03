import {
  canManualRefresh,
  canRefreshPrice,
  getMinimumRefreshIntervalMs,
  getRefreshBackoffMs,
} from "../../domain/asset/asset";
import type { AssetRepository } from "../../domain/asset/repository";
import { AssetSettingsService } from "./asset-settings-service";
import { AssetValuationService } from "./asset-valuation-service";
import type { PriceProvider } from "../../domain/asset/price-provider";

export interface AssetPriceRefreshServiceOptions {
  now: () => string;
  createProvider: (
    primary: "COINPAPRIKA" | "COINGECKO",
    fallback: "COINPAPRIKA" | "COINGECKO",
  ) => Promise<PriceProvider>;
}

export interface AssetRefreshOutcome {
  assetId: string;
  status: "UPDATED" | "SKIPPED" | "FAILED";
  reason?: string;
}

export class AssetPriceRefreshService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly settings: AssetSettingsService,
    private readonly valuations: AssetValuationService,
    private readonly options: AssetPriceRefreshServiceOptions,
  ) {}

  async refreshAsset(
    assetId: string,
    manual = false,
  ): Promise<AssetRefreshOutcome> {
    const facts = await this.assets.findAssetForTransaction(assetId);
    if (!facts || facts.asset.isArchived || facts.assetType.isArchived) {
      throw new Error("Asset does not exist or is archived");
    }
    if (facts.assetType.valuationModel !== "MARKET_VALUED") {
      throw new Error("Stable-value assets do not use market price refresh");
    }
    if (facts.assetType.assetClass !== "CRYPTO") {
      throw new Error(
        "No approved market-price provider is configured for this asset class",
      );
    }
    if (facts.asset.quoteCurrency !== "USDT") {
      throw new Error("Crypto market quotes must be normalized to USDT");
    }
    if (!facts.asset.providerSymbol?.trim()) {
      throw new Error(
        "Provider symbol is required before refreshing this asset",
      );
    }

    const settings = await this.settings.get();
    const now = this.options.now();
    const nowMs = Date.parse(now);
    if (!Number.isFinite(nowMs)) {
      throw new Error("Refresh clock returned an invalid timestamp");
    }
    const providerKey = "CRYPTO:" + assetId;
    const previousState = await this.assets.getRefreshState(providerKey);
    if (
      previousState.nextAttemptAt &&
      Date.parse(previousState.nextAttemptAt) > nowMs
    ) {
      return {
        assetId,
        status: "SKIPPED",
        reason: "Provider backoff is active",
      };
    }
    if (
      manual &&
      !canManualRefresh(
        previousState.lastAttemptAt
          ? Date.parse(previousState.lastAttemptAt)
          : null,
        nowMs,
      )
    ) {
      return {
        assetId,
        status: "SKIPPED",
        reason: "Manual refresh cooldown is 30 seconds",
      };
    }
    const intervalMs = getMinimumRefreshIntervalMs(
      "CRYPTO",
      settings.cryptoRefreshMinutes,
    );
    if (
      !manual &&
      !canRefreshPrice({
        nowMs,
        lastSuccessAtMs: previousState.lastSuccessAt
          ? Date.parse(previousState.lastSuccessAt)
          : null,
        intervalMs,
      })
    ) {
      return {
        assetId,
        status: "SKIPPED",
        reason: "Refresh interval has not elapsed",
      };
    }

    await this.assets.saveRefreshState({
      ...previousState,
      lastAttemptAt: now,
    });

    try {
      const provider = await this.options.createProvider(
        settings.primaryCryptoProvider,
        settings.fallbackCryptoProvider,
      );
      const quote = await provider.getPrice({
        assetId,
        providerSymbol: facts.asset.providerSymbol,
        quoteCurrency: facts.asset.quoteCurrency as "USD" | "USDT",
      });
      await this.valuations.recordQuote(quote, settings.effectiveTimeZone);
      await this.assets.saveRefreshState({
        providerKey,
        lastAttemptAt: now,
        lastSuccessAt: now,
        failureCount: 0,
        nextAttemptAt: null,
        lastError: null,
      });
      return { assetId, status: "UPDATED" };
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unknown provider error";
      const retryAfter =
        cause && typeof cause === "object" && "retryAfter" in cause
          ? this.parseRetryAfter(
              (cause as { retryAfter?: string | null }).retryAfter,
              nowMs,
            )
          : undefined;
      const failureCount = previousState.failureCount + 1;
      const backoffMs = getRefreshBackoffMs(failureCount, retryAfter);
      const nextAttemptAt = new Date(nowMs + backoffMs).toISOString();
      await this.assets.saveRefreshState({
        providerKey,
        lastAttemptAt: now,
        lastSuccessAt: previousState.lastSuccessAt,
        failureCount,
        nextAttemptAt,
        lastError: message.slice(0, 500),
      });
      const previousQuote = await this.assets.getLatestQuote(assetId);
      if (previousQuote && previousQuote.status !== "REJECTED") {
        try {
          await this.valuations.recordQuote(
            { ...previousQuote, status: "STALE", capturedAt: now },
            settings.effectiveTimeZone,
          );
        } catch {
          // A stale marker must never hide the original provider failure.
        }
      }
      throw cause;
    }
  }

  async refreshDueAssets(manual = false): Promise<AssetRefreshOutcome[]> {
    const [assets, types] = await Promise.all([
      this.assets.listAssets(),
      this.assets.listAssetTypes(),
    ]);
    const typeById = new Map(types.map((type) => [type.id, type]));
    const eligible = assets.filter((asset) => {
      const type = typeById.get(asset.assetTypeId);
      return (
        type?.assetClass === "CRYPTO" && type.valuationModel === "MARKET_VALUED"
      );
    });
    return Promise.all(
      eligible.map(async (asset): Promise<AssetRefreshOutcome> => {
        if (!asset.providerSymbol?.trim()) {
          return {
            assetId: asset.id,
            status: "SKIPPED",
            reason: "Provider symbol is not configured",
          };
        }
        try {
          return await this.refreshAsset(asset.id, manual);
        } catch (cause) {
          return {
            assetId: asset.id,
            status: "FAILED",
            reason:
              cause instanceof Error ? cause.message : "Unknown provider error",
          };
        }
      }),
    );
  }

  private parseRetryAfter(value: string | null | undefined, nowMs: number) {
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    const date = Date.parse(value);
    return Number.isFinite(date) && date > nowMs ? date - nowMs : undefined;
  }
}
