import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";

import {
  KeyLifecycleError,
  resolveDatabaseKey,
  type SecureKeyStore,
} from "./key-lifecycle";

const DATABASE_NAME = "task00-key-loss-probe-v2.db";
const KEY_STORAGE_NAME = "kets0.task00.key-loss-probe-v2";
const TEST_VALUE = "harmless-key-loss-probe";
const EXPORT_URL = "http://127.0.0.1:8099/encrypted-test-db";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((byte, index) => byte === right[index])
  );
}

function sqliteErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.match(
      /(?:SQLite|error)\s*(?:error\s*)?(?:code\s*)?[:#]?\s*(\d+)/i,
    )?.[1] ??
    (typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "unavailable")
  );
}

async function databaseFile(): Promise<FileSystem.File> {
  const directory = SQLite.defaultDatabaseDirectory;
  if (!directory) throw new Error("SQLite database directory unavailable");
  const uri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  return new FileSystem.File(uri, DATABASE_NAME);
}

async function openTestDatabase(key: string): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME, {
    useNewConnection: true,
  });
  try {
    const cipher = await database.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    if (!cipher?.cipher_version)
      throw new Error("SQLCipher runtime unavailable before key setup");
    await database.execAsync(`PRAGMA key = "x'${key}'"`);
    return database;
  } catch (error) {
    await database.closeAsync();
    throw error;
  }
}

async function openWithStoredKey(
  databaseExists: boolean,
  secureStore: SecureKeyStore,
  generateRawKey: () => Promise<string>,
  beforeSqliteOpen: () => void = () => undefined,
): Promise<{
  key: string;
  generated: boolean;
  database: SQLite.SQLiteDatabase;
}> {
  const resolved = await resolveDatabaseKey(
    databaseExists,
    KEY_STORAGE_NAME,
    secureStore,
    generateRawKey,
  );
  beforeSqliteOpen();
  const database = await openTestDatabase(resolved.key);
  return { ...resolved, database };
}

async function exportCiphertextAsHex(bytes: Uint8Array): Promise<string> {
  const response = await fetch(EXPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: toHex(bytes),
  });
  return `Independent SQLite test-file transfer: HTTP ${response.status}; ${await response.text()}`;
}

