import type { Account, AccountSubtype, AccountType } from "./repository";

export interface CreateAccountInput {
  id: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype | null;
  isInvestment?: boolean;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRepository {
  create(input: CreateAccountInput): Promise<Account>;
  findById(id: string): Promise<Account | null>;
  list(includeArchived?: boolean): Promise<Account[]>;
  updateMetadata(
    id: string,
    input: { name: string; subtype: AccountSubtype | null; updatedAt: string },
  ): Promise<Account>;
  archive(id: string, updatedAt: string): Promise<void>;
  restore(id: string, updatedAt: string): Promise<void>;
}
