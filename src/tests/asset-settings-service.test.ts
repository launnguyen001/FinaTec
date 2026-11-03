import { AssetSettingsService } from "../application/asset/asset-settings-service";
import type {
  AssetRepository,
  AssetSettingsRecord,
} from "../domain/asset/repository";

const defaults: AssetSettingsRecord = {
  timezoneMode: "DEVICE",
  timezoneId: "UTC",
  cryptoRefreshMinutes: 15,
  metalRefreshMinutes: 60,
  fiatRefreshMinutes: 1440,
  primaryCryptoProvider: "COINPAPRIKA",
  fallbackCryptoProvider: "COINGECKO",
  updatedAt: "2026-11-03T12:00:00.000Z",
};

describe("AssetSettingsService", () => {
  it("resolves device timezone without replacing the stored timezone preference", async () => {
    const repository = {
      getSettings: jest.fn().mockResolvedValue(defaults),
    } as unknown as AssetRepository;
    const service = new AssetSettingsService(repository, {
      now: () => "2026-11-03T12:00:00.000Z",
      deviceTimeZone: () => "Asia/Ho_Chi_Minh",
    });

    const result = await service.get();

    expect(result.timezoneMode).toBe("DEVICE");
    expect(result.timezoneId).toBe("UTC");
    expect(result.effectiveTimeZone).toBe("Asia/Ho_Chi_Minh");
  });

  it("validates and persists custom timezone and refresh intervals", async () => {
    const repository = {
      updateSettings: jest.fn().mockImplementation(async (settings) => settings),
    } as unknown as AssetRepository;
    const service = new AssetSettingsService(repository, {
      now: () => "2026-11-03T12:00:00.000Z",
      deviceTimeZone: () => "UTC",
    });

    const result = await service.update({
      ...defaults,
      timezoneMode: "CUSTOM",
      timezoneId: "Asia/Ho_Chi_Minh",
      cryptoRefreshMinutes: 30,
    });

    expect(result.timezoneId).toBe("Asia/Ho_Chi_Minh");
    expect(result.cryptoRefreshMinutes).toBe(30);
    expect(repository.updateSettings).toHaveBeenCalledWith(result);
  });

  it("rejects refresh intervals below the provider minimum", async () => {
    const repository = {
      updateSettings: jest.fn(),
    } as unknown as AssetRepository;
    const service = new AssetSettingsService(repository, {
      now: () => "2026-11-03T12:00:00.000Z",
      deviceTimeZone: () => "UTC",
    });

    await expect(
      service.update({ ...defaults, cryptoRefreshMinutes: 14 }),
    ).rejects.toThrow();
    expect(repository.updateSettings).not.toHaveBeenCalled();
  });

  it("rejects identical primary and fallback providers", async () => {
    const repository = {
      updateSettings: jest.fn(),
    } as unknown as AssetRepository;
    const service = new AssetSettingsService(repository, {
      now: () => "2026-11-03T12:00:00.000Z",
      deviceTimeZone: () => "UTC",
    });

    await expect(
      service.update({
        ...defaults,
        primaryCryptoProvider: "COINPAPRIKA",
        fallbackCryptoProvider: "COINPAPRIKA",
      }),
    ).rejects.toThrow("must be different");
    expect(repository.updateSettings).not.toHaveBeenCalled();
  });
});
