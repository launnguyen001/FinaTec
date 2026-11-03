import { AccountingService } from "../application/ledger/accounting-service";
import { FinanceTransactionService } from "../application/finance/finance-transaction-service";
import type { Category } from "../domain/category/category";
import type { CategoryRepository } from "../domain/category/repository";
import type { Account, CurrencyRecord } from "../domain/ledger/repository";
import { InMemoryLedgerRepository } from "./helpers/in-memory-ledger-repository";

const now = "2026-11-03T12:00:00.000Z";
const category: Category = { id: "food", name: "Food", kind: "EXPENSE", parentId: null, isArchived: false, createdAt: now, updatedAt: now };
const salaryCategory: Category = { ...category, id: "salary", name: "Salary", kind: "INCOME" };

function account(id: string, type: Account["type"]): Account {
  return { id, name: id, type, currencyCode: "VND", isSystem: false, isArchived: false, subtype: type === "ASSET" ? "CASH" : null, createdAt: now, updatedAt: now };
}

describe("FinanceTransactionService", () => {
  it("records income and expense through the shared accounting engine", async () => {
    const ledger = new InMemoryLedgerRepository();
    const currency: CurrencyRecord = { code: "VND", name: "Vietnamese Dong", minorUnit: 0, isActive: true, createdAt: now };
    await ledger.createCurrency(currency);
    await ledger.createAccount(account("cash", "ASSET"));
    await ledger.createAccount(account("salary-account", "INCOME"));
    await ledger.createAccount(account("food-account", "EXPENSE"));
    await ledger.setBaseCurrencyCode("VND");
    const categoryRepo: CategoryRepository = {
      create: async () => category,
      findById: async (id) => id === category.id ? category : id === salaryCategory.id ? salaryCategory : null,
      list: async () => [category, salaryCategory],
      update: async () => category,
      archive: async () => undefined,
    };
    let id = 0;
    const accounting = new AccountingService(ledger, { createId: () => `entry-${++id}`, now: () => now });
    const finance = new FinanceTransactionService(accounting, ledger, categoryRepo, { now: () => now });
    const income = await finance.recordIncome({ idempotencyKey: "income-1", assetAccountId: "cash", incomeAccountId: "salary-account", categoryId: "salary", amountMinor: 5_000_000n });
    expect(income.entry.transactionKind).toBe("INCOME");
    expect(income.entry.categoryId).toBe("salary");
    expect(income.lines.map((line) => line.side)).toEqual(["DEBIT", "CREDIT"]);
    const expense = await finance.recordExpense({ idempotencyKey: "expense-1", assetAccountId: "cash", expenseAccountId: "food-account", categoryId: "food", amountMinor: 500_000n });
    expect(expense.entry.transactionKind).toBe("EXPENSE");
    expect(expense.entry.categoryId).toBe("food");
    expect(expense.lines.map((line) => line.side)).toEqual(["CREDIT", "DEBIT"]);
    expect((await accounting.getAccountBalance("cash")).minorUnits).toBe(4_500_000n);
  });

  it("rejects a category whose kind does not match the transaction", async () => {
    const ledger = new InMemoryLedgerRepository();
    await ledger.createCurrency({ code: "VND", name: "Vietnamese Dong", minorUnit: 0, isActive: true, createdAt: now });
    await ledger.createAccount(account("cash", "ASSET"));
    await ledger.createAccount(account("food-account", "EXPENSE"));
    await ledger.setBaseCurrencyCode("VND");
    const categoryRepo: CategoryRepository = { create: async () => category, findById: async () => salaryCategory, list: async () => [salaryCategory], update: async () => category, archive: async () => undefined };
    const accounting = new AccountingService(ledger, { createId: () => "entry", now: () => now });
    const finance = new FinanceTransactionService(accounting, ledger, categoryRepo, { now: () => now });
    await expect(finance.recordExpense({ idempotencyKey: "bad-category", assetAccountId: "cash", expenseAccountId: "food-account", categoryId: "salary", amountMinor: 1_000n })).rejects.toThrow(/active EXPENSE category/);
    expect(ledger.entries.size).toBe(0);
  });
});
