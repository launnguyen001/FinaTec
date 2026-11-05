import { getLedgerDatabase } from "./database";
import { runCurrencyMigrationUpgradeDiagnostic } from "./currency-migration-upgrade-diagnostic";
import type { FinanceRuntime } from "../finance-runtime";

export interface RemediationAcceptanceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export async function runRemediationAcceptanceDiagnostic(
  runtime: FinanceRuntime,
): Promise<RemediationAcceptanceCheck[]> {
  const suffix = `${Date.now()}`;
  await runtime.ledger.setBaseCurrencyCode("VND", new Date().toISOString());
  const cash = await runtime.accounts.create({
    name: `Remediation cash ${suffix}`,
    type: "ASSET",
    subtype: "CASH",
    currencyCode: "VND",
  });
  const incomeAccount = await runtime.accounts.create({
    name: `Remediation income ${suffix}`,
    type: "INCOME",
    currencyCode: "VND",
  });
  const expenseAccount = await runtime.accounts.create({
    name: `Remediation expense ${suffix}`,
    type: "EXPENSE",
    currencyCode: "VND",
  });
  const incomeCategory = await runtime.categories.create({
    name: `Remediation income category ${suffix}`,
    kind: "INCOME",
  });
  const expenseCategory = await runtime.categories.create({
    name: `Remediation expense category ${suffix}`,
    kind: "EXPENSE",
  });
  const income = await runtime.transactions.recordIncome({
    idempotencyKey: `remediation-income-${suffix}`,
    assetAccountId: cash.id,
    incomeAccountId: incomeAccount.id,
    categoryId: incomeCategory.id,
    amountMinor: 10_000n,
  });
  const expense = await runtime.transactions.recordExpense({
    idempotencyKey: `remediation-expense-${suffix}`,
    assetAccountId: cash.id,
    expenseAccountId: expenseAccount.id,
    categoryId: expenseCategory.id,
    amountMinor: 2_000n,
  });
  const reversal = await runtime.transactions.reversePostedEntry({
    idempotencyKey: `remediation-reversal-${suffix}`,
    originalEntryId: income.entry.id,
  });

  const entries = await Promise.all(
    [income, expense, reversal].map(({ entry }) =>
      runtime.ledger.findJournalEntryById(entry.id),
    ),
  );
  const lines = await Promise.all(
    [income, expense, reversal].map(({ entry }) =>
      runtime.ledger.listJournalLines(entry.id),
    ),
  );
  const database = await getLedgerDatabase();
  const sqlite = database.$client;
  const triggers = await sqlite.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN
     ('currencies_code_immutable', 'currencies_no_precision_change_when_referenced')`,
  );
  const foreignKeys = await sqlite.getAllAsync("PRAGMA foreign_key_check");
  const expectedTriggers = [
    "currencies_code_immutable",
    "currencies_no_precision_change_when_referenced",
  ];
  const triggerNames = triggers.map(({ name }) => name).sort();
  const allEntriesPosted = entries.every((entry) => entry?.status === "POSTED");
  const categoriesLinked =
    entries[0]?.categoryId === incomeCategory.id &&
    entries[1]?.categoryId === expenseCategory.id &&
    entries[2]?.categoryId === incomeCategory.id;
  const balancedLineSets = lines.every(
    (entryLines) =>
      entryLines.length === 2 &&
      entryLines[0]?.amountMinor === entryLines[1]?.amountMinor,
  );

  const migrationChecks = await runCurrencyMigrationUpgradeDiagnostic();

  return [
    {
      name: "Quick Income, Quick Expense, categorized reversal persisted",
      passed: allEntriesPosted && categoriesLinked && balancedLineSets,
      detail: `entries=${entries.map((entry) => entry?.id ?? "missing").join(",")}; categories=${categoriesLinked}; lines=${lines.map((entryLines) => entryLines.length).join(",")}`,
    },
    {
      name: "currency immutability triggers present after production migration",
      passed: JSON.stringify(triggerNames) === JSON.stringify(expectedTriggers),
      detail: triggerNames.join(", ") || "no matching triggers",
    },
    {
      name: "production database foreign key integrity",
      passed: foreignKeys.length === 0,
      detail: `${foreignKeys.length} foreign key violations`,
    },
    ...migrationChecks,
  ];
}
