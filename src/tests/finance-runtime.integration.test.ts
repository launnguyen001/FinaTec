import { createFinanceRuntime } from "../infrastructure/finance-runtime";
import { Currency } from "../domain/ledger/currency";
import { calculateAccountBalance } from "../domain/ledger/posting";
import { createRealSqliteTestDatabase } from "./helpers/real-sqlite";

describe("production finance runtime composition", () => {
  it("posts income, expense, and a categorized reversal through the composed services", async () => {
    const database = await createRealSqliteTestDatabase();
    let nextId = 0;
    const runtime = await createFinanceRuntime(database.db, {
      now: () => "2026-11-04T12:00:00.000Z",
      createId: () => `runtime-${++nextId}`,
    });

    try {
      await runtime.ledger.setBaseCurrencyCode(
        "VND",
        "2026-11-04T12:00:00.000Z",
      );
      const cash = await runtime.accounts.create({
        name: "Runtime cash",
        type: "ASSET",
        subtype: "CASH",
        currencyCode: "VND",
      });
      const incomeAccount = await runtime.accounts.create({
        name: "Runtime income",
        type: "INCOME",
        currencyCode: "VND",
      });
      const expenseAccount = await runtime.accounts.create({
        name: "Runtime expense",
        type: "EXPENSE",
        currencyCode: "VND",
      });
      const incomeCategory = await runtime.categories.create({
        name: "Runtime income category",
        kind: "INCOME",
      });
      const expenseCategory = await runtime.categories.create({
        name: "Runtime expense category",
        kind: "EXPENSE",
      });

      const income = await runtime.transactions.recordIncome({
        idempotencyKey: "runtime-income",
        assetAccountId: cash.id,
        incomeAccountId: incomeAccount.id,
        categoryId: incomeCategory.id,
        amountMinor: 1_000n,
      });
      const expense = await runtime.transactions.recordExpense({
        idempotencyKey: "runtime-expense",
        assetAccountId: cash.id,
        expenseAccountId: expenseAccount.id,
        categoryId: expenseCategory.id,
        amountMinor: 200n,
      });
      const reversal = await runtime.transactions.reversePostedEntry({
        idempotencyKey: "runtime-income-reversal",
        originalEntryId: income.entry.id,
      });

      const [persistedIncome, persistedExpense, persistedReversal] =
        await Promise.all([
          runtime.ledger.findJournalEntryById(income.entry.id),
          runtime.ledger.findJournalEntryById(expense.entry.id),
          runtime.ledger.findJournalEntryById(reversal.entry.id),
        ]);
      const [incomeLines, expenseLines, reversalLines] = await Promise.all([
        runtime.ledger.listJournalLines(income.entry.id),
        runtime.ledger.listJournalLines(expense.entry.id),
        runtime.ledger.listJournalLines(reversal.entry.id),
      ]);

      expect(persistedIncome).toMatchObject({
        status: "POSTED",
        transactionKind: "INCOME",
        categoryId: incomeCategory.id,
      });
      expect(incomeLines).toHaveLength(2);
      expect(
        incomeLines.map(({ accountId, side, amountMinor }) => ({
          accountId,
          side,
          amountMinor,
        })),
      ).toEqual([
        { accountId: cash.id, side: "DEBIT", amountMinor: 1_000n },
        {
          accountId: incomeAccount.id,
          side: "CREDIT",
          amountMinor: 1_000n,
        },
      ]);

      expect(persistedExpense).toMatchObject({
        status: "POSTED",
        transactionKind: "EXPENSE",
        categoryId: expenseCategory.id,
      });
      expect(expenseLines).toHaveLength(2);
      expect(expenseLines.map((line) => line.accountId).sort()).toEqual(
        [cash.id, expenseAccount.id].sort(),
      );

      expect(persistedReversal).toMatchObject({
        status: "POSTED",
        transactionKind: "REVERSAL",
        categoryId: incomeCategory.id,
        reversalOfId: income.entry.id,
      });
      expect(reversalLines).toHaveLength(2);
      expect(
        reversalLines.map(({ accountId, side, amountMinor }) => ({
          accountId,
          side,
          amountMinor,
        })),
      ).toEqual(
        incomeLines.map(({ accountId, side, amountMinor }) => ({
          accountId,
          side: side === "DEBIT" ? "CREDIT" : "DEBIT",
          amountMinor,
        })),
      );

      expect(
        calculateAccountBalance(
          cash,
          await runtime.ledger.listPostedJournalLinesForAccount(cash.id),
          new Currency("VND", 0),
        ).minorUnits,
      ).toBe(-200n);
      expect(
        calculateAccountBalance(
          incomeAccount,
          await runtime.ledger.listPostedJournalLinesForAccount(
            incomeAccount.id,
          ),
          new Currency("VND", 0),
        ).minorUnits,
      ).toBe(0n);
      expect(
        calculateAccountBalance(
          expenseAccount,
          await runtime.ledger.listPostedJournalLinesForAccount(
            expenseAccount.id,
          ),
          new Currency("VND", 0),
        ).minorUnits,
      ).toBe(200n);
      expect(database.raw.prepare("PRAGMA foreign_key_check").all()).toEqual(
        [],
      );
    } finally {
      database.close();
    }
  });
});
