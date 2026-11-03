import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { AccountingService } from "../../application/ledger/accounting-service";
import { InterestService } from "../../application/interest/interest-service";
import { Currency } from "../../domain/ledger/currency";
import { calculateAccountBalance } from "../../domain/ledger/posting";
import type {
  Account,
  JournalEntry,
  JournalLine,
} from "../../domain/ledger/repository";
import { SqliteInterestRepository } from "./sqlite-interest-repository";
import { SqliteLedgerRepository } from "./sqlite-ledger-repository";
import { ledgerMigrations } from "./migrations";
import { ledgerSchema } from "./schema";

export interface InterestAcceptanceResult {
  databaseName: string;
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

export async function runInterestAcceptanceDiagnostic(): Promise<InterestAcceptanceResult> {
  const suffix = toHex(await Crypto.getRandomBytesAsync(6));
  const databaseName = `task05-interest-acceptance-${suffix}.db`;
  const secureStoreName = `ketso.task05.acceptance.${suffix}`;
  const directory = SQLite.defaultDatabaseDirectory;
  assert(directory, "SQLite database directory is unavailable");
  const fileUri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  const file = new FileSystem.File(fileUri, databaseName);
  assert(!file.exists, "Refusing to open a pre-existing diagnostic database");

  const key = toHex(await Crypto.getRandomBytesAsync(32));
  const checks: InterestAcceptanceResult["checks"] = [];
  let client: SQLite.SQLiteDatabase | null = null;
  let cipherVersion = "unavailable";
  let currentTime = "2027-01-01T00:00:00.000Z";
  let sequence = 0;
  const now = () => currentTime;
  const createId = () => `task05-${suffix}-id-${++sequence}`;
  const check = (name: string, passed: boolean, detail: string) => {
    checks.push({ name, passed, detail });
    assert(passed, `${name} failed: ${detail}`);
  };

  try {
    await SecureStore.setItemAsync(secureStoreName, key);
    const restoredKey = await SecureStore.getItemAsync(secureStoreName);
    assert(
      restoredKey === key,
      "Diagnostic SQLCipher key could not be restored",
    );

    client = await SQLite.openDatabaseAsync(databaseName, {
      useNewConnection: true,
    });
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
    const legacyAt = "2026-01-01T00:00:00.000Z";
    const legacyId = `task05-${suffix}-legacy`;
    await client.runAsync(
      "INSERT INTO accounts (id, name, type, currency_code, is_system, is_archived, subtype, created_at, updated_at) VALUES (?, 'Legacy cash', 'ASSET', 'VND', 0, 0, 'CASH', ?, ?)",
      legacyId,
      legacyAt,
      legacyAt,
    );
    await client.runAsync(
      "INSERT INTO ledger_settings (id, base_currency_code, created_at, updated_at) VALUES (1, 'VND', ?, ?)",
      legacyAt,
      legacyAt,
    );
    await migrate(db, ledgerMigrations);

    const ledger = new SqliteLedgerRepository(db);
    const legacy = await ledger.findAccountById(legacyId);
    const planTable = await client.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'interest_plans'",
    );
    check(
      "Core Finance upgrade and Task05 migration",
      legacy?.id === legacyId &&
        legacy.isInvestment === false &&
        planTable?.name === "interest_plans",
      "legacy Core Finance account survived and Task05 tables were created by the migration chain",
    );

    await ledger.setBaseCurrencyCode("USDT", legacyAt);
    const makeAccount = (
      suffixName: string,
      type: Account["type"],
      isInvestment = false,
    ): Account => ({
      id: `task05-${suffix}-${suffixName}`,
      name: `Task05 ${suffixName}`,
      type,
      currencyCode: "USDT",
      isSystem: false,
      isArchived: false,
      subtype: type === "ASSET" ? "OTHER" : null,
      isInvestment,
      createdAt: legacyAt,
      updatedAt: legacyAt,
    });
    const principal = makeAccount("principal", "ASSET", true);
    const payout = makeAccount("payout", "ASSET");
    const monthlyPrincipal = makeAccount("monthly-principal", "ASSET", true);
    const monthlyPayout = makeAccount("monthly-payout", "ASSET");
    const income = makeAccount("interest-income", "INCOME");
    const equity = makeAccount("opening-equity", "EQUITY");
    for (const account of [
      principal,
      payout,
      monthlyPrincipal,
      monthlyPayout,
      income,
      equity,
    ]) {
      await ledger.createAccount(account);
    }

    const accounting = new AccountingService(ledger, { createId, now });
    const latePrincipal = makeAccount("late-principal", "ASSET", true);
    await ledger.createAccount(latePrincipal);
    await accounting.createOpeningBalance({
      idempotencyKey: `task05-${suffix}-opening-late-principal`,
      accountId: latePrincipal.id,
      offsetAccountId: equity.id,
      amountMinor: 100_000n,
      occurredAt: "2025-12-31T20:00:00.000Z",
    });
    await accounting.createOpeningBalance({
      idempotencyKey: `task05-${suffix}-opening-principal`,
      accountId: principal.id,
      offsetAccountId: equity.id,
      amountMinor: 100_000n,
      occurredAt: "2025-12-31T12:00:00.000Z",
    });
    await accounting.createOpeningBalance({
      idempotencyKey: `task05-${suffix}-opening-monthly-principal`,
      accountId: monthlyPrincipal.id,
      offsetAccountId: equity.id,
      amountMinor: 100_000n,
      occurredAt: "2026-01-30T12:00:00.000Z",
    });

    const interestRepository = new SqliteInterestRepository(db);
    const interest = new InterestService(interestRepository, ledger, {
      createId,
      now,
      deviceTimeZone: () => "UTC",
    });

    await expectFailure(
      () =>
        interest.createPlan({
          name: "Timezone boundary must reject late funding",
          principalAccountId: latePrincipal.id,
          interestIncomeAccountId: income.id,
          annualRatePpm: 55_000n,
          payoutAccountId: payout.id,
          compounding: "SIMPLE",
          postingFrequency: "AT_MATURITY",
          startDate: "2026-01-01",
          maturityDate: "2027-01-01",
          timezoneId: "Asia/Ho_Chi_Minh",
        }),
      /fully funded before the plan start date/i,
      "Timezone-aware principal start boundary",
    );
    check(
      "Timezone-aware principal start boundary",
      true,
      "a 2025-12-31 20:00Z movement is after 2026-01-01 local midnight in Asia/Ho_Chi_Minh and is rejected",
    );

    const monthlyPlan = await interest.createPlan({
      name: "Month-end catch-up schedule",
      principalAccountId: monthlyPrincipal.id,
      interestIncomeAccountId: income.id,
      payoutAccountId: monthlyPayout.id,
      annualRatePpm: 55_000n,
      compounding: "SIMPLE",
      postingFrequency: "MONTHLY",
      startDate: "2026-01-31",
      maturityDate: "2026-03-31",
      timezoneId: "UTC",
    });
    const monthlyPosted = await interest.catchUp(
      monthlyPlan.id,
      "2026-03-31",
      "PAYOUT",
    );
    const monthlyPayoutBalance = calculateAccountBalance(
      monthlyPayout,
      await ledger.listPostedJournalLinesForAccount(monthlyPayout.id),
      new Currency("USDT", 6),
    );
    check(
      "Monthly catch-up and month-end anchoring",
      monthlyPosted.length === 2 &&
        monthlyPosted.every((item) => item.status === "PAID") &&
        monthlyPayoutBalance.minorUnits === 889n,
      "Jan 31 → Feb 28 (28 days) and Feb 28 → Mar 31 (31 days) posted in order with HALF_UP",
    );
    await interest.setPlanStatus(monthlyPlan.id, "CLOSED");

    const capitalizationPlan = await interest.createPlan({
      name: "One-year capitalization",
      principalAccountId: principal.id,
      interestIncomeAccountId: income.id,
      annualRatePpm: 55_000n,
      compounding: "AFTER_CAPITALIZATION",
      postingFrequency: "AT_MATURITY",
      startDate: "2026-01-01",
      maturityDate: "2027-01-01",
      timezoneId: "UTC",
    });
    await expectFailure(
      () =>
        interest.createPlan({
          name: "Duplicate active principal",
          principalAccountId: principal.id,
          interestIncomeAccountId: income.id,
          annualRatePpm: 55_000n,
          compounding: "AFTER_CAPITALIZATION",
          postingFrequency: "AT_MATURITY",
          startDate: "2026-01-01",
          maturityDate: "2027-01-01",
          timezoneId: "UTC",
        }),
      /already has an active interest plan/i,
      "One active plan per principal account",
    );

    const accrued = await interest.accruePeriod({
      planId: capitalizationPlan.id,
      periodStart: "2026-01-01",
      periodEnd: "2027-01-01",
      kind: "CAPITALIZATION",
    });
    assert(accrued.accrual, "Expected an accrued interest record");
    const principalCurrency = new Currency("USDT", 6);
    const beforeLines = await ledger.listPostedJournalLinesForAccount(
      principal.id,
    );
    const beforeBalance = calculateAccountBalance(
      principal,
      beforeLines,
      principalCurrency,
    );
    check(
      "Accrued does not change Ledger balance",
      accrued.accrual.status === "ACCRUED" &&
        accrued.calculation.amountMinor === 5_500n &&
        beforeBalance.minorUnits === 100_000n,
      "365-day 5.5% APR accrual is exact and remains outside Ledger before posting",
    );

    const beforeCount = await client.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM journal_entries",
    );
    const duplicateLineId = beforeLines.find(
      (line) => line.accountId === principal.id,
    )?.id;
    assert(
      duplicateLineId,
      "Opening-balance principal journal line was not found",
    );
    const rollbackEntryId = `task05-${suffix}-rollback-entry`;
    const rollbackEntry: JournalEntry = {
      id: rollbackEntryId,
      occurredAt: "2027-01-01T00:00:00.000Z",
      description: "Task05 atomic rollback probe",
      status: "POSTED",
      baseCurrencyCode: "USDT",
      idempotencyKey: accrued.accrual.idempotencyKey,
      reversalOfId: null,
      replacementOfId: null,
      transactionKind: "ADJUSTMENT",
      categoryId: null,
      createdAt: currentTime,
      postedAt: currentTime,
    };
    const rollbackLines: JournalLine[] = [
      {
        id: duplicateLineId,
        entryId: rollbackEntryId,
        lineNumber: 1,
        accountId: principal.id,
        currencyCode: "USDT",
        side: "DEBIT",
        amountMinor: 5_500n,
        fxRateNumerator: "1",
        fxRateDenominator: "1",
        baseAmountMinor: 5_500n,
        memo: "Rollback probe",
        createdAt: currentTime,
      },
      {
        id: `${rollbackEntryId}-line-2`,
        entryId: rollbackEntryId,
        lineNumber: 2,
        accountId: income.id,
        currencyCode: "USDT",
        side: "CREDIT",
        amountMinor: 5_500n,
        fxRateNumerator: "1",
        fxRateDenominator: "1",
        baseAmountMinor: 5_500n,
        memo: "Rollback probe",
        createdAt: currentTime,
      },
    ];
    await expectFailure(
      () =>
        interestRepository.commitPostedAccrual({
          accrualId: accrued.accrual!.id,
          journalEntry: rollbackEntry,
          journalLines: rollbackLines,
          postedAt: currentTime,
          amountMinor: 5_500n,
        }),
      /UNIQUE constraint failed/i,
      "Atomic journal/accrual rollback",
    );
    const afterFailureCount = await client.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM journal_entries",
    );
    const afterFailureAccrual = await interestRepository.findAccrualById(
      accrued.accrual.id,
    );
    check(
      "Atomic rollback",
      beforeCount?.count === afterFailureCount?.count &&
        afterFailureAccrual?.status === "ACCRUED" &&
        afterFailureAccrual.journalEntryId === null,
      "journal insert failure rolled back the draft entry and left accrual unchanged",
    );

    const capitalized = await interest.postAccrual(accrued.accrual.id);
    const afterCapitalizationLines =
      await ledger.listPostedJournalLinesForAccount(principal.id);
    const afterCapitalizationBalance = calculateAccountBalance(
      principal,
      afterCapitalizationLines,
      principalCurrency,
    );
    const journalCountAfterPost = await client.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM journal_entries",
    );
    await interest.postAccrual(accrued.accrual.id);
    const journalCountAfterRetry = await client.getFirstAsync<{
      count: number;
    }>("SELECT COUNT(*) AS count FROM journal_entries");
    check(
      "Atomic capitalization and idempotent retry",
      capitalized.status === "POSTED" &&
        capitalized.journalEntryId !== null &&
        afterCapitalizationBalance.minorUnits === 105_500n &&
        journalCountAfterPost?.count === journalCountAfterRetry?.count,
      "principal increased once by 5,500 minor units and retry did not create another journal",
    );

    await interest.setPlanStatus(capitalizationPlan.id, "CLOSED");

    const payoutPlan = await interest.createPlan({
      name: "One-year simple interest payout",
      principalAccountId: principal.id,
      interestIncomeAccountId: income.id,
      payoutAccountId: payout.id,
      annualRatePpm: 55_000n,
      compounding: "SIMPLE",
      postingFrequency: "AT_MATURITY",
      startDate: "2027-01-02",
      maturityDate: "2028-01-02",
      timezoneId: "UTC",
    });
    currentTime = "2028-01-02T00:00:00.000Z";
    const catchUpResults = await interest.catchUp(
      payoutPlan.id,
      "2028-01-02",
      "PAYOUT",
    );
    const paid = catchUpResults[0];
    assert(paid, "Expected at-maturity catch-up to post the payout accrual");
    const principalAfterPayout = calculateAccountBalance(
      principal,
      await ledger.listPostedJournalLinesForAccount(principal.id),
      principalCurrency,
    );
    const payoutBalance = calculateAccountBalance(
      payout,
      await ledger.listPostedJournalLinesForAccount(payout.id),
      principalCurrency,
    );
    check(
      "Simple-interest payout",
      paid.status === "PAID" &&
        payoutBalance.minorUnits === 5_803n &&
        principalAfterPayout.minorUnits === 105_500n,
      "HALF_UP payout credited the receiving asset account without changing deposit principal",
    );

    check(
      "SQLCipher encrypted acceptance database",
      cipherVersion.length > 0,
      `SQLCipher ${cipherVersion} initialized the isolated database`,
    );

    return {
      databaseName,
      cipherVersion,
      checks,
      cleanup:
        "Diagnostic database and temporary SecureStore key are removed in finally.",
    };
  } finally {
    if (client) {
      try {
        await client.closeAsync();
      } catch {
        // Cleanup continues even when the connection was already closed.
      }
    }
    if (file.exists) file.delete();
    await SecureStore.deleteItemAsync(secureStoreName);
  }
}
