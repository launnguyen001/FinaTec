import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { ledgerMigrations } from "./migrations";
import { legacyMigration0004 } from "./migrations/legacy-fixtures";
import { ledgerSchema } from "./schema";
import { SqliteLedgerRepository } from "./sqlite-ledger-repository";
import type { LedgerDatabase } from "./database";

export interface CurrencyMigrationDeviceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

const triggerNames = [
  "currencies_code_immutable",
  "currencies_no_precision_change_when_referenced",
];

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Exercises the real Expo SQLite/Drizzle migrator against an isolated SQLCipher
 * database whose recorded 0004 migration matches the historical deployed SQL.
 * The user's production development database is never opened or modified.
 */
export async function runCurrencyMigrationUpgradeDiagnostic(): Promise<
  CurrencyMigrationDeviceCheck[]
> {
  const databaseName = `f02-upgrade-${Date.now()}.db`;
  let client: SQLite.SQLiteDatabase | null = null;
  let encryptionKey: string | null = null;

  try {
    client = await SQLite.openDatabaseAsync(databaseName, {
      useNewConnection: true,
    });
    const cipher = await client.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    if (!cipher?.cipher_version) {
      throw new Error("SQLCipher is unavailable for the isolated migration DB");
    }

    encryptionKey = toHex(await Crypto.getRandomBytesAsync(32));
    await client.execAsync(`PRAGMA key = "x'${encryptionKey}'"`);
    await client.execAsync("PRAGMA foreign_keys = ON");
    await client.execAsync("PRAGMA journal_mode = WAL");

    const db = drizzle(client, { schema: ledgerSchema });
    const migrationSources = ledgerMigrations.migrations as Record<
      string,
      string
    >;
    const legacyEntries = ledgerMigrations.journal.entries.filter(
      (entry) => entry.idx <= 10,
    );
    const legacySources = Object.fromEntries(
      legacyEntries.map((entry) => {
        const index = entry.idx.toString().padStart(4, "0");
        const key = `m${index}`;
        return [
          key,
          key === "m0004" ? legacyMigration0004 : migrationSources[key]!,
        ];
      }),
    );

    await migrate(db, {
      journal: { entries: legacyEntries },
      migrations: legacySources,
    });

    const beforeUpgrade = await client.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
      ...triggerNames,
    );
    if (beforeUpgrade.length !== 0) {
      throw new Error(
        `Legacy 0004-0010 fixture unexpectedly contains currency triggers: ${beforeUpgrade.map((row) => row.name).join(", ")}`,
      );
    }

    const migration0011Entry = ledgerMigrations.journal.entries.find(
      (entry) => entry.idx === 11,
    );
    if (!migration0011Entry) {
      throw new Error("Migration journal entry 0011 is missing");
    }
    await migrate(db, {
      journal: { entries: [migration0011Entry] },
      migrations: { m0011: migrationSources.m0011! },
    });

    const afterUpgrade = await client.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
      ...triggerNames,
    );
    const restoredNames = afterUpgrade.map((row) => row.name).sort();
    if (
      JSON.stringify(restoredNames) !== JSON.stringify([...triggerNames].sort())
    ) {
      throw new Error(
        `Migration 0011 did not restore both currency triggers: ${restoredNames.join(", ") || "none"}`,
      );
    }

    const ledger = new SqliteLedgerRepository(db as unknown as LedgerDatabase);
    const now = new Date().toISOString();
    await ledger.setBaseCurrencyCode("VND", now);
    await ledger.createAccount({
      id: "f02-upgrade-verification-cash",
      name: "F-02 migration verification",
      type: "ASSET",
      currencyCode: "VND",
      subtype: "CASH",
      isSystem: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    let codeMutationRejected = false;
    try {
      await client.runAsync(
        "UPDATE currencies SET code = 'XXX' WHERE code = 'VND'",
      );
    } catch (error) {
      codeMutationRejected =
        error instanceof Error &&
        error.message.includes("currency codes are immutable");
    }

    let precisionMutationRejected = false;
    try {
      await client.runAsync(
        "UPDATE currencies SET minor_unit = 2 WHERE code = 'VND'",
      );
    } catch (error) {
      precisionMutationRejected =
        error instanceof Error &&
        error.message.includes(
          "currency precision is immutable after first use",
        );
    }

    const foreignKeys = await client.getAllAsync("PRAGMA foreign_key_check");
    if (!codeMutationRejected || !precisionMutationRejected) {
      throw new Error(
        `Currency invariant enforcement failed: codeRejected=${codeMutationRejected}, precisionRejected=${precisionMutationRejected}`,
      );
    }
    if (foreignKeys.length !== 0) {
      throw new Error(
        `Foreign key check returned ${foreignKeys.length} violation(s)`,
      );
    }

    let reopenPassed = false;
    let reopenDetail = "Database was not reopened";

    // Close and reopen the exact same encrypted file before cleanup. Reapply
    // the same key, then verify durable rows and migration-created triggers.
    await client.closeAsync();
    client = null;
    try {
      if (!encryptionKey) {
        throw new Error(
          "SQLCipher key was not retained for reopen verification",
        );
      }
      client = await SQLite.openDatabaseAsync(databaseName, {
        useNewConnection: true,
      });
      await client.execAsync(`PRAGMA key = "x'${encryptionKey}'"`);
      await client.execAsync("PRAGMA foreign_keys = ON");

      const reopenedTriggers = await client.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
        ...triggerNames,
      );
      const reopenedTriggerNames = reopenedTriggers
        .map((row) => row.name)
        .sort();
      const persistedCurrency = await client.getFirstAsync<{ code: string }>(
        "SELECT code FROM currencies WHERE code = 'VND'",
      );
      const persistedAccount = await client.getFirstAsync<{ id: string }>(
        "SELECT id FROM accounts WHERE id = 'f02-upgrade-verification-cash'",
      );
      const persistedSettings = await client.getFirstAsync<{
        base_currency_code: string;
      }>(
        "SELECT base_currency_code FROM ledger_settings WHERE id = 1",
      );
      const reopenedForeignKeys = await client.getAllAsync(
        "PRAGMA foreign_key_check",
      );

      reopenPassed =
        JSON.stringify(reopenedTriggerNames) ===
          JSON.stringify([...triggerNames].sort()) &&
        persistedCurrency?.code === "VND" &&
        persistedAccount?.id === "f02-upgrade-verification-cash" &&
        persistedSettings?.base_currency_code === "VND" &&
        reopenedForeignKeys.length === 0;
      reopenDetail =
        `triggers=${reopenedTriggerNames.join(", ") || "none"}; currencyPersisted=${Boolean(persistedCurrency)}; accountPersisted=${Boolean(persistedAccount)}; baseCurrencyPersisted=${persistedSettings?.base_currency_code ?? "missing"}; foreignKeyViolations=${reopenedForeignKeys.length}`;
    } catch (error) {
      reopenDetail =
        error instanceof Error ? error.message : String(error);
    }

    return [
      {
        name: "Legacy migration state before 0011",
        passed: beforeUpgrade.length === 0,
        detail:
          "Historical 0004 and migrations 0005-0010 applied; both triggers absent",
      },
      {
        name: "Forward migration 0011 on SQLCipher",
        passed: restoredNames.length === 2,
        detail: restoredNames.join(", "),
      },
      {
        name: "Currency code and referenced precision immutability",
        passed: codeMutationRejected && precisionMutationRejected,
        detail: `code update rejected=${codeMutationRejected}; precision update rejected=${precisionMutationRejected}`,
      },
      {
        name: "Foreign key integrity after upgrade",
        passed: foreignKeys.length === 0,
        detail: `${foreignKeys.length} foreign key violation(s)`,
      },
      {
        name: "Same upgraded SQLCipher database survives close and reopen",
        passed: reopenPassed,
        detail: reopenDetail,
      },
    ];
  } finally {
    if (client) {
      await client.closeAsync();
    }
    try {
      await SQLite.deleteDatabaseAsync(databaseName);
    } catch {
      // Cleanup is best-effort; never mask the migration result with cleanup.
    }
  }
}
