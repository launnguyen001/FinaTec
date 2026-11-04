import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { ledgerMigrations } from "./migrations";
import { resolveDatabaseKey } from "./key-lifecycle";
import { ledgerSchema } from "./schema";

const DATABASE_NAME = "ket-so-ledger.db";
const KEY_STORAGE_NAME = "ketso.database.sqlcipher-key.v1";

class SqlCipherUnavailableError extends Error {
  constructor() {
    super(
      "SQLCipher is unavailable in this native build; refusing plaintext database access",
    );
    this.name = "SqlCipherUnavailableError";
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function databaseFile(): FileSystem.File {
  const directory = SQLite.defaultDatabaseDirectory;
  if (!directory) {
    throw new Error("SQLite database directory is unavailable");
  }
  const uri = directory.startsWith("file://")
    ? directory
    : `file://${directory}`;
  return new FileSystem.File(uri, DATABASE_NAME);
}

async function resolveProductionDatabaseKey(
  databaseExists: boolean,
): Promise<{ key: string; generated: boolean }> {
  return resolveDatabaseKey(
    databaseExists,
    KEY_STORAGE_NAME,
    SecureStore,
    async () => toHex(await Crypto.getRandomBytesAsync(32)),
  );
}

function createLedgerDatabase(client: SQLite.SQLiteDatabase) {
  return drizzle(client, { schema: ledgerSchema });
}

export type LedgerDatabase = ReturnType<typeof createLedgerDatabase>;

async function openLedgerDatabase(): Promise<LedgerDatabase> {
  const file = databaseFile();
  const databaseExisted = file.exists;
  const keyResult = await resolveProductionDatabaseKey(databaseExisted);
  const client = await SQLite.openDatabaseAsync(DATABASE_NAME, {
    useNewConnection: true,
  });

  try {
    const cipher = await client.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    if (!cipher?.cipher_version) {
      throw new SqlCipherUnavailableError();
    }

    // The key is validated as lowercase hex before interpolation; PRAGMA key does not accept bind parameters.
    await client.execAsync(`PRAGMA key = "x'${keyResult.key}'"`);
    await client.execAsync("PRAGMA foreign_keys = ON");
    await client.execAsync("PRAGMA journal_mode = WAL");

    const db = createLedgerDatabase(client);
    await migrate(db, ledgerMigrations);
    return db;
  } catch (error) {
    await client.closeAsync();

    // Expo SQLite creates a file when opened. Remove only that just-created empty
    // preflight file if this binary lacks SQLCipher; never touch an existing DB.
    if (error instanceof SqlCipherUnavailableError && !databaseExisted) {
      if (file.exists) file.delete();
      if (keyResult.generated) {
        await SecureStore.deleteItemAsync(KEY_STORAGE_NAME);
      }
    }
    throw error;
  }
}

let databasePromise: Promise<LedgerDatabase> | null = null;

/** Returns the single initialized encrypted database connection for this process. */
export function getLedgerDatabase(): Promise<LedgerDatabase> {
  if (!databasePromise) {
    databasePromise = openLedgerDatabase().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}
