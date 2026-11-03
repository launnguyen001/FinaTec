import { AccountService } from "../application/account/account-service";
import type { AccountRepository, CreateAccountInput } from "../domain/ledger/account-repository";
import type { Account } from "../domain/ledger/repository";
import { InMemoryLedgerRepository } from "./helpers/in-memory-ledger-repository";

const timestamp = "2026-11-03T00:00:00.000Z";

class InMemoryAccountRepository implements AccountRepository {
  readonly items = new Map<string, Account>();
  async create(input: CreateAccountInput): Promise<Account> { const value: Account = { ...input, isSystem: false, isArchived: false }; this.items.set(value.id, value); return value; }
  async findById(id: string) { return this.items.get(id) ?? null; }
  async list(includeArchived = false) { return [...this.items.values()].filter((item) => includeArchived || !item.isArchived); }
  async updateMetadata(id: string, input: { name: string; subtype: Account["subtype"]; updatedAt: string }) { const current = this.items.get(id); if (!current) throw new Error("missing"); const value = { ...current, ...input }; this.items.set(id, value); return value; }
  async archive(id: string, updatedAt: string) { const current = this.items.get(id); if (current) this.items.set(id, { ...current, isArchived: true, updatedAt }); }
  async restore(id: string, updatedAt: string) { const current = this.items.get(id); if (current) this.items.set(id, { ...current, isArchived: false, updatedAt }); }
}

describe("AccountService", () => {
  it("requires ASSET subtype and forbids subtype on non-ASSET accounts", async () => {
    const ledger = new InMemoryLedgerRepository();
    await ledger.createCurrency({ code: "VND", name: "Vietnamese Dong", minorUnit: 0, isActive: true, createdAt: timestamp });
    const repository = new InMemoryAccountRepository();
    const service = new AccountService(repository, ledger, { createId: () => "account-id", now: () => timestamp });
    await expect(service.create({ name: "Cash", type: "ASSET", currencyCode: "VND" })).rejects.toThrow(/subtype is required/);
    await expect(service.create({ name: "Salary", type: "INCOME", subtype: "CASH", currencyCode: "VND" })).rejects.toThrow(/Only ASSET/);
    const cash = await service.create({ name: "Cash", type: "ASSET", subtype: "CASH", currencyCode: "VND" });
    expect(cash.subtype).toBe("CASH");
  });

  it("archives only at exact zero balance, then restores without changing Ledger history", async () => {
    const ledger = new InMemoryLedgerRepository();
    await ledger.createCurrency({ code: "VND", name: "Vietnamese Dong", minorUnit: 0, isActive: true, createdAt: timestamp });
    const repository = new InMemoryAccountRepository();
    const service = new AccountService(repository, ledger, { createId: () => "account-id", now: () => timestamp });
    const cash = await service.create({ name: "Cash", type: "ASSET", subtype: "CASH", currencyCode: "VND" });
    ledger.accounts.set(cash.id, cash);
    await service.archive(cash.id);
    expect(await repository.findById(cash.id)).toMatchObject({ isArchived: true });
    await service.restore(cash.id);
    expect(await repository.findById(cash.id)).toMatchObject({ isArchived: false });
    await expect(service.rename(cash.id, "New cash")).resolves.toMatchObject({ name: "New cash" });
  });

  it.each(["DEBIT", "CREDIT"] as const)("rejects archive when the Ledger balance is non-zero (%s normal-side test)", async (side) => {
    const ledger = new InMemoryLedgerRepository();
    await ledger.createCurrency({ code: "VND", name: "Vietnamese Dong", minorUnit: 0, isActive: true, createdAt: timestamp });
    const repository = new InMemoryAccountRepository();
    const service = new AccountService(repository, ledger, { createId: () => "account-id", now: () => timestamp });
    const cash = await service.create({ name: "Cash", type: "ASSET", subtype: "CASH", currencyCode: "VND" });
    ledger.accounts.set(cash.id, cash);
    ledger.entries.set("posted-entry", {
      id: "posted-entry", occurredAt: timestamp, description: "Seed balance", status: "POSTED",
      baseCurrencyCode: "VND", idempotencyKey: "seed", reversalOfId: null,
      transactionKind: "OPENING_BALANCE", categoryId: null, createdAt: timestamp, postedAt: timestamp,
    });
    ledger.linesByEntry.set("posted-entry", [{
      id: "line-1", entryId: "posted-entry", lineNumber: 1, accountId: cash.id,
      currencyCode: "VND", side, amountMinor: 100n, fxRateNumerator: "1",
      fxRateDenominator: "1", baseAmountMinor: 100n, memo: null, createdAt: timestamp,
    }]);
    await expect(service.archive(cash.id)).rejects.toThrow(/exact zero Ledger balance/);
    expect(await repository.findById(cash.id)).toMatchObject({ isArchived: false });
  });
});
