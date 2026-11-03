import { AccountingService } from "../application/ledger/accounting-service";
import { DashboardService } from "../application/finance/dashboard-service";
import { FinanceTransactionService } from "../application/finance/finance-transaction-service";
import type { FinanceReadLine, FinanceReadRepository } from "../domain/finance/finance-read-repository";
import type { Category } from "../domain/category/category";
import type { CategoryRepository } from "../domain/category/repository";
import type { Account, CurrencyRecord } from "../domain/ledger/repository";
import { InMemoryLedgerRepository } from "./helpers/in-memory-ledger-repository";

const timestamp = "2026-11-03T12:00:00.000Z";
function makeAccount(id: string, type: Account["type"]): Account {
  return { id, name: id, type, currencyCode: "VND", isSystem: false, isArchived: false, subtype: type === "ASSET" ? "CASH" : null, createdAt: timestamp, updatedAt: timestamp };
}

describe("DashboardService", () => {
  it("derives available balance and cash flow per currency from posted ledger lines", async () => {
    const ledger = new InMemoryLedgerRepository();
    const currency: CurrencyRecord = { code: "VND", name: "Vietnamese Dong", minorUnit: 0, isActive: true, createdAt: timestamp };
    await ledger.createCurrency(currency);
    await ledger.createCurrency({ code: "USD", name: "US Dollar", minorUnit: 2, isActive: true, createdAt: timestamp });
    for (const account of [makeAccount("cash", "ASSET"), makeAccount("equity", "EQUITY"), makeAccount("salary", "INCOME"), makeAccount("food", "EXPENSE"), makeAccount("bank", "ASSET"), { ...makeAccount("usd-wallet", "ASSET"), currencyCode: "USD", subtype: "EWALLET" as const }, { ...makeAccount("usd-equity", "EQUITY"), currencyCode: "USD", subtype: null as const }]) await ledger.createAccount(account);
    await ledger.setBaseCurrencyCode("VND");
    let id = 0;
    const accounting = new AccountingService(ledger, { createId: () => `entry-${++id}`, now: () => timestamp });
    await accounting.createOpeningBalance({ idempotencyKey: "opening", accountId: "cash", offsetAccountId: "equity", amountMinor: 1_000_000n });
    await accounting.createOpeningBalance({ idempotencyKey: "opening-usd", accountId: "usd-wallet", offsetAccountId: "usd-equity", amountMinor: 10_000n, fxRateNumerator: "25000", fxRateDenominator: "1" });
    const expenseCategory: Category = { id: "food-cat", name: "Food", kind: "EXPENSE", parentId: null, isArchived: false, createdAt: timestamp, updatedAt: timestamp };
    const incomeCategory: Category = { ...expenseCategory, id: "salary-cat", name: "Salary", kind: "INCOME" };
    const categories: CategoryRepository = { create: async () => expenseCategory, findById: async (id) => id === expenseCategory.id ? expenseCategory : id === incomeCategory.id ? incomeCategory : null, list: async () => [expenseCategory, incomeCategory], update: async () => expenseCategory, archive: async () => undefined };
    const finance = new FinanceTransactionService(accounting, ledger, categories, { now: () => timestamp });
    await finance.recordIncome({ idempotencyKey: "income", assetAccountId: "cash", incomeAccountId: "salary", categoryId: "salary-cat", amountMinor: 2_000_000n });
    const expenseEntry = await finance.recordExpense({ idempotencyKey: "expense", assetAccountId: "cash", expenseAccountId: "food", categoryId: "food-cat", amountMinor: 500_000n });
    await accounting.transferFunds({ idempotencyKey: "internal-transfer", fromAccountId: "cash", toAccountId: "bank", amountMinor: 250_000n });
    const accountTypes = new Map((await ledger.listAccounts(true)).map((account) => [account.id, account.type]));
    const reads: FinanceReadRepository = {
      listPostedLinesInRange: async (from, to) => {
        const result: FinanceReadLine[] = [];
        for (const entry of ledger.entries.values()) {
          if (entry.status !== "POSTED" || entry.occurredAt < from || entry.occurredAt > to) continue;
          for (const line of await ledger.listJournalLines(entry.id)) result.push({ entry, line, accountType: accountTypes.get(line.accountId)!, accountName: line.accountId, categoryName: null });
        }
        return result;
      },
      listHistory: async () => [],
    };
    const dashboard = new DashboardService(ledger, accounting, reads);
    const summary = await dashboard.getSummary("2026-11-01T00:00:00.000Z", "2026-11-30T23:59:59.999Z");
    expect(summary.availableByCurrency).toEqual([{ currencyCode: "USD", amountMinor: 10_000n }, { currencyCode: "VND", amountMinor: 2_500_000n }]);
    expect(summary.incomeByCurrency).toEqual([{ currencyCode: "VND", amountMinor: 2_000_000n }]);
    expect(summary.expenseByCurrency).toEqual([{ currencyCode: "VND", amountMinor: 500_000n }]);
    expect(summary.netFlowByCurrency).toEqual([{ currencyCode: "VND", amountMinor: 1_500_000n }]);
    await accounting.reverseEntry({ idempotencyKey: "reverse-expense", originalEntryId: expenseEntry.entry.id });
    const afterReversal = await dashboard.getSummary("2026-11-01T00:00:00.000Z", "2026-11-30T23:59:59.999Z");
    expect(afterReversal.availableByCurrency).toEqual([{ currencyCode: "USD", amountMinor: 10_000n }, { currencyCode: "VND", amountMinor: 3_000_000n }]);
    expect(afterReversal.expenseByCurrency).toEqual([{ currencyCode: "VND", amountMinor: 0n }]);
    expect(afterReversal.netFlowByCurrency).toEqual([{ currencyCode: "VND", amountMinor: 2_000_000n }]);
  });
});
