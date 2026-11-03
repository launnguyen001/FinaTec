import { asc, eq } from "drizzle-orm";
import type { AccountRepository, CreateAccountInput } from "../../domain/ledger/account-repository";
import type { Account } from "../../domain/ledger/repository";
import type { LedgerDatabase } from "./database";
import { accounts } from "./schema";

export class SqliteAccountRepository implements AccountRepository {
  constructor(private readonly db: LedgerDatabase) {}

  async create(input: CreateAccountInput): Promise<Account> {
    await this.db.insert(accounts).values({ ...input, isSystem: false, isArchived: false });
    const account = await this.findById(input.id);
    if (!account) throw new Error("Account was not persisted");
    return account;
  }

  async findById(id: string): Promise<Account | null> {
    const row = await this.db.select().from(accounts).where(eq(accounts.id, id)).get();
    return row ?? null;
  }

  async list(includeArchived = false): Promise<Account[]> {
    const query = this.db.select().from(accounts).orderBy(asc(accounts.name));
    if (includeArchived) return query.all();
    return query.where(eq(accounts.isArchived, false)).all();
  }

  async updateMetadata(id: string, input: { name: string; subtype: import("../../domain/ledger/repository").AccountSubtype | null; updatedAt: string }): Promise<Account> {
    await this.db.update(accounts).set(input).where(eq(accounts.id, id)).run();
    const account = await this.findById(id);
    if (!account) throw new Error(`Account does not exist: ${id}`);
    return account;
  }

  async archive(id: string, updatedAt: string): Promise<void> {
    await this.db.update(accounts).set({ isArchived: true, updatedAt }).where(eq(accounts.id, id)).run();
  }
}
