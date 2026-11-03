import type { Account, AccountSubtype, AccountType, CurrencyRecord } from "../../domain/ledger/repository";
import type { AccountRepository } from "../../domain/ledger/account-repository";
import type { LedgerRepository } from "../../domain/ledger/repository";

export interface AccountServiceOptions { createId: () => string; now: () => string; }

export class AccountService {
  constructor(private readonly accounts: AccountRepository, private readonly ledger: LedgerRepository, private readonly options: AccountServiceOptions) {}

  async create(input: { name: string; type: AccountType; subtype?: AccountSubtype | null; currencyCode: string }): Promise<Account> {
    const name = input.name.trim();
    if (!name) throw new Error("Account name is required");
    if (name.length > 80) throw new Error("Account name must be at most 80 characters");
    const subtype = input.subtype ?? null;
    if (input.type === "ASSET" && !subtype) throw new Error("ASSET account subtype is required");
    if (input.type !== "ASSET" && subtype !== null) throw new Error("Only ASSET accounts can have a subtype");
    const currency: CurrencyRecord | undefined = (await this.ledger.listCurrencies(false)).find((item) => item.code === input.currencyCode && item.isActive);
    if (!currency) throw new Error("Account currency is missing or inactive");
    const timestamp = this.options.now();
    return this.accounts.create({ id: this.options.createId(), name, type: input.type, subtype, currencyCode: input.currencyCode, createdAt: timestamp, updatedAt: timestamp });
  }

  async rename(id: string, name: string): Promise<Account> {
    const current = await this.requireAccount(id);
    if (current.isArchived) throw new Error("Archived accounts cannot be renamed");
    const normalized = name.trim();
    if (!normalized) throw new Error("Account name is required");
    if (normalized.length > 80) throw new Error("Account name must be at most 80 characters");
    return this.accounts.updateMetadata(id, { name: normalized, subtype: current.subtype ?? null, updatedAt: this.options.now() });
  }

  async updateMetadata(id: string, input: { name: string; subtype?: AccountSubtype | null }): Promise<Account> {
    const current = await this.requireAccount(id);
    if (current.isArchived) throw new Error("Archived accounts cannot be updated");
    const name = input.name.trim();
    if (!name || name.length > 80) throw new Error("Account name must contain 1–80 characters");
    const subtype = input.subtype === undefined ? current.subtype ?? null : input.subtype;
    if (current.type === "ASSET" && !subtype) throw new Error("ASSET account subtype is required");
    if (current.type !== "ASSET" && subtype !== null) throw new Error("Only ASSET accounts can have a subtype");
    return this.accounts.updateMetadata(id, { name, subtype, updatedAt: this.options.now() });
  }

  async archive(id: string): Promise<void> {
    const current = await this.requireAccount(id);
    if (current.isArchived) return;
    if (current.isSystem) throw new Error("System accounts cannot be archived");
    await this.accounts.archive(id, this.options.now());
  }

  async list(includeArchived = false): Promise<Account[]> { return this.accounts.list(includeArchived); }

  private async requireAccount(id: string): Promise<Account> {
    const account = await this.accounts.findById(id);
    if (!account) throw new Error(`Account does not exist: ${id}`);
    return account;
  }
}
