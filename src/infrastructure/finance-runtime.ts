import * as Crypto from "expo-crypto";
import { AccountService } from "../application/account/account-service";
import { CategoryService } from "../application/category/category-service";
import { DashboardService } from "../application/finance/dashboard-service";
import { FinanceTransactionService } from "../application/finance/finance-transaction-service";
import { TransactionHistoryService } from "../application/finance/transaction-history-service";
import { AccountingService } from "../application/ledger/accounting-service";
import { SqliteAccountRepository } from "./database/account-repository";
import { SqliteCategoryRepository } from "./database/category-repository";
import { getLedgerDatabase } from "./database/database";
import { SqliteFinanceReadRepository } from "./database/finance-read-repository";
import { SqliteLedgerRepository } from "./database/sqlite-ledger-repository";

export async function createFinanceRuntime() {
  const db = await getLedgerDatabase();
  const ledger = new SqliteLedgerRepository(db);
  const accountRepository = new SqliteAccountRepository(db);
  const categoryRepository = new SqliteCategoryRepository(db);
  const readRepository = new SqliteFinanceReadRepository(db);
  const now = () => new Date().toISOString();
  const createId = () => Crypto.randomUUID();
  const accounting = new AccountingService(ledger, { createId, now });
  return {
    createId,
    ledger,
    accounts: new AccountService(accountRepository, ledger, { createId, now }),
    categories: new CategoryService(categoryRepository, { createId, now }),
    transactions: new FinanceTransactionService(accounting, ledger, categoryRepository, { now }),
    dashboard: new DashboardService(ledger, accounting, readRepository),
    history: new TransactionHistoryService(readRepository),
  };
}

export type FinanceRuntime = Awaited<ReturnType<typeof createFinanceRuntime>>;
