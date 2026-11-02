import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { RAW_KEY_PATTERN, resolveDatabaseKey } from "./key-lifecycle";
import { spikeProbe } from "./schema";

const DATABASE_NAME = "task00-drizzle-integration-v3.db";
const KEY_STORAGE_NAME = "kets0.task00.sqlcipher-integration-v3-key";
const OLD_DATABASE_NAMES = [
  "task00-drizzle-integration-v1.db",
  "task00-drizzle-integration-v2.db",
  "task00-sqlcipher-spike.db",
  "task00-sqlcipher-filediag-303962770ab632dcb4c6095cccd0a471.db",
  ...Array.from(
    { length: 6 },
    (_, index) => `task00-sqlcipher-spike-v${index + 1}.db`,
  ),
];
const MIGRATION_TIME = 1_793_520_000_000;
const MIGRATIONS = {
  journal: {
    entries: [
      {
        idx: 0,
        when: MIGRATION_TIME,
        tag: "0000_task00_spike_probe",
        breakpoints: false,
      },
    ],
  },
  migrations: {
    m0000:
      "CREATE TABLE task00_spike_probe (id INTEGER PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
  },
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const sqliteMessageCode = message.match(
    /(?:SQLite|error)\s*(?:error\s*)?(?:code\s*)?[:#]?\s*(\d+)/i,
  )?.[1];
  if (sqliteMessageCode) return sqliteMessageCode;
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "unavailable";
}

async function fileFor(name: string): Promise<FileSystem.File | null> {
  const directory = SQLite.defaultDatabaseDirectory;
  if (!directory) return null;
  const directoryUri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  return new FileSystem.File(directoryUri, name);
}

async function legacyMetadata(): Promise<string[]> {
  const lines: string[] = [];
  for (const name of OLD_DATABASE_NAMES) {
    const file = await fileFor(name);
    lines.push(
      `Legacy ${name}: ${file?.exists ? `exists, ${file.size} bytes` : file ? "absent" : "directory unavailable"}`,
    );
  }
  const legacyKeyPresent =
    (await SecureStore.getItemAsync("kets0.task00.sqlcipher-spike-key.v6")) !==
    null;
  lines.push(
    `Legacy v6 SecureStore key: ${legacyKeyPresent ? "present" : "missing"}`,
  );
  return lines;
}

async function testLegacyFilesOnCopies(): Promise<string[]> {
  const lines = [
    "Legacy file copy/key-candidate investigation (.v6 SecureStore key)",
  ];
  const key = await SecureStore.getItemAsync(
    "kets0.task00.sqlcipher-spike-key.v6",
  );
  if (key === null || !RAW_KEY_PATTERN.test(key)) {
    lines.push(
      "Candidate key unavailable or invalid; all legacy decrypt checks NOT VERIFIED",
    );
    return lines;
  }

  let copyIndex = 0;
  for (const sourceName of OLD_DATABASE_NAMES) {
    const source = await fileFor(sourceName);
    if (!source?.exists) continue;
    const sourceBefore = await source.bytes();
    const copyName = `task00-legacy-copy-v6-${copyIndex++}.db`;
    const copy = await fileFor(copyName);
    if (!copy || copy.exists) {
      lines.push(
        `${sourceName}: NOT VERIFIED; isolated copy destination unavailable/already exists`,
      );
      continue;
    }

    try {
      await source.copy(copy);
      if (!copy.exists || copy.size !== source.size) {
        lines.push(`${sourceName}: NOT VERIFIED; copy size mismatch`);
        continue;
      }

      let database: SQLite.SQLiteDatabase | null = null;
      try {
        database = await SQLite.openDatabaseAsync(copyName, {
          useNewConnection: true,
        });
        const cipher = await database.getFirstAsync<{
          cipher_version: string;
        }>("PRAGMA cipher_version");
        if (!cipher?.cipher_version) {
          lines.push(
            `${sourceName}: SQLCipher unavailable; decrypt NOT VERIFIED`,
          );
          continue;
        }
        await database.execAsync(`PRAGMA key = "x'${key}'"`);
        await database.getFirstAsync("SELECT name FROM sqlite_master LIMIT 1");
        lines.push(
          `${sourceName}: .v6 candidate key opened schema on isolated copy; candidate MATCH (copy ${copyName})`,
        );
      } catch (error) {
        lines.push(
          `${sourceName}: .v6 candidate key did not decrypt isolated copy; SQLite error code=${errorCode(error)} (copy ${copyName})`,
        );
      } finally {
        await database?.closeAsync();
      }
    } catch (error) {
      lines.push(
        `${sourceName}: copy/decrypt test failed safely; code=${errorCode(error)}`,
      );
    } finally {
      const sourceAfter = await source.bytes();
      lines.push(
        `${sourceName}: original file bytes unchanged=${bytesEqual(sourceBefore, sourceAfter)}; size=${source.size}`,
      );
    }
  }
  lines.push(
    "Only the .v6 key was tested; no key-to-file relationship was assumed.",
  );
  return lines;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((byte, index) => byte === right[index])
  );
}

