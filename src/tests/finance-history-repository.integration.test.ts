import { AccountingService } from "../application/ledger/accounting-service";
import type { Account } from "../domain/ledger/repository";
import { SqliteFinanceReadRepository } from "../infrastructure/database/finance-read-repository";
import { SqliteLedgerRepository } from "../infrastructure/database/sqlite-ledger-repository";
import { TransactionHistoryService } from "../application/finance/transaction-history-service";
import { createRealSqliteTestDatabase } from "./helpers/real-sqlite";

const timestamp = "2026-11-04T12:00:00.000Z";

function assetAccount(id: string, name: string): Account {
  return {
    id,
    name,
    type: "ASSET",
    currencyCode: "VND",
    isSystem: false,
    isArchived: false,
    subtype: "CASH",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("SQLite account-filtered finance history", () => {
  it("filters matching entries while retaining all lines and reversal linkage", async () => {
    const database = await createRealSqliteTestDatabase();
    try {
      const ledger = new SqliteLedgerRepository(database.db);
      const reads = new SqliteFinanceReadRepository(database.db);
      const history = new TransactionHistoryService(reads);
      await ledger.setBaseCurrencyCode("VND", timestamp);
      const wallet = assetAccount("history-wallet", "Wallet");
      const bank = assetAccount("history-bank", "Bank");
      await ledger.createAccount(wallet);
      await ledger.createAccount(bank);
      let nextId = 0;
      const accounting = new AccountingService(ledger, {
        now: () => timestamp,
        createId: () => `history-${++nextId}`,
      });

      const transfer = await accounting.transferFunds({
        idempotencyKey: "history-transfer",
        fromAccountId: wallet.id,
        toAccountId: bank.id,
        amountMinor: 12_500n,
        occurredAt: timestamp,
      });
      const filter = {
        from: "2026-11-01T00:00:00.000Z",
        to: "2026-11-30T23:59:59.999Z",
        accountId: wallet.id,
      };

      const filteredRows = await reads.listHistory(filter);
      expect(filteredRows).toHaveLength(2);
      expect(new Set(filteredRows.map((row) => row.entry.id))).toEqual(
        new Set([transfer.entry.id]),
      );
      expect(new Set(filteredRows.map((row) => row.line.accountId))).toEqual(
        new Set([wallet.id, bank.id]),
      );

      const originalDetail = (await history.list(filter)).find(
        (item) => item.entry.id === transfer.entry.id,
      );
      expect(originalDetail?.lines).toHaveLength(2);
      expect(originalDetail?.lines.map((item) => item.line.accountId)).toEqual([
        wallet.id,
        bank.id,
      ]);

      const reversal = await accounting.reverseEntry({
        idempotencyKey: "history-transfer-reversal",
        originalEntryId: transfer.entry.id,
        occurredAt: timestamp,
      });
      const filteredHistory = await history.list(filter);
      expect(filteredHistory).toHaveLength(2);
      expect(
        filteredHistory.find((item) => item.entry.id === transfer.entry.id)
          ?.lines,
      ).toHaveLength(2);
      const reversalHistory = filteredHistory.find(
        (item) => item.entry.id === reversal.entry.id,
      );
      expect(reversalHistory?.entry.reversalOfId).toBe(transfer.entry.id);
      expect(reversalHistory?.lines).toHaveLength(2);
    } finally {
      database.close();
    }
  });
});
