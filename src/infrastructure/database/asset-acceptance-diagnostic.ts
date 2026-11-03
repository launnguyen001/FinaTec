import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { AssetCatalogService } from "../../application/asset/asset-catalog-service";
import { AssetSettingsService } from "../../application/asset/asset-settings-service";
import { AssetTransactionService } from "../../application/asset/asset-transaction-service";
import { AssetValuationService } from "../../application/asset/asset-valuation-service";
import type {
  AssetLotWrite,
  AssetTransactionWrite,
} from "../../domain/asset/repository";
import type {
  Account,
  JournalEntry,
  JournalLine,
  PostingCommitInput,
} from "../../domain/ledger/repository";
import { SqliteCategoryRepository } from "./category-repository";
import { ledgerMigrations } from "./migrations";
import { ledgerSchema } from "./schema";
import { SqliteAssetRepository } from "./sqlite-asset-repository";
import { SqliteLedgerRepository } from "./sqlite-ledger-repository";

export interface AssetAcceptanceResult {
  databaseName: string;
  fileSizeBytes: number | null;
  cipherVersion: string;
  checks: { name: string; passed: boolean; detail: string }[];
  cleanup: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectFailure(
  action: () => Promise<unknown>,
  pattern: RegExp,
  label: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(pattern.test(message), `${label}: unexpected error: ${message}`);
    return;
  }
  throw new Error(`${label}: command unexpectedly succeeded`);
}

