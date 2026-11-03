import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const currencies = sqliteTable(
  "currencies",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    minorUnit: integer("minor_unit").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    check(
      "currencies_code_format",
      sql`length(${table.code}) = 3 AND ${table.code} = upper(${table.code})`,
    ),
    check(
      "currencies_minor_unit_range",
      sql`${table.minorUnit} BETWEEN 0 AND 6`,
    ),
  ],
);

export const ledgerSettings = sqliteTable(
  "ledger_settings",
  {
    id: integer("id").primaryKey(),
    baseCurrencyCode: text("base_currency_code")
      .notNull()
      .references(() => currencies.code, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [check("ledger_settings_singleton", sql`${table.id} = 1`)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"],
    }).notNull(),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    isSystem: integer("is_system", { mode: "boolean" }).notNull(),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull(),
    subtype: text("subtype", { enum: ["CASH", "BANK", "EWALLET", "SAVINGS", "OTHER"] }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("accounts_id_currency_unique").on(table.id, table.currencyCode),
    index("accounts_type_archived_idx").on(table.type, table.isArchived),
    check("accounts_name_nonempty", sql`length(trim(${table.name})) > 0`),
    check(
      "accounts_subtype_by_type",
      sql`(${table.type} = 'ASSET' AND (${table.subtype} IS NULL OR ${table.subtype} IN ('CASH', 'BANK', 'EWALLET', 'SAVINGS', 'OTHER'))) OR (${table.type} <> 'ASSET' AND ${table.subtype} IS NULL)`,
    ),
    check(
      "accounts_type_check",
      sql`${table.type} IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')`,
    ),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["INCOME", "EXPENSE"] }).notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => categories.id, { onDelete: "restrict", onUpdate: "restrict" }),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("categories_parent_idx").on(table.parentId),
    index("categories_kind_archived_idx").on(table.kind, table.isArchived),
    check("categories_name_nonempty", sql`length(trim(${table.name})) > 0`),
    check("categories_kind_check", sql`${table.kind} IN ('INCOME', 'EXPENSE')`),
    check("categories_not_self_parent", sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`),
  ],
);

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: text("id").primaryKey(),
    occurredAt: text("occurred_at").notNull(),
    description: text("description"),
    status: text("status", { enum: ["DRAFT", "POSTED"] }).notNull(),
    baseCurrencyCode: text("base_currency_code")
      .notNull()
      .references(() => currencies.code, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    idempotencyKey: text("idempotency_key"),
    transactionKind: text("transaction_kind", { enum: ["INCOME", "EXPENSE", "TRANSFER", "OPENING_BALANCE", "ADJUSTMENT", "REVERSAL", "LEGACY"] }).notNull().default("LEGACY"),
    categoryId: text("category_id").references((): AnySQLiteColumn => categories.id, { onDelete: "restrict", onUpdate: "restrict" }),
    reversalOfId: text("reversal_of_id").references(
      (): AnySQLiteColumn => journalEntries.id,
      { onDelete: "restrict", onUpdate: "restrict" },
    ),
    createdAt: text("created_at").notNull(),
    postedAt: text("posted_at"),
  },
  (table) => [
    index("journal_entries_occurred_at_idx").on(table.occurredAt),
    index("journal_entries_status_idx").on(table.status),
    index("journal_entries_category_idx").on(table.categoryId),
    index("journal_entries_kind_occurred_idx").on(table.transactionKind, table.occurredAt),
    uniqueIndex("journal_entries_idempotency_unique")
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    uniqueIndex("journal_entries_reversal_unique")
      .on(table.reversalOfId)
      .where(sql`${table.reversalOfId} IS NOT NULL`),
    check(
      "journal_entries_status_check",
      sql`${table.status} IN ('DRAFT', 'POSTED')`,
    ),
    check(
      "journal_entries_posted_at_check",
      sql`(${table.status} = 'DRAFT' AND ${table.postedAt} IS NULL) OR (${table.status} = 'POSTED' AND ${table.postedAt} IS NOT NULL)`,
    ),
    check(
      "journal_entries_not_self_reversal",
      sql`${table.reversalOfId} IS NULL OR ${table.reversalOfId} <> ${table.id}`,
    ),
  ],
);

export const journalLines = sqliteTable(
  "journal_lines",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => journalEntries.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    lineNumber: integer("line_number").notNull(),
    accountId: text("account_id").notNull(),
    currencyCode: text("currency_code").notNull(),
    side: text("side", { enum: ["DEBIT", "CREDIT"] }).notNull(),
    amountMinor: integer("amount_minor").notNull(),
    fxRateNumerator: text("fx_rate_numerator").notNull(),
    fxRateDenominator: text("fx_rate_denominator").notNull(),
    baseAmountMinor: integer("base_amount_minor").notNull(),
    memo: text("memo"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("journal_lines_entry_line_unique").on(
      table.entryId,
      table.lineNumber,
    ),
    index("journal_lines_account_idx").on(table.accountId, table.currencyCode),
    index("journal_lines_entry_idx").on(table.entryId),
    foreignKey({
      columns: [table.accountId, table.currencyCode],
      foreignColumns: [accounts.id, accounts.currencyCode],
      name: "journal_lines_account_currency_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    check("journal_lines_line_number_positive", sql`${table.lineNumber} > 0`),
    check(
      "journal_lines_side_check",
      sql`${table.side} IN ('DEBIT', 'CREDIT')`,
    ),
    check(
      "journal_lines_amount_positive_safe",
      sql`${table.amountMinor} > 0 AND ${table.amountMinor} <= 9007199254740991`,
    ),
    check(
      "journal_lines_base_amount_safe",
      sql`${table.baseAmountMinor} >= 0 AND ${table.baseAmountMinor} <= 9007199254740991`,
    ),
    check(
      "journal_lines_fx_numerator_positive",
      sql`${table.fxRateNumerator} GLOB '[1-9]*' AND ${table.fxRateNumerator} NOT GLOB '*[^0-9]*'`,
    ),
    check(
      "journal_lines_fx_denominator_positive",
      sql`${table.fxRateDenominator} GLOB '[1-9]*' AND ${table.fxRateDenominator} NOT GLOB '*[^0-9]*'`,
    ),
  ],
);

export const ledgerSchema = {
  currencies,
  ledgerSettings,
  accounts,
  categories,
  journalEntries,
  journalLines,
};
