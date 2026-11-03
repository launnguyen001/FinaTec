import {
  getMinimumRefreshIntervalMs,
  resolveAssetTimeZone,
} from "../../domain/asset/asset";
import type {
  AssetRepository,
  AssetSettingsRecord,
} from "../../domain/asset/repository";

export interface AssetSettingsServiceOptions {
  now: () => string;
  deviceTimeZone: () => string;
}

export class AssetSettingsService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly options: AssetSettingsServiceOptions,
  ) {}

  async get() {
    const settings = await this.assets.getSettings();
    return {
      ...settings,
      effectiveTimeZone: resolveAssetTimeZone(
        settings.timezoneMode,
        settings.timezoneId,
        this.options.deviceTimeZone(),
      ),
    };
  }

  async update(
    input: Omit<AssetSettingsRecord, "updatedAt">,
  ): Promise<AssetSettingsRecord> {
    const effectiveTimeZone = resolveAssetTimeZone(
      input.timezoneMode,
      input.timezoneId,
      this.options.deviceTimeZone(),
    );
    getMinimumRefreshIntervalMs("CRYPTO", input.cryptoRefreshMinutes);
    getMinimumRefreshIntervalMs("METAL", input.metalRefreshMinutes);
    getMinimumRefreshIntervalMs("FIAT_FX", input.fiatRefreshMinutes);
    if (input.primaryCryptoProvider === input.fallbackCryptoProvider) {
      throw new Error(
        "Primary and fallback crypto providers must be different",
      );
    }
    return this.assets.updateSettings({
      ...input,
      timezoneId:
        input.timezoneMode === "DEVICE"
          ? effectiveTimeZone
          : input.timezoneId.trim(),
      updatedAt: this.options.now(),
    });
  }
}
