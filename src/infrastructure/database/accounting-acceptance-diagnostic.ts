import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { AccountingService } from "../../application/ledger/accounting-service";
import type { Account } from "../../domain/ledger/repository";
import { ledgerMigrations } from "./migrations";
import { ledgerSchema } from "./schema";
import { SqliteLedgerRepository } from "./sqlite-ledger-repository";

export interface AccountingAcceptanceResult {
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
    assert(
      pattern.test(message),
      `${label}: unexpected error message: ${message}`,
    );
    return;
  }
  throw new Error(`${label}: command unexpectedly succeeded`);
}

export async function runAccountingAcceptanceDiagnostic(): Promise<AccountingAcceptanceResult> {
  const suffix = toHex(await Crypto.getRandomBytesAsync(6));
  const databaseName = `task02-acceptance-${suffix}.db`;
  const secureStoreName = `ketso.task02.acceptance.${suffix}`;
  const directory = SQLite.defaultDatabaseDirectory;
  assert(directory, "SQLite database directory is unavailable");
  const fileUri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  const file = new FileSystem.File(fileUri, databaseName);
  assert(!file.exists, "Refusing to open a pre-existing diagnostic database");

  const key = toHex(await Crypto.getRandomBytesAsync(32));
  const checks: AccountingAcceptanceResult["checks"] = [];
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
    await client.execAsync(`PRAGMA key = "x'${key}'"`);
    await client.execAsync("PRAGMA foreign_keys = ON");
    await client.execAsync("PRAGMA journal_mode = WAL");

    const db = drizzle(client, { schema: ledgerSchema });
    await migrate(db, ledgerMigrations);

    const repository = new SqliteLedgerRepository(db);
    const timestamp = new Date().toISOString();
    let sequence = 0;
    const service = new AccountingService(repository, {
      createId: () => `task02-${suffix}-${++sequence}`,
      now: () => timestamp,
    });

    const makeAccount = (
      id: string,
      name: string,
      type: Account["type"],
      currencyCode: string,
    ): Account => ({
      id: `task02-${suffix}-${id}`,
      name,
      type,
      currencyCode,
      isSystem: false,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const cash = makeAccount("cash", "Acceptance cash", "ASSET", "VND");
    const bank = makeAccount("bank", "Acceptance bank", "ASSET", "VND");
    const openingVnd = makeAccount(
      "opening-vnd",
      "Acceptance opening equity",
      "EQUITY",
      "VND",
    );
    const walletUsd = makeAccount(
      "wallet-usd",
      "Acceptance USD wallet",
      "ASSET",
      "USD",
    );
    const openingUsd = makeAccount(
      "opening-usd",
      "Acceptance opening equity USD",
      "EQUITY",
      "USD",
    );
    const salary = makeAccount("salary", "Acceptance salary", "INCOME", "VND");
    for (const account of [
      cash,
      bank,
      openingVnd,
      walletUsd,
      openingUsd,
      salary,
    ]) {
      await repository.createAccount(account);
    }
    await repository.setBaseCurrencyCode("VND", timestamp);
    check(
      "Accounting fixture",
      true,
      "VND base currency, VND/USD asset and equity accounts created",
    );

    const opening = await service.createOpeningBalance({
      idempotencyKey: `task02-opening-${suffix}`,
      accountId: cash.id,
      offsetAccountId: openingVnd.id,
      amountMinor: 5_000_000n,
    });
    const cashAfterOpening = await service.getAccountBalance(cash.id);
    check(
      "Opening balance posting",
      opening.entry.status === "POSTED" &&
        opening.lines.length === 2 &&
        cashAfterOpening.minorUnits === 5_000_000n,
      "balanced DEBIT cash / CREDIT equity; derived balance = 5,000,000 VND",
    );

    const retry = await service.createOpeningBalance({
      idempotencyKey: `task02-opening-${suffix}`,
      accountId: cash.id,
      offsetAccountId: openingVnd.id,
      amountMinor: 9_000_000n,
    });
    check(
      "Idempotent retry",
      retry.created === false &&
        retry.entry.id === opening.entry.id &&
        (await service.getAccountBalance(cash.id)).minorUnits === 5_000_000n,
      "same idempotency key returned the original entry without new balance",
    );

    const transfer = await service.transferFunds({
      idempotencyKey: `task02-transfer-${suffix}`,
      fromAccountId: cash.id,
      toAccountId: bank.id,
      amountMinor: 1_000_000n,
    });
    const cashAfterTransfer = await service.getAccountBalance(cash.id);
    const bankAfterTransfer = await service.getAccountBalance(bank.id);
    check(
      "Internal transfer",
      transfer.lines.every(
        (line) => repositoryAccountType(line.accountId, cash, bank) === "ASSET",
      ) &&
        cashAfterTransfer.minorUnits === 4_000_000n &&
        bankAfterTransfer.minorUnits === 1_000_000n,
      "4,000,000 VND cash + 1,000,000 VND bank; no INCOME/EXPENSE line",
    );

    const reversal = await service.reverseEntry({
      idempotencyKey: `task02-reversal-${suffix}`,
      originalEntryId: transfer.entry.id,
    });
    check(
      "Reversal",
      reversal.entry.reversalOfId === transfer.entry.id &&
        reversal.lines.every(
          (line, index) => line.side !== transfer.lines[index]!.side,
        ) &&
        (await service.getAccountBalance(cash.id)).minorUnits === 5_000_000n &&
        (await service.getAccountBalance(bank.id)).minorUnits === 0n,
      "linked reversal swapped sides and restored the previous balances",
    );
    await expectFailure(
      () =>
        service.reverseEntry({
          idempotencyKey: `task02-reversal-again-${suffix}`,
          originalEntryId: transfer.entry.id,
        }),
      /already been reversed/,
      "Single reversal guard",
    );
    check(
      "Single reversal guard",
      true,
      "second reversal of the same original was rejected",
    );

    const draft = await service.createDraft({
      idempotencyKey: `task02-draft-${suffix}`,
      description: "Acceptance draft",
      lines: [
        {
          accountId: cash.id,
          side: "DEBIT",
          amountMinor: 250_000n,
          fxRateNumerator: "1",
          fxRateDenominator: "1",
        },
        {
          accountId: salary.id,
          side: "CREDIT",
          amountMinor: 250_000n,
          fxRateNumerator: "1",
          fxRateDenominator: "1",
        },
      ],
    });
    const draftBalance = await service.getAccountBalance(cash.id);
    await service.postDraft(draft.entry.id);
    const postedBalance = await service.getAccountBalance(cash.id);
    check(
      "Draft lifecycle",
      draft.entry.status === "DRAFT" &&
        draftBalance.minorUnits === 5_000_000n &&
        postedBalance.minorUnits === 5_250_000n,
      "draft excluded from balance until posted, then included",
    );

    await expectFailure(
      () =>
        service.postEntry({
          idempotencyKey: `task02-unbalanced-${suffix}`,
          lines: [
            {
              accountId: cash.id,
              side: "DEBIT",
              amountMinor: 1_000n,
              fxRateNumerator: "1",
              fxRateDenominator: "1",
            },
            {
              accountId: salary.id,
              side: "CREDIT",
              amountMinor: 999n,
              fxRateNumerator: "1",
              fxRateDenominator: "1",
            },
          ],
        }),
      /not balanced/,
      "Unbalanced posting",
    );
    check(
      "Unbalanced posting",
      true,
      "unbalanced entry never reached persistence",
    );

    await service.createOpeningBalance({
      idempotencyKey: `task02-opening-usd-${suffix}`,
      accountId: walletUsd.id,
      offsetAccountId: openingUsd.id,
      amountMinor: 10_000n,
      fxRateNumerator: "254505",
      fxRateDenominator: "10",
    });
    const crossCurrency = await service.transferFunds({
      idempotencyKey: `task02-cross-currency-${suffix}`,
      fromAccountId: walletUsd.id,
      toAccountId: bank.id,
      amountMinor: 5_000n,
      toAmountMinor: 1_272_525n,
      fxRateNumerator: "254505",
      fxRateDenominator: "10",
    });
    check(
      "Cross-currency transfer",
      crossCurrency.lines.length === 2 &&
        crossCurrency.lines[0]!.baseAmountMinor ===
          crossCurrency.lines[1]!.baseAmountMinor &&
        (await service.getAccountBalance(walletUsd.id)).minorUnits === 5_000n &&
        (await service.getAccountBalance(bank.id)).minorUnits === 1_272_525n,
      "USD 50.00 -> VND 1,272,525 with equal base snapshots",
    );

    fileSizeBytes = file.exists ? file.size : null;
    check(
      "Database file evidence",
      (fileSizeBytes ?? 0) > 0,
      `${databaseName}; ${fileSizeBytes ?? 0} bytes`,
    );
    return {
      databaseName,
      fileSizeBytes,
      cipherVersion,
      checks,
      cleanup: "test database and unique SecureStore key removed after result",
    };
  } finally {
    if (client) await client.closeAsync();
    if (ownsFile) await SQLite.deleteDatabaseAsync(databaseName);
    await SecureStore.deleteItemAsync(secureStoreName);
  }
}

function repositoryAccountType(
  accountId: string,
  ...accounts: Account[]
): Account["type"] | undefined {
  return accounts.find((account) => account.id === accountId)?.type;
}
