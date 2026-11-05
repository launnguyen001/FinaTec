import { rmSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import type { LedgerDatabase } from "../../infrastructure/database/database";
import { ledgerMigrations } from "../../infrastructure/database/migrations";
import { ledgerSchema } from "../../infrastructure/database/schema";

type SynchronousResult = {
  changes: number;
  lastInsertRowId: number;
  getAllSync(): unknown[];
  getFirstSync(): unknown;
};

/** Adapts Node's real SQLite connection to the sync API Drizzle uses on Expo. */
function expoSqliteClient(raw: DatabaseSync) {
  return {
    prepareSync(source: string) {
      const statement = raw.prepare(source);
      statement.setReturnArrays(true);
      let parameters: SQLInputValue[] = [];
      const normalizeParameters = (values: SQLInputValue[]) => {
        const only = values[0];
        return values.length === 1 && Array.isArray(only)
          ? (only as SQLInputValue[])
          : values;
      };
      const rows = () => statement.all(...parameters);
      const first = () => statement.get(...parameters);
      const rawRows = rows;
      const rawFirst = () => rawRows()[0];

      return {
        executeSync(...values: SQLInputValue[]): SynchronousResult {
          parameters = normalizeParameters(values);
          const result = statement.run(...parameters);
          return {
            changes: Number(result.changes),
            lastInsertRowId: Number(result.lastInsertRowid),
            getAllSync: rows,
            getFirstSync: first,
          };
        },
        executeForRawResultSync(...values: SQLInputValue[]) {
          parameters = normalizeParameters(values);
          return { getAllSync: rawRows, getFirstSync: rawFirst };
        },
      };
    },
    execAsync: async (source: string) => raw.exec(source),
    runAsync: async (source: string, ...values: SQLInputValue[]) => {
      const result = raw.prepare(source).run(...values);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    getFirstAsync: async <T>(source: string, ...values: SQLInputValue[]) =>
      (raw.prepare(source).get(...values) as T | undefined) ?? null,
    getAllAsync: async <T>(source: string, ...values: SQLInputValue[]) =>
      raw.prepare(source).all(...values) as T[],
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec("BEGIN");
      try {
        await task();
        raw.exec("COMMIT");
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    },
    closeAsync: async () => raw.close(),
  };
}

export interface RealSqliteTestDatabase {
  raw: DatabaseSync;
  db: LedgerDatabase;
  migrateEntries(indices: number[]): Promise<void>;
  close(): void;
}

/** Creates real SQLite and applies the same Drizzle migration source as production. */
export async function createRealSqliteTestDatabase(
  migrationIndices: number[] = ledgerMigrations.journal.entries.map(
    (entry) => entry.idx,
  ),
  databasePath = ":memory:",
): Promise<RealSqliteTestDatabase> {
  const raw = new DatabaseSync(databasePath);
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec("PRAGMA busy_timeout = 5000");
  if (databasePath !== ":memory:") raw.exec("PRAGMA journal_mode = WAL");
  const client = expoSqliteClient(raw);
  const db = drizzle(client as unknown as SQLiteDatabase, {
    schema: ledgerSchema,
  }) as unknown as LedgerDatabase;

  const migrateEntries = async (indices: number[]) => {
    const entries = ledgerMigrations.journal.entries.filter((entry) =>
      indices.includes(entry.idx),
    );
    const migrationSources = ledgerMigrations.migrations as Record<
      string,
      string
    >;
    const migrations = Object.fromEntries(
      entries.map((entry) => {
        const index = entry.idx.toString().padStart(4, "0");
        return [`m${index}`, migrationSources[`m${index}`]!];
      }),
    );
    await migrate(db, { journal: { entries }, migrations });
  };

  try {
    await migrateEntries(migrationIndices);
  } catch (error) {
    raw.close();
    throw error;
  }

  return {
    raw,
    db,
    migrateEntries,
    close: () => {
      raw.close();
      if (databasePath !== ":memory:") {
        rmSync(databasePath, { force: true });
        rmSync(`${databasePath}-wal`, { force: true });
        rmSync(`${databasePath}-shm`, { force: true });
      }
    },
  };
}

/** Opens a second independent connection to an already-migrated file database. */
export function openRealSqliteTestDatabase(
  databasePath: string,
): RealSqliteTestDatabase {
  const raw = new DatabaseSync(databasePath);
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec("PRAGMA busy_timeout = 5000");
  raw.exec("PRAGMA journal_mode = WAL");
  const client = expoSqliteClient(raw);
  const db = drizzle(client as unknown as SQLiteDatabase, {
    schema: ledgerSchema,
  }) as unknown as LedgerDatabase;
  return {
    raw,
    db,
    migrateEntries: async () => {
      throw new Error("The second SQLite connection must not rerun migrations");
    },
    close: () => raw.close(),
  };
}