export async function runAssetAcceptanceDiagnostic(): Promise<AssetAcceptanceResult> {
  const suffix = toHex(await Crypto.getRandomBytesAsync(6));
  const databaseName = `task04-asset-acceptance-${suffix}.db`;
  const secureStoreName = `ketso.task04.acceptance.${suffix}`;
  const directory = SQLite.defaultDatabaseDirectory;
  assert(directory, "SQLite database directory is unavailable");
  const fileUri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  const file = new FileSystem.File(fileUri, databaseName);
  assert(!file.exists, "Refusing to open a pre-existing diagnostic database");

  const key = toHex(await Crypto.getRandomBytesAsync(32));
  const checks: AssetAcceptanceResult["checks"] = [];
  let client: SQLite.SQLiteDatabase | null = null;
  let ownsFile = false;
  let cipherVersion = "unavailable";
  let fileSizeBytes: number | null = null;
  const check = (name: string, passed: boolean, detail: string) => {
    checks.push({ name, passed, detail });
    assert(passed, `${name} failed: ${detail}`);
  };

  try {
    await SecureStore.setItemAsync(secureStoreName, key);
    const restoredKey = await SecureStore.getItemAsync(secureStoreName);
    assert(
      restoredKey === key,
      "Diagnostic key could not be read from SecureStore",
    );

    client = await SQLite.openDatabaseAsync(databaseName, {
      useNewConnection: true,
    });
    ownsFile = true;
    const cipher = await client.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    assert(
      cipher?.cipher_version,
      "SQLCipher is unavailable in this Development Build",
    );
    cipherVersion = cipher.cipher_version;
    await client.execAsync(`PRAGMA key = "x'${restoredKey}'"`);
    await client.execAsync("PRAGMA foreign_keys = ON");
    await client.execAsync("PRAGMA journal_mode = WAL");

    const db = drizzle(client, { schema: ledgerSchema });
    const coreMigrations = {
      journal: { entries: ledgerMigrations.journal.entries.slice(0, 2) },
      migrations: {
        m0000: ledgerMigrations.migrations.m0000,
        m0001: ledgerMigrations.migrations.m0001,
      },
    };
    await migrate(db, coreMigrations);

    const timestamp = "2026-11-03T12:00:00.000Z";
    const legacyAccountId = `task04-legacy-cash-${suffix}`;
    await client.runAsync(
      "INSERT INTO accounts (id, name, type, currency_code, is_system, is_archived, subtype, created_at, updated_at) VALUES (?, 'Legacy cash', 'ASSET', 'VND', 0, 0, 'CASH', ?, ?)",
      legacyAccountId,
      timestamp,
      timestamp,
    );
    await client.runAsync(
      "INSERT INTO ledger_settings (id, base_currency_code, created_at, updated_at) VALUES (1, 'VND', ?, ?)",
      timestamp,
      timestamp,
    );
    await migrate(db, ledgerMigrations);

    const ledger = new SqliteLedgerRepository(db);
    const legacyAccount = await ledger.findAccountById(legacyAccountId);
    check(
      "Core Finance → Task04 migration upgrade",
      legacyAccount?.id === legacyAccountId &&
        legacyAccount.isInvestment === false,
      "legacy account and ledger settings survived; new investment flag defaulted to false",
    );
    const settingsRepository = new SqliteAssetRepository(db);
    const settingsService = new AssetSettingsService(settingsRepository, {
      now: () => timestamp,
      deviceTimeZone: () => "Asia/Ho_Chi_Minh",
    });
    const defaults = await settingsService.get();
    check(
      "Asset settings migration",
      defaults.timezoneMode === "DEVICE" &&
        defaults.effectiveTimeZone === "Asia/Ho_Chi_Minh" &&
        defaults.cryptoRefreshMinutes === 15,
      "singleton settings row initialized with device timezone mode and refresh defaults",
    );
    const updatedSettings = await settingsService.update({
      timezoneMode: "CUSTOM",
      timezoneId: "Asia/Ho_Chi_Minh",
      cryptoRefreshMinutes: 30,
      metalRefreshMinutes: 120,
      fiatRefreshMinutes: 1440,
      primaryCryptoProvider: "COINPAPRIKA",
      fallbackCryptoProvider: "COINGECKO",
    });
    check(
      "Asset settings persistence",
      updatedSettings.timezoneMode === "CUSTOM" &&
        (await settingsService.get()).effectiveTimeZone === "Asia/Ho_Chi_Minh",
      "custom timezone and refresh preferences round-tripped",
    );

    const assetRepository = new SqliteAssetRepository(db);
    const categories = new SqliteCategoryRepository(db);
    await ledger.setBaseCurrencyCode("USDT", timestamp);

    const makeAccount = (
      suffixName: string,
      type: Account["type"],
      isInvestment = false,
    ): Account => ({
      id: `task04-${suffix}-${suffixName}`,
      name: `Task04 ${suffixName}`,
      type,
      currencyCode: "USDT",
      isSystem: false,
      isArchived: false,
      subtype: type === "ASSET" ? "OTHER" : null,
      isInvestment,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const cash = makeAccount("cash", "ASSET");
    const investment = makeAccount("investment", "ASSET", true);
    const fee = makeAccount("fee", "EXPENSE");
    const gain = makeAccount("gain", "INCOME");
    const loss = makeAccount("loss", "EXPENSE");
    for (const account of [cash, investment, fee, gain, loss]) {
      await ledger.createAccount(account);
    }
    const feeCategory = await categories.create({
      id: `task04-${suffix}-fee-category`,
      name: "Task04 trading fee",
      kind: "EXPENSE",
      parentId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const wrongFeeCategory = await categories.create({
      id: `task04-${suffix}-wrong-fee-category`,
      name: "Task04 income category",
      kind: "INCOME",
      parentId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    let currentTime = timestamp;
    let sequence = 0;
    const now = () => currentTime;
    const createId = () => `task04-${suffix}-id-${++sequence}`;
    const catalog = new AssetCatalogService(assetRepository, {
      now,
      createId,
    });
    const assetType = await catalog.createAssetType({
      name: "Cryptocurrency",
      assetClass: "CRYPTO",
      valuationModel: "MARKET_VALUED",
      unitCode: "BTC",
      quantityPrecision: 8,
      pricePrecision: 2,
      quoteCurrency: "USDT",
    });
    const asset = await catalog.createAsset({
      assetTypeId: assetType.id,
      name: "Bitcoin",
      symbol: "BTC",
      providerSymbol: "btc-bitcoin",
    });
    const transactions = new AssetTransactionService(
      assetRepository,
      ledger,
      categories,
      { now },
    );
    const valuations = new AssetValuationService(assetRepository, ledger, {
      now,
      createId,
    });

    const journalCount = async () => {
      const row = await client!.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM journal_entries",
      );
      return row?.count ?? 0;
    };

    const rollbackEntryId = `task04-${suffix}-rollback-entry`;
    const rollbackLotId = `task04-${suffix}-rollback-lot`;
    const rollbackTransactionId = `task04-${suffix}-rollback-transaction`;
    const rollbackEntry: JournalEntry = {
      id: rollbackEntryId,
      occurredAt: timestamp,
      description: "Task04 atomic rollback probe",
      status: "POSTED",
      baseCurrencyCode: "USDT",
      idempotencyKey: rollbackEntryId,
      reversalOfId: null,
      replacementOfId: null,
      transactionKind: "ADJUSTMENT",
      categoryId: null,
      createdAt: timestamp,
      postedAt: timestamp,
    };
    const rollbackLine = (
      accountId: string,
      side: "DEBIT" | "CREDIT",
      amountMinor: bigint,
      lineNumber: number,
    ): JournalLine => ({
      id: `${rollbackEntryId}:line:${lineNumber}`,
      entryId: rollbackEntryId,
      lineNumber,
      accountId,
      currencyCode: "USDT",
      side,
      amountMinor,
      fxRateNumerator: "1",
      fxRateDenominator: "1",
      baseAmountMinor: amountMinor,
      memo: "Atomic rollback probe",
      createdAt: timestamp,
    });
    const rollbackLot: AssetLotWrite = {
      id: rollbackLotId,
      assetId: asset.id,
      currencyCode: "USDT",
      quantity: "1",
      remainingQuantity: "1",
      costBasisMinor: 100_000_000,
      remainingCostBasisMinor: 100_000_000,
      acquiredAt: timestamp,
      status: "ACTIVE",
      mergedIntoId: null,
      createdAt: timestamp,
    };
    const rollbackTransaction: AssetTransactionWrite = {
      id: rollbackTransactionId,
      assetId: asset.id,
      transactionKind: "BUY",
      lotId: rollbackLotId,
      quantity: "1",
      executionPrice: "100",
      currencyCode: "USDT",
      grossAmountMinor: 100_000_000n,
      netCashAmountMinor: 101_000_000n,
      costBasisMinor: 100_000_000n,
      feeAmountMinor: 1_000_000n,
      feeCategoryId: wrongFeeCategory.id,
      cashAccountId: cash.id,
      investmentAccountId: investment.id,
      journalEntryId: rollbackEntryId,
      priceQuoteId: null,
      occurredAt: timestamp,
      createdAt: timestamp,
    };
    const rollbackPosting: PostingCommitInput = {
      entry: rollbackEntry,
      lines: [
        rollbackLine(investment.id, "DEBIT", 100_000_000n, 1),
        rollbackLine(fee.id, "DEBIT", 1_000_000n, 2),
        rollbackLine(cash.id, "CREDIT", 101_000_000n, 3),
      ],
    };
    const entriesBeforeRollback = await journalCount();
    await expectFailure(
      () =>
        assetRepository.commitPurchase({
          lot: rollbackLot,
          transaction: rollbackTransaction,
          posting: rollbackPosting,
        }),
      /EXPENSE category/,
      "Asset purchase atomic rollback",
    );
    check(
      "Asset purchase atomic rollback",
      (await journalCount()) === entriesBeforeRollback &&
        (await ledger.findJournalEntryById(rollbackEntryId)) === null &&
        (await assetRepository.getCurrentQuantity(asset.id)) === "0",
      "invalid fee category rolled back Journal Entry, lot and asset transaction together",
    );

    const firstBuy = await transactions.buy({
      assetId: asset.id,
      quantity: "1",
      executionPrice: "100",
      currencyCode: "USDT",
      cashAccountId: cash.id,
      investmentAccountId: investment.id,
      feeMinor: 1_000_000n,
      feeAccountId: fee.id,
      feeCategoryId: feeCategory.id,
      idempotencyKey: `task04-${suffix}-buy-1`,
    });
    const secondBuy = await transactions.buy({
      assetId: asset.id,
      quantity: "0.5",
      executionPrice: "80",
      currencyCode: "USDT",
      cashAccountId: cash.id,
      investmentAccountId: investment.id,
      idempotencyKey: `task04-${suffix}-buy-2`,
    });
    check(
      "Multiple independent acquisition lots",
      firstBuy.created &&
        secondBuy.created &&
        firstBuy.lotId !== secondBuy.lotId &&
        (await assetRepository.getCurrentQuantity(asset.id)) === "1.5",
      "same asset retained two independently priced acquisition lots",
    );

    const firstPartialSale = await transactions.sell({
      assetId: asset.id,
      lotId: firstBuy.lotId,
      quantity: "0.25",
      executionPrice: "120",
      currencyCode: "USDT",
      cashAccountId: cash.id,
      investmentAccountId: investment.id,
      feeMinor: 500_000n,
      feeAccountId: fee.id,
      feeCategoryId: feeCategory.id,
      realizedGainAccountId: gain.id,
      idempotencyKey: `task04-${suffix}-sell-1`,
    });
    assert(firstPartialSale.calculation, "Partial sale calculation is missing");
    check(
      "Partial-sale remaining cost basis",
      firstPartialSale.calculation.costBasisSoldMinor === 25_000_000n &&
        firstPartialSale.calculation.remainingCostBasisMinor === 75_000_000n,
      "selling 0.25 BTC from 1 BTC at 100 USDT leaves 0.75 BTC and 75 USDT cost basis",
    );

    const beforeDcaJournalCount = await journalCount();
    const dca = await transactions.mergeDca([firstBuy.lotId, secondBuy.lotId]);
    check(
      "DCA is non-financial",
      (await journalCount()) === beforeDcaJournalCount &&
        dca.aggregate.quantity === "1.25" &&
        dca.aggregate.costBasisMinor === 115_000_000n,
      "DCA links source lots, uses remaining basis and creates no Journal Entry",
    );

    const dcaSale = await transactions.sell({
      assetId: asset.id,
      lotId: firstBuy.lotId,
      quantity: "0.25",
      executionPrice: "110",
      currencyCode: "USDT",
      cashAccountId: cash.id,
      investmentAccountId: investment.id,
      realizedGainAccountId: gain.id,
      idempotencyKey: `task04-${suffix}-sell-2`,
    });
    assert(dcaSale.calculation, "DCA component sale calculation is missing");
    check(
      "Explicit DCA component disposal",
      dcaSale.calculation.costBasisSoldMinor === 25_000_000n &&
        (await assetRepository.getCurrentQuantity(asset.id)) === "1",
      "sale reduced only the selected component lot and retained 1 BTC",
    );

    currentTime = "2026-11-03T13:00:00.000Z";
    await valuations.recordQuote(
      {
        assetId: asset.id,
        price: "115",
        currencyCode: "USDT",
        source: "COINPAPRIKA",
        status: "FRESH",
        observedAt: currentTime,
        capturedAt: currentTime,
      },
      "Asia/Ho_Chi_Minh",
    );
    const sameDayHistory = await valuations.getHistory(asset.id);
    currentTime = "2026-11-03T14:00:00.000Z";
    await valuations.recordQuote(
      {
        assetId: asset.id,
        price: "120",
        currencyCode: "USDT",
        source: "COINPAPRIKA",
        status: "FRESH",
        observedAt: currentTime,
        capturedAt: currentTime,
      },
      "Asia/Ho_Chi_Minh",
    );
    const updatedSameDayHistory = await valuations.getHistory(asset.id);
    check(
      "Daily valuation same-day upsert",
      sameDayHistory.length === 1 &&
        updatedSameDayHistory.length === 1 &&
        updatedSameDayHistory[0]?.id === sameDayHistory[0]?.id &&
        updatedSameDayHistory[0]?.totalValue === "120.000000",
      "multiple same-day quotes update one open snapshot rather than append rows",
    );

    currentTime = "2026-11-04T12:00:00.000Z";
    await valuations.recordQuote(
      {
        assetId: asset.id,
        price: "120",
        currencyCode: "USDT",
        source: "COINPAPRIKA",
        status: "FRESH",
        observedAt: currentTime,
        capturedAt: currentTime,
      },
      "Asia/Ho_Chi_Minh",
    );
    const history = await valuations.getHistory(asset.id);
    const performance = await valuations.getUnrealizedPnl(asset.id);
    check(
      "Daily snapshot rollover and history",
      history.length === 2 &&
        history[0]?.closedAt !== null &&
        history[1]?.closedAt === null &&
        performance.calculation?.unrealizedPnlMinor === 30_000_000n,
      "new local day closed the prior snapshot; current valuation 120 minus remaining cost basis 90 = 30 USDT unrealized gain",
    );

    await expectFailure(
      () => catalog.archiveAsset(asset.id),
      /remaining quantity is zero/,
      "Archive with non-zero holdings",
    );
    check(
      "Archive balance guard",
      !(await assetRepository.findAssetForTransaction(asset.id))?.asset
        .isArchived,
      "asset with non-zero remaining quantity remains active",
    );

    await transactions.sell({
      assetId: asset.id,
      lotId: firstBuy.lotId,
      quantity: "0.5",
      executionPrice: "120",
      currencyCode: "USDT",
      cashAccountId: cash.id,
      investmentAccountId: investment.id,
      realizedGainAccountId: gain.id,
      idempotencyKey: `task04-${suffix}-sell-3`,
    });
    await transactions.sell({
      assetId: asset.id,
      lotId: secondBuy.lotId,
      quantity: "0.5",
      executionPrice: "120",
      currencyCode: "USDT",
      cashAccountId: cash.id,
      investmentAccountId: investment.id,
      realizedGainAccountId: gain.id,
      idempotencyKey: `task04-${suffix}-sell-4`,
    });
    check(
      "DCA close and zero-quantity archive",
      (await assetRepository.getCurrentQuantity(asset.id)) === "0",
      "all selected component quantities were disposed and the DCA aggregate closed",
    );
    await catalog.archiveAsset(asset.id);
    await catalog.archiveAssetType(assetType.id);
    check(
      "Archive lifecycle",
      (await assetRepository.findAssetForTransaction(asset.id))?.asset
        .isArchived === true &&
        (await catalog.listAssetTypes(true)).find(
          (item) => item.id === assetType.id,
        )?.isArchived === true,
      "zero-quantity asset archived before its now-empty asset type",
    );

    const refreshState = {
      providerKey: `CRYPTO:${asset.id}`,
      lastAttemptAt: timestamp,
      lastSuccessAt: timestamp,
      failureCount: 0,
      nextAttemptAt: null,
      lastError: null,
    };
    await assetRepository.saveRefreshState(refreshState);
    const persistedRefreshState = await assetRepository.getRefreshState(
      refreshState.providerKey,
    );
    check(
      "Refresh state persistence",
      persistedRefreshState.lastSuccessAt === timestamp &&
        persistedRefreshState.failureCount === 0,
      "provider cooldown/backoff state round-tripped through SQLite",
    );

    fileSizeBytes = file.exists ? file.size : null;
    check(
      "Database file evidence",
      (fileSizeBytes ?? 0) > 0,
      `${databaseName}; ${fileSizeBytes ?? 0} bytes; SQLCipher ${cipherVersion}`,
    );
    return {
      databaseName,
      fileSizeBytes,
      cipherVersion,
      checks,
      cleanup:
        "isolated SQLCipher database and unique SecureStore key removed after result",
    };
  } finally {
    if (client) await client.closeAsync();
    if (ownsFile) await SQLite.deleteDatabaseAsync(databaseName);
    await SecureStore.deleteItemAsync(secureStoreName);
  }
}