async function openAndKey(key: string): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME, {
    useNewConnection: true,
  });
  try {
    const cipher = await database.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    if (!cipher?.cipher_version)
      throw new Error("SQLCipher runtime unavailable (cipher_version empty)");
    await database.execAsync(`PRAGMA key = "x'${key}'"`);
    return database;
  } catch (error) {
    await database.closeAsync();
    throw error;
  }
}

export async function runSqlCipherFileDiagnostic(): Promise<string> {
  const report = ["TASK-00 SQLCipher + Drizzle diagnostic"];
  let stage = "read-only legacy metadata";
  let database: SQLite.SQLiteDatabase | null = null;
  let keyBytes = 0;
  let generated = false;

  try {
    report.push(...(await legacyMetadata()));
    report.push(...(await testLegacyFilesOnCopies()));
    stage = "database/key preflight";
    const file = await fileFor(DATABASE_NAME);
    if (!file) throw new Error("SQLite database directory unavailable");
    const databaseExisted = file.exists;
    const keyResult = await resolveDatabaseKey(
      databaseExisted,
      KEY_STORAGE_NAME,
      SecureStore,
      async () => toHex(await Crypto.getRandomBytesAsync(32)),
    );
    const key = keyResult.key;
    generated = keyResult.generated;
    keyBytes = key.length / 2;
    report.push(
      `Database: ${DATABASE_NAME}; existed=${databaseExisted}; key=${generated ? "generated for fresh file" : "existing key reused"}`,
    );

    stage = "open, cipher runtime, and raw key";
    database = await openAndKey(key);
    const cipher = await database.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    report.push(
      `SQLCipher runtime: ${cipher?.cipher_version ?? "unavailable"}; raw key applied: PASS`,
    );

    stage = "immediate user_version read";
    const version = await database.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    report.push(
      `Immediate PRAGMA user_version: PASS (${version?.user_version ?? "null"})`,
    );

    stage = "Drizzle migration";
    const orm = drizzle(database);
    await migrate(orm, MIGRATIONS);
    report.push("Drizzle migration: PASS");
    stage = "already-migrated verification";
    await migrate(orm, MIGRATIONS);
    report.push("Already-migrated rerun: PASS");

    stage = "Drizzle insert/select";
    const value = `task00-probe-${Date.now()}`;
    await orm.insert(spikeProbe).values({ id: 1, value }).onConflictDoUpdate({
      target: spikeProbe.id,
      set: { value },
    });
    const selected = await orm
      .select()
      .from(spikeProbe)
      .where(eq(spikeProbe.id, 1))
      .get();
    if (selected?.value !== value)
      throw new Error("Drizzle selected value did not match inserted value");
    report.push("Drizzle insert/select: PASS");
    await database.closeAsync();
    database = null;
    report.push("First connection close: PASS");

    stage = "reopen and persistence read";
    database = await openAndKey(key);
    const reopenCipher = await database.getFirstAsync<{
      cipher_version: string;
    }>("PRAGMA cipher_version");
    report.push(
      `Reopen SQLCipher runtime: ${reopenCipher?.cipher_version ?? "unavailable"}`,
    );
    const reopenedOrm = drizzle(database);
    const persisted = await reopenedOrm
      .select()
      .from(spikeProbe)
      .where(eq(spikeProbe.id, 1))
      .get();
    if (persisted?.value !== value)
      throw new Error("Persisted row was not found after reopen");
    report.push("Reopen with same key and Drizzle persistence read: PASS");
    await database.closeAsync();
    database = null;

    stage = "wrong-key rejection";
    const wrongKey = `${key[0] === "0" ? "1" : "0"}${key.slice(1)}`;
    const wrongDatabase = await SQLite.openDatabaseAsync(DATABASE_NAME, {
      useNewConnection: true,
    });
    try {
      const cipher = await wrongDatabase.getFirstAsync<{
        cipher_version: string;
      }>("PRAGMA cipher_version");
      if (!cipher?.cipher_version)
        throw new Error(
          "SQLCipher runtime unavailable on wrong-key connection",
        );
      await wrongDatabase.execAsync(`PRAGMA key = "x'${wrongKey}'"`);
      stage = "wrong-key schema read";
      await wrongDatabase.getFirstAsync("PRAGMA user_version");
      throw new Error("Incorrect key unexpectedly read user_version");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Incorrect key unexpectedly read user_version"
      )
        throw error;
      const wrongKeyCode = errorCode(error);
      report.push(
        `Wrong key schema read: rejected; SQLite error code=${wrongKeyCode}`,
      );
      if (wrongKeyCode !== "26")
        throw new Error(
          `Wrong key rejected with unexpected SQLite error code ${wrongKeyCode}`,
        );
    } finally {
      await wrongDatabase.closeAsync();
    }

    stage = "file metadata and plaintext fallback check";
    const finalFile = await fileFor(DATABASE_NAME);
    if (!finalFile?.exists)
      throw new Error(
        "Encrypted database file missing after successful writes",
      );
    const bytes = await finalFile.bytes();
    const plaintextHeader = [
      83, 81, 76, 105, 116, 101, 32, 102, 111, 114, 109, 97, 116, 32, 51, 0,
    ].every((byte, index) => bytes[index] === byte);
    report.push(`File: ${DATABASE_NAME}; size=${finalFile.size} bytes`);
    report.push(
      `Key metadata: ${keyBytes} bytes; lowercase hexadecimal encoded; key value omitted`,
    );
    report.push(
      `Plaintext SQLite header: ${plaintextHeader ? "DETECTED (FAIL)" : "not detected (PASS)"}`,
    );
    if (plaintextHeader) throw new Error("Plaintext SQLite header detected");
    report.push(
      "Missing key / existing database fail-closed: covered by unit tests; device key-loss case NOT VERIFIED",
    );
    report.push("Wrong key: connection isolated; schema read rejected");
    report.push(
      "Result: integration checks passed; physical key-loss scenarios remain NOT VERIFIED",
    );
    return report.join("\n");
  } catch (error) {
    const code = errorCode(error);
    report.push(`FAILED at stage: ${stage}; SQLite/error code=${code}`);
    report.push(
      error instanceof Error
        ? `Detail: ${error.message}`
        : "Detail: unknown error",
    );
    report.push(
      `Database: ${DATABASE_NAME}; size=${(await fileFor(DATABASE_NAME))?.size ?? "unavailable"} bytes`,
    );
    report.push(
      `Key metadata: ${keyBytes} bytes; lowercase hexadecimal encoded; key value omitted; newly generated=${generated}`,
    );
    report.push("No database files were deleted or recreated.");
    return report.join("\n");
  } finally {
    await database?.closeAsync();
  }
}
