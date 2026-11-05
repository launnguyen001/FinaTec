import { SqliteLedgerRepository } from "../infrastructure/database/sqlite-ledger-repository";
import { createRealSqliteTestDatabase } from "./helpers/real-sqlite";

const triggerNames = [
  "currencies_code_immutable",
  "currencies_no_precision_change_when_referenced",
];

function expectCurrencyTriggers(
  database: Awaited<ReturnType<typeof createRealSqliteTestDatabase>>,
) {
  const rows = database.raw
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
    )
    .all(...triggerNames) as { name: string }[];
  expect(rows.map((row) => row.name).sort()).toEqual(triggerNames.sort());
}

async function verifyReferencedCurrencyInvariants(
  database: Awaited<ReturnType<typeof createRealSqliteTestDatabase>>,
) {
  const ledger = new SqliteLedgerRepository(database.db);
  await ledger.setBaseCurrencyCode("VND", "2026-11-04T12:00:00.000Z");
  await ledger.createAccount({
    id: "currency-trigger-cash",
    name: "Currency trigger cash",
    type: "ASSET",
    currencyCode: "VND",
    subtype: "CASH",
    isSystem: false,
    isArchived: false,
    createdAt: "2026-11-04T12:00:00.000Z",
    updatedAt: "2026-11-04T12:00:00.000Z",
  });

  expect(() =>
    database.raw
      .prepare("UPDATE currencies SET code = 'XXX' WHERE code = 'VND'")
      .run(),
  ).toThrow(/currency codes are immutable/);
  expect(() =>
    database.raw
      .prepare("UPDATE currencies SET minor_unit = 2 WHERE code = 'VND'")
      .run(),
  ).toThrow(/currency precision is immutable after first use/);
  expect(database.raw.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
}

describe("currency immutability migration chain", () => {
  it("keeps both triggers on a fresh database migrated through the full chain", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      expectCurrencyTriggers(database);
      await verifyReferencedCurrencyInvariants(database);
    } finally {
      database.close();
    }
  });

  it("restores both triggers while upgrading a database through migration 0004", async () => {
    const database = await createRealSqliteTestDatabase([]);
    try {
      await database.migrateEntries([0, 1, 2, 3]);
      expectCurrencyTriggers(database);

      await database.migrateEntries([4, 5, 6, 7, 8, 9, 10]);
      // Simulate a database that applied historical migrations before the
      // forward trigger-restoration migration was introduced.
      database.raw.exec(`
        DROP TRIGGER currencies_code_immutable;
        DROP TRIGGER currencies_no_precision_change_when_referenced;
      `);
      expect(
        database.raw
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN (?, ?)",
          )
          .all(...triggerNames),
      ).toHaveLength(0);

      await database.migrateEntries([11]);
      expectCurrencyTriggers(database);
      await verifyReferencedCurrencyInvariants(database);
    } finally {
      database.close();
    }
  });
});