export async function runSqlCipherKeyLossDiagnostic(): Promise<string> {
  const report = ["TASK-00 isolated key-loss diagnostic"];
  let stage = "database preflight";
  let file: FileSystem.File | null = null;
  let keyByteLength = 0;
  let keyEncoding = "unknown";

  try {
    file = await databaseFile();
    const databaseExisted = file.exists;
    let key = await SecureStore.getItemAsync(KEY_STORAGE_NAME);
    report.push(
      `Test database ${DATABASE_NAME}: ${databaseExisted ? `exists, ${file.size} bytes` : "absent"}`,
    );

    if (!databaseExisted || key !== null) {
      stage = "test-only key resolution";
      const opened = await openWithStoredKey(
        databaseExisted,
        SecureStore,
        async () => toHex(await Crypto.getRandomBytesAsync(32)),
      );
      key = opened.key;
      keyByteLength = key.length / 2;
      keyEncoding = "lowercase hexadecimal raw key";

      stage = databaseExisted
        ? "verify existing isolated test database"
        : "create isolated SQLCipher test database";
      const database = opened.database;
      try {
        const cipher = await database.getFirstAsync<{
          cipher_version: string;
        }>("PRAGMA cipher_version");
        report.push(
          `Test database SQLCipher runtime: ${cipher?.cipher_version ?? "unavailable"}`,
        );
        if (databaseExisted) {
          const row = await database.getFirstAsync<{ value: string }>(
            "SELECT value FROM task00_key_loss_probe WHERE id = 1",
          );
          if (row?.value !== TEST_VALUE)
            throw new Error("Existing isolated key-loss probe did not match");
          report.push("Pre-delete test record verification: PASS");
        } else {
          await database.execAsync(
            "CREATE TABLE task00_key_loss_probe (id INTEGER PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
          );
          await database.runAsync(
            "INSERT INTO task00_key_loss_probe (id, value) VALUES (1, ?)",
            TEST_VALUE,
          );
          report.push(
            "Fresh SQLCipher test database and harmless record: PASS",
          );
        }
      } finally {
        await database.closeAsync();
      }
      report.push("Test database connection closed: PASS");

      stage = "delete isolated test key";
      await SecureStore.deleteItemAsync(KEY_STORAGE_NAME);
      if ((await SecureStore.getItemAsync(KEY_STORAGE_NAME)) !== null)
        throw new Error(
          "Isolated test key remained in SecureStore after delete",
        );
      report.push("Deleted only the isolated TASK-00 test key: PASS");
    } else {
      report.push(
        "Test DB already exists and test key is already missing; no key or DB was recreated",
      );
    }

    stage = "snapshot encrypted database before missing-key reopen attempt";
    if (!file.exists) throw new Error("Isolated test database is missing");
    const before = await file.bytes();
    const sizeBefore = file.size;
    let generationAttempts = 0;
    let secureStoreWrites = 0;
    const countingStore: SecureKeyStore = {
      getItemAsync: (storageKey) => SecureStore.getItemAsync(storageKey),
      setItemAsync: async (storageKey, value) => {
        secureStoreWrites += 1;
        await SecureStore.setItemAsync(storageKey, value);
      },
    };

    stage = "reopen preflight after test-key loss";
    let missingKeyError: unknown;
    let sqliteOpenAttempts = 0;
    try {
      await openWithStoredKey(
        file.exists,
        countingStore,
        async () => {
          generationAttempts += 1;
          return toHex(await Crypto.getRandomBytesAsync(32));
        },
        () => {
          sqliteOpenAttempts += 1;
        },
      );
    } catch (error) {
      missingKeyError = error;
    }
    const after = await file.bytes();
    const keyAfterAttempt = await SecureStore.getItemAsync(KEY_STORAGE_NAME);
    const dataUnchanged = bytesEqual(before, after) && file.size === sizeBefore;
    const expectedFailure =
      missingKeyError instanceof KeyLifecycleError &&
      missingKeyError.code === "MISSING_KEY_FOR_EXISTING_DATABASE";
    report.push(
      `Reopen key preflight: ${expectedFailure ? "MISSING_KEY_FOR_EXISTING_DATABASE (PASS)" : "unexpected result (FAIL)"}`,
    );
    report.push(
      `Automatic key generation attempts=${generationAttempts}; SecureStore writes=${secureStoreWrites}; SQLite open attempts=${sqliteOpenAttempts}; key remains absent=${keyAfterAttempt === null}`,
    );
    report.push(
      `Database unchanged across failed reopen preflight=${dataUnchanged}; size=${file.size} bytes`,
    );
    if (
      !expectedFailure ||
      generationAttempts !== 0 ||
      secureStoreWrites !== 0 ||
      sqliteOpenAttempts !== 0 ||
      keyAfterAttempt !== null ||
      !dataUnchanged
    ) {
      throw new Error("Fail-closed key-loss acceptance check failed");
    }

    stage = "export isolated ciphertext for independent SQLite check";
    const transferResult = await exportCiphertextAsHex(after);
    report.push(`Plaintext SQLite test preparation: ${transferResult}`);
    report.push(
      `Key metadata before deletion: ${keyByteLength || "not available after prior run"} bytes; ${keyEncoding}; value omitted`,
    );
    report.push(
      "No existing spike database or non-test SecureStore key was accessed or changed.",
    );
    report.push(
      "App-side result: PASS; SQLCipher file kept unchanged and no SQLite connection opened after key loss.",
    );
    return report.join("\n");
  } catch (error) {
    report.push(
      `FAILED at stage: ${stage}; SQLite/error code=${sqliteErrorCode(error)}`,
    );
    report.push(
      error instanceof Error
        ? `Detail: ${error.message}`
        : "Detail: unknown error",
    );
    if (file)
      report.push(
        `Test database ${DATABASE_NAME}: ${file.exists ? `exists, ${file.size} bytes` : "absent"}`,
      );
    report.push("No existing spike files were modified.");
    return report.join("\n");
  }
}
