import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import type {
  Account,
  JournalEntry,
  JournalLine,
} from "../../domain/ledger/repository";
import { ledgerMigrations } from "./migrations";
import { ledgerSchema } from "./schema";
import { SqliteLedgerRepository } from "./sqlite-ledger-repository";

export interface AcceptanceResult {
  databaseName: string;
  fileSizeBytes: number | null;
  cipherVersion: string;
  checks: { name: string; passed: boolean; detail: string }[];
  cleanup: string;
}

const timestamp = "2026-11-03T00:00:00.000Z";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectSqlFailure(action: () => Promise<unknown>, label: string) {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error(`${label}: SQLite unexpectedly accepted invalid data`);
}

export async function runLedgerAcceptanceDiagnostic(): Promise<AcceptanceResult> {
  const suffix = toHex(await Crypto.getRandomBytesAsync(6));
  const databaseName = `task01-acceptance-${suffix}.db`;
  const secureStoreName = `ketso.task01.acceptance.${suffix}`;
  const directory = SQLite.defaultDatabaseDirectory;
  assert(directory, "SQLite database directory is unavailable");
  const fileUri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  const file = new FileSystem.File(fileUri, databaseName);
  assert(!file.exists, "Refusing to open a pre-existing diagnostic database");

  const key = toHex(await Crypto.getRandomBytesAsync(32));
  const checks: AcceptanceResult["checks"] = [];
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
      "Diagnostic key could not be read back from SecureStore",
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
    await client.execAsync(`PRAGMA key = \"x'${restoredKey}'\"`);
    await client.execAsync("PRAGMA foreign_keys = ON");
    const schemaRead = await client.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    check(
      "SQLCipher keyed schema access",
      schemaRead !== null,
      `cipher=${cipherVersion}; user_version=${schemaRead?.user_version ?? "unreadable"}`,
    );

    const db = drizzle(client, { schema: ledgerSchema });
    await migrate(db, ledgerMigrations);
    check("Fresh migration", true, "Drizzle migration 0000 applied");
    await migrate(db, ledgerMigrations);
    check("Repeated migration", true, "second migration pass completed");

    const repository = new SqliteLedgerRepository(db);
    const accountVnd: Account = {
      id: `acceptance-cash-${suffix}`,
      name: "Acceptance cash",
      type: "ASSET",
      currencyCode: "VND",
      isSystem: false,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const accountUsd: Account = {
      ...accountVnd,
      id: `acceptance-usd-${suffix}`,
      name: "Acceptance USD",
      currencyCode: "USD",
    };
    await repository.createAccount(accountVnd);
    await repository.createAccount(accountUsd);
    const entryId = `acceptance-entry-${suffix}`;
    const entry: JournalEntry = {
      id: entryId,
      occurredAt: timestamp,
      description: "Synthetic acceptance fixture",
      status: "DRAFT",
      baseCurrencyCode: "VND",
      idempotencyKey: null,
      reversalOfId: null,
      createdAt: timestamp,
      postedAt: null,
    };
    const makeLine = (
      id: string,
      lineNumber: number,
      account: Account,
    ): JournalLine => ({
      id,
      entryId,
      lineNumber,
      accountId: account.id,
      currencyCode: account.currencyCode,
      side: lineNumber === 1 ? "DEBIT" : "CREDIT",
      amountMinor: 12345n,
      fxRateNumerator: "1",
      fxRateDenominator: "1",
      baseAmountMinor: 12345n,
      memo: null,
      createdAt: timestamp,
    });
    await repository.createDraftEntry({
      entry,
      lines: [
        makeLine(`acceptance-line-1-${suffix}`, 1, accountVnd),
        makeLine(`acceptance-line-2-${suffix}`, 2, accountVnd),
      ],
    });
    const roundTripEntry = await repository.findJournalEntryById(entryId);
    const roundTripLines = await repository.listJournalLines(entryId);
    check(
      "Repository round-trip",
      roundTripEntry?.id === entryId &&
        roundTripLines.length === 2 &&
        roundTripLines[0]?.amountMinor === 12345n,
      "entry, line ordering, and bigint amount persisted",
    );

    const rollbackEntryId = `acceptance-rollback-${suffix}`;
    const rollbackEntry = { ...entry, id: rollbackEntryId };
    const sameLineId = `acceptance-duplicate-line-${suffix}`;
    await expectSqlFailure(
      () =>
        repository.createDraftEntry({
          entry: rollbackEntry,
          lines: [
            {
              ...makeLine(sameLineId, 1, accountVnd),
              entryId: rollbackEntryId,
            },
            {
              ...makeLine(sameLineId, 2, accountVnd),
              entryId: rollbackEntryId,
            },
          ],
        }),
      "Repository transaction rollback",
    );
    check(
      "Repository transaction rollback",
      (await repository.findJournalEntryById(rollbackEntryId)) === null,
      "parent row absent after child insert failed",
    );

    await expectSqlFailure(
      () =>
        client!.runAsync(
          "INSERT INTO currencies (code,name,minor_unit,is_active,created_at) VALUES ('BAD','Bad precision',7,1,?)",
          timestamp,
        ),
      "Currency CHECK",
    );
    await expectSqlFailure(
      () =>
        client!.runAsync(
          "INSERT INTO currencies (code,name,minor_unit,is_active,created_at) VALUES ('NUL',NULL,2,1,?)",
          timestamp,
        ),
      "Currency NOT NULL",
    );
    await expectSqlFailure(
      () =>
        client!.runAsync(
          "INSERT INTO accounts (id,name,type,currency_code,is_system,is_archived,created_at,updated_at) VALUES (?, 'Bad FK','ASSET','ZZZ',0,0,?,?)",
          `acceptance-bad-fk-${suffix}`,
          timestamp,
          timestamp,
        ),
      "Account foreign key",
    );
    await expectSqlFailure(
      () =>
        client!.runAsync(
          "INSERT INTO accounts (id,name,type,currency_code,is_system,is_archived,created_at,updated_at) VALUES (?, 'Duplicate id','ASSET','VND',0,0,?,?)",
          accountVnd.id,
          timestamp,
          timestamp,
        ),
      "Account unique primary key",
    );
    check(
      "SQLite constraints",
      true,
      "CHECK, NOT NULL, foreign-key, and unique violations rejected",
    );

    const postedId = `acceptance-posted-${suffix}`;
    await client.runAsync(
      "INSERT INTO journal_entries (id,occurred_at,description,status,base_currency_code,created_at,posted_at) VALUES (?,?,?,'DRAFT','VND',?,NULL)",
      postedId,
      timestamp,
      "Synthetic immutable fixture",
      timestamp,
    );
    const postedLineId = `acceptance-posted-line-${suffix}`;
    await client.runAsync(
      "INSERT INTO journal_lines (id,entry_id,line_number,account_id,currency_code,side,amount_minor,fx_rate_numerator,fx_rate_denominator,base_amount_minor,created_at) VALUES (?,?,1,?,'VND','DEBIT',1,'1','1',1,?)",
      postedLineId,
      postedId,
      accountVnd.id,
      timestamp,
    );
    await client.runAsync(
      "UPDATE journal_entries SET status='POSTED', posted_at=? WHERE id=?",
      timestamp,
      postedId,
    );
    await expectSqlFailure(
      () =>
        client!.runAsync(
          "UPDATE journal_entries SET description='changed' WHERE id=?",
          postedId,
        ),
      "Posted entry update trigger",
    );
    await expectSqlFailure(
      () =>
        client!.runAsync("DELETE FROM journal_entries WHERE id=?", postedId),
      "Posted entry delete trigger",
    );
    await expectSqlFailure(
      () =>
        client!.runAsync(
          "INSERT INTO journal_lines (id,entry_id,line_number,account_id,currency_code,side,amount_minor,fx_rate_numerator,fx_rate_denominator,base_amount_minor,created_at) VALUES (?, ?,2,?,'VND','CREDIT',1,'1','1',1,?)",
          `acceptance-posted-line-extra-${suffix}`,
          postedId,
          accountVnd.id,
          timestamp,
        ),
      "Posted line insert trigger",
    );
    await expectSqlFailure(
      () =>
        client!.runAsync(
          "UPDATE journal_lines SET memo='changed' WHERE id=?",
          postedLineId,
        ),
      "Posted line update trigger",
    );
    await expectSqlFailure(
      () =>
        client!.runAsync("DELETE FROM journal_lines WHERE id=?", postedLineId),
      "Posted line delete trigger",
    );
    check(
      "Posted history triggers",
      true,
      "entry update/delete and line insert/update/delete rejected",
    );

    const rollbackTable = `task01_migration_rollback_${suffix}`;
    await expectSqlFailure(
      () =>
        migrate(db, {
          journal: {
            entries: [
              {
                idx: 0,
                when: Date.now() + 60_000,
                tag: "task01_expected_failure",
                breakpoints: true,
              },
            ],
          },
          migrations: {
            m0000: `CREATE TABLE ${rollbackTable} (id INTEGER PRIMARY KEY);--> statement-breakpoint\nINSERT INTO task01_missing_table_for_rollback (id) VALUES (1);`,
          },
        }),
      "Drizzle migration rollback",
    );
    const rolledBackTable = await client.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      rollbackTable,
    );
    check(
      "Drizzle migration rollback",
      rolledBackTable === null,
      "table created before the intentional migration error was rolled back",
    );

    await client.closeAsync();
    client = null;
    const reopenedKey = await SecureStore.getItemAsync(secureStoreName);
    assert(reopenedKey === key, "SecureStore key changed before reopen");
    client = await SQLite.openDatabaseAsync(databaseName, {
      useNewConnection: true,
    });
    const reopenCipher = await client.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    assert(reopenCipher?.cipher_version, "SQLCipher unavailable on reopen");
    await client.execAsync(`PRAGMA key = \"x'${reopenedKey}'\"`);
    await client.execAsync("PRAGMA foreign_keys = ON");
    const reopenDb = drizzle(client, { schema: ledgerSchema });
    await migrate(reopenDb, ledgerMigrations);
    const reopenedRepository = new SqliteLedgerRepository(reopenDb);
    const persistedEntry =
      await reopenedRepository.findJournalEntryById(entryId);
    const persistedLines = await reopenedRepository.listJournalLines(entryId);
    check(
      "SQLCipher close/reopen persistence",
      persistedEntry?.id === entryId && persistedLines.length === 2,
      "same SecureStore key reopened and selected persisted rows",
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
