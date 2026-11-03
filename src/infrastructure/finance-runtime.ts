import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { AccountService } from "../application/account/account-service";
import { AssetTransactionService } from "../application/asset/asset-transaction-service";
import { AssetCatalogService } from "../application/asset/asset-catalog-service";
import { AssetValuationService } from "../application/asset/asset-valuation-service";
import { AssetSettingsService } from "../application/asset/asset-settings-service";
import { AssetPriceRefreshService } from "../application/asset/asset-price-refresh-service";
import {
  CoinGeckoDemoProvider,
  CoinPaprikaProvider,
  FallbackPriceProvider,
  type PriceProvider,
} from "./market-price/providers";
import { CategoryService } from "../application/category/category-service";
import { DashboardService } from "../application/finance/dashboard-service";
import { FinanceTransactionService } from "../application/finance/finance-transaction-service";
import { TransactionHistoryService } from "../application/finance/transaction-history-service";
import { AccountingService } from "../application/ledger/accounting-service";
import { SqliteAccountRepository } from "./database/account-repository";
import { SqliteCategoryRepository } from "./database/category-repository";
import { getLedgerDatabase } from "./database/database";
import { SqliteFinanceReadRepository } from "./database/finance-read-repository";
import { SqliteLedgerRepository } from "./database/sqlite-ledger-repository";
import { SqliteAssetRepository } from "./database/sqlite-asset-repository";

export async function createFinanceRuntime() {
  const db = await getLedgerDatabase();
  const ledger = new SqliteLedgerRepository(db);
  const assetRepository = new SqliteAssetRepository(db);
  const accountRepository = new SqliteAccountRepository(db);
  const categoryRepository = new SqliteCategoryRepository(db);
  const readRepository = new SqliteFinanceReadRepository(db);
  const now = () => new Date().toISOString();
  const createId = () => Crypto.randomUUID();
  const accounting = new AccountingService(ledger, { createId, now });
  const assetValuations = new AssetValuationService(assetRepository, ledger, {
    now,
    createId,
  });
  const assetSettings = new AssetSettingsService(assetRepository, {
    now,
    deviceTimeZone: () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  return {
    createId,
    ledger,
    assetRepository,
    assetCatalog: new AssetCatalogService(assetRepository, { now, createId }),
    assetTransactions: new AssetTransactionService(
      assetRepository,
      ledger,
      categoryRepository,
      { now },
    ),
    assetValuations,
    assetSettings,
    assetPriceRefresh: new AssetPriceRefreshService(
      assetRepository,
      assetSettings,
      assetValuations,
      {
        now,
        createProvider: async (primary, fallback) => {
          const apiKey = await SecureStore.getItemAsync(
            "ketso.asset.coingecko-demo-key.v1",
          );
          const providerMap: Record<string, PriceProvider> = {
            COINPAPRIKA: new CoinPaprikaProvider(),
          };
          if (apiKey?.trim()) {
            providerMap.COINGECKO = new CoinGeckoDemoProvider(apiKey);
          }
          const providers = [primary, fallback]
            .map((name) => providerMap[name])
            .filter(
              (provider): provider is PriceProvider => provider !== undefined,
            );
          if (providers.length === 0) {
            throw new Error(
              "No configured crypto provider is available; configure a CoinGecko Demo key or enable CoinPaprika",
            );
          }
          return new FallbackPriceProvider(providers);
        },
      },
    ),
    accounts: new AccountService(accountRepository, ledger, { createId, now }),
    categories: new CategoryService(categoryRepository, { createId, now }),
    transactions: new FinanceTransactionService(
      accounting,
      ledger,
      categoryRepository,
      { now },
    ),
    dashboard: new DashboardService(ledger, accounting, readRepository),
    history: new TransactionHistoryService(readRepository),
  };
}

export type FinanceRuntime = Awaited<ReturnType<typeof createFinanceRuntime>>;
