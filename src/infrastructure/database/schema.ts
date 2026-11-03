import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  primaryKey,
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
      sql`length(${table.code}) BETWEEN 3 AND 4 AND ${table.code} = upper(${table.code})`,
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
    subtype: text("subtype", {
      enum: ["CASH", "BANK", "EWALLET", "SAVINGS", "OTHER"],
    }),
    isInvestment: integer("is_investment", { mode: "boolean" })
      .notNull()
      .default(false),
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
      "accounts_investment_by_type",
      sql`${table.isInvestment} = 0 OR ${table.type} = 'ASSET'`,
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
    parentId: text("parent_id").references(
      (): AnySQLiteColumn => categories.id,
      { onDelete: "restrict", onUpdate: "restrict" },
    ),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("categories_parent_idx").on(table.parentId),
    index("categories_kind_archived_idx").on(table.kind, table.isArchived),
    check("categories_name_nonempty", sql`length(trim(${table.name})) > 0`),
    check("categories_kind_check", sql`${table.kind} IN ('INCOME', 'EXPENSE')`),
    check(
      "categories_not_self_parent",
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`,
    ),
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
    transactionKind: text("transaction_kind", {
      enum: [
        "INCOME",
        "EXPENSE",
        "TRANSFER",
        "OPENING_BALANCE",
        "ADJUSTMENT",
        "REVERSAL",
        "LEGACY",
      ],
    })
      .notNull()
      .default("LEGACY"),
    categoryId: text("category_id").references(
      (): AnySQLiteColumn => categories.id,
      { onDelete: "restrict", onUpdate: "restrict" },
    ),
    reversalOfId: text("reversal_of_id").references(
      (): AnySQLiteColumn => journalEntries.id,
      { onDelete: "restrict", onUpdate: "restrict" },
    ),
    replacementOfId: text("replacement_of_id").references(
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
    index("journal_entries_kind_occurred_idx").on(
      table.transactionKind,
      table.occurredAt,
    ),
    index("journal_entries_replacement_idx").on(table.replacementOfId),
    uniqueIndex("journal_entries_idempotency_unique")
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    uniqueIndex("journal_entries_reversal_unique")
      .on(table.reversalOfId)
      .where(sql`${table.reversalOfId} IS NOT NULL`),
    uniqueIndex("journal_entries_replacement_unique")
      .on(table.replacementOfId)
      .where(sql`${table.replacementOfId} IS NOT NULL`),
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
    check(
      "journal_entries_replacement_not_self_or_reversal",
      sql`${table.replacementOfId} IS NULL OR (${table.replacementOfId} <> ${table.id} AND ${table.reversalOfId} IS NULL)`,
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

export const assetSettings = sqliteTable("asset_settings", {
  id: integer("id").primaryKey(),
  timezoneMode: text("timezone_mode", { enum: ["DEVICE", "CUSTOM"] })
    .notNull()
    .default("DEVICE"),
  timezoneId: text("timezone_id").notNull().default("UTC"),
  cryptoRefreshMinutes: integer("crypto_refresh_minutes").notNull().default(15),
  metalRefreshMinutes: integer("metal_refresh_minutes").notNull().default(60),
  fiatRefreshMinutes: integer("fiat_refresh_minutes").notNull().default(1440),
  primaryCryptoProvider: text("primary_crypto_provider")
    .notNull()
    .default("COINPAPRIKA"),
  fallbackCryptoProvider: text("fallback_crypto_provider")
    .notNull()
    .default("COINGECKO"),
  updatedAt: text("updated_at").notNull(),
});

export const assetRefreshStates = sqliteTable("asset_refresh_states", {
  providerKey: text("provider_key").primaryKey(),
  lastAttemptAt: text("last_attempt_at"),
  lastSuccessAt: text("last_success_at"),
  failureCount: integer("failure_count").notNull().default(0),
  nextAttemptAt: text("next_attempt_at"),
  lastError: text("last_error"),
});

export const assetTypes = sqliteTable("asset_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  assetClass: text("asset_class", {
    enum: ["CRYPTO", "METAL", "STOCK", "OTHER"],
  }).notNull(),
  valuationModel: text("valuation_model", {
    enum: ["STABLE_VALUE", "MARKET_VALUED"],
  }).notNull(),
  unitCode: text("unit_code").notNull(),
  quantityPrecision: integer("quantity_precision").notNull(),
  pricePrecision: integer("price_precision").notNull(),
  quoteCurrency: text("quote_currency")
    .notNull()
    .references(() => currencies.code, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  assetTypeId: text("asset_type_id")
    .notNull()
    .references(() => assetTypes.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  providerSymbol: text("provider_symbol"),
  quoteCurrency: text("quote_currency")
    .notNull()
    .references(() => currencies.code, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const assetLots = sqliteTable("asset_lots", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  currencyCode: text("currency_code")
    .notNull()
    .references(() => currencies.code, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  quantity: text("quantity").notNull(),
  remainingQuantity: text("remaining_quantity").notNull(),
  costBasisMinor: integer("cost_basis_minor").notNull(),
  remainingCostBasisMinor: integer("remaining_cost_basis_minor").notNull(),
  acquiredAt: text("acquired_at").notNull(),
  status: text("status", { enum: ["ACTIVE", "MERGED", "CLOSED"] }).notNull(),
  mergedIntoId: text("merged_into_id").references(
    (): AnySQLiteColumn => assetLots.id,
    { onDelete: "restrict", onUpdate: "restrict" },
  ),
  createdAt: text("created_at").notNull(),
});

export const assetDcaComponents = sqliteTable(
  "asset_dca_components",
  {
    aggregateLotId: text("aggregate_lot_id")
      .notNull()
      .references(() => assetLots.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    componentLotId: text("component_lot_id")
      .notNull()
      .unique()
      .references(() => assetLots.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.aggregateLotId, table.componentLotId] }),
  ],
);

export const assetTransactions = sqliteTable("asset_transactions", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  transactionKind: text("transaction_kind", {
    enum: ["BUY", "SELL"],
  }).notNull(),
  lotId: text("lot_id")
    .notNull()
    .references(() => assetLots.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  quantity: text("quantity").notNull(),
  executionPrice: text("execution_price").notNull(),
  currencyCode: text("currency_code")
    .notNull()
    .references(() => currencies.code, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  grossAmountMinor: integer("gross_amount_minor").notNull(),
  netCashAmountMinor: integer("net_cash_amount_minor").notNull(),
  costBasisMinor: integer("cost_basis_minor").notNull(),
  feeAmountMinor: integer("fee_amount_minor").notNull().default(0),
  feeCategoryId: text("fee_category_id").references(() => categories.id, {
    onDelete: "restrict",
    onUpdate: "restrict",
  }),
  cashAccountId: text("cash_account_id")
    .notNull()
    .references(() => accounts.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  investmentAccountId: text("investment_account_id")
    .notNull()
    .references(() => accounts.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  journalEntryId: text("journal_entry_id")
    .notNull()
    .unique()
    .references(() => journalEntries.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  priceQuoteId: text("price_quote_id"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const assetPriceQuotes = sqliteTable("asset_price_quotes", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  priceDecimal: text("price_decimal").notNull(),
  currencyCode: text("currency_code")
    .notNull()
    .references(() => currencies.code, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  source: text("source", {
    enum: [
      "COINPAPRIKA",
      "COINGECKO",
      "FRANKFURTER",
      "METALS_PROVIDER",
      "MANUAL",
    ],
  }).notNull(),
  quoteStatus: text("quote_status", {
    enum: ["FRESH", "STALE", "REJECTED"],
  }).notNull(),
  observedAt: text("observed_at").notNull(),
  capturedAt: text("captured_at").notNull(),
  conversionBasis: text("conversion_basis"),
  createdAt: text("created_at").notNull(),
});

export const assetDailyValuations = sqliteTable("asset_daily_valuations", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  valuationDate: text("valuation_date").notNull(),
  quantity: text("quantity").notNull(),
  unitPrice: text("unit_price").notNull(),
  totalValue: text("total_value").notNull(),
  currencyCode: text("currency_code")
    .notNull()
    .references(() => currencies.code, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
  source: text("source", {
    enum: [
      "COINPAPRIKA",
      "COINGECKO",
      "FRANKFURTER",
      "METALS_PROVIDER",
      "MANUAL",
    ],
  }).notNull(),
  quoteStatus: text("quote_status", {
    enum: ["FRESH", "STALE", "REJECTED"],
  }).notNull(),
  observedAt: text("observed_at").notNull(),
  capturedAt: text("captured_at").notNull(),
  closedAt: text("closed_at"),
  createdAt: text("created_at").notNull(),
});
export const interestPlans = sqliteTable(
  "interest_plans",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    principalAccountId: text("principal_account_id")
      .notNull()
      .references(() => accounts.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    interestIncomeAccountId: text("interest_income_account_id")
      .notNull()
      .references(() => accounts.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    payoutAccountId: text("payout_account_id").references(() => accounts.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
    annualRatePpm: integer("annual_rate_ppm").notNull(),
    rateConvention: text("rate_convention", { enum: ["NOMINAL_APR"] })
      .notNull()
      .default("NOMINAL_APR"),
    dayCount: text("day_count", { enum: ["ACT_365_FIXED"] })
      .notNull()
      .default("ACT_365_FIXED"),
    compounding: text("compounding", {
      enum: ["SIMPLE", "AFTER_CAPITALIZATION"],
    }).notNull(),
    postingFrequency: text("posting_frequency", {
      enum: ["MONTHLY", "AT_MATURITY"],
    }).notNull(),
    startDate: text("start_date").notNull(),
    maturityDate: text("maturity_date"),
    timezoneId: text("timezone_id").notNull(),
    status: text("status", { enum: ["ACTIVE", "PAUSED", "CLOSED"] })
      .notNull()
      .default("ACTIVE"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("interest_plans_principal_status_idx").on(
      table.principalAccountId,
      table.status,
    ),
    uniqueIndex("interest_plans_one_active_per_principal")
      .on(table.principalAccountId)
      .where(sql`${table.status} = 'ACTIVE'`),
    check("interest_plans_name_nonempty", sql`length(trim(${table.name})) > 0`),
    check(
      "interest_plans_rate_range",
      sql`${table.annualRatePpm} BETWEEN 0 AND 10000000`,
    ),
    check(
      "interest_plans_maturity_after_start",
      sql`${table.maturityDate} IS NULL OR ${table.maturityDate} > ${table.startDate}`,
    ),
  ],
);

export const interestAccruals = sqliteTable(
  "interest_accruals",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => interestPlans.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    principalMinor: integer("principal_minor").notNull(),
    accruedNumerator: text("accrued_numerator").notNull(),
    accruedDenominator: text("accrued_denominator").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    status: text("status", { enum: ["ACCRUED", "POSTED", "PAID"] })
      .notNull()
      .default("ACCRUED"),
    accrualKind: text("accrual_kind", {
      enum: ["CAPITALIZATION", "PAYOUT"],
    }).notNull(),
    journalEntryId: text("journal_entry_id")
      .unique()
      .references(() => journalEntries.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    createdAt: text("created_at").notNull(),
    postedAt: text("posted_at"),
    paidAt: text("paid_at"),
  },
  (table) => [
    uniqueIndex("interest_accruals_plan_period_kind_unique").on(
      table.planId,
      table.periodStart,
      table.periodEnd,
      table.accrualKind,
    ),
    index("interest_accruals_plan_period_idx").on(
      table.planId,
      table.periodEnd,
    ),
    check(
      "interest_accruals_period_check",
      sql`${table.periodEnd} > ${table.periodStart}`,
    ),
    check(
      "interest_accruals_principal_range",
      sql`${table.principalMinor} > 0 AND ${table.principalMinor} <= 9007199254740991`,
    ),
    check(
      "interest_accruals_fraction_positive",
      sql`length(${table.accruedNumerator}) > 0 AND ${table.accruedNumerator} NOT GLOB '*[^0-9]*' AND length(${table.accruedDenominator}) > 0 AND ${table.accruedDenominator} NOT GLOB '*[^0-9]*' AND ${table.accruedDenominator} <> '0'`,
    ),
    check(
      "interest_accruals_amount_range",
      sql`${table.amountMinor} >= 0 AND ${table.amountMinor} <= 9007199254740991`,
    ),
    check(
      "interest_accruals_journal_state",
      sql`(${table.status} = 'ACCRUED' AND ${table.journalEntryId} IS NULL AND ${table.postedAt} IS NULL AND ${table.paidAt} IS NULL) OR (${table.status} = 'POSTED' AND ${table.accrualKind} = 'CAPITALIZATION' AND ${table.journalEntryId} IS NOT NULL AND ${table.postedAt} IS NOT NULL AND ${table.paidAt} IS NULL) OR (${table.status} = 'PAID' AND ${table.accrualKind} = 'PAYOUT' AND ${table.journalEntryId} IS NOT NULL AND ${table.postedAt} IS NOT NULL AND ${table.paidAt} IS NOT NULL)`,
    ),
  ],
);

export const liabilities = sqliteTable(
  "liabilities",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    liabilityAccountId: text("liability_account_id")
      .notNull()
      .unique()
      .references(() => accounts.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    interestExpenseAccountId: text("interest_expense_account_id")
      .notNull()
      .references(() => accounts.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    currencyCode: text("currency_code")
      .notNull()
      .references(() => currencies.code, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    fxRateNumerator: text("fx_rate_numerator").notNull().default("1"),
    fxRateDenominator: text("fx_rate_denominator").notNull().default("1"),
    originalPrincipalMinor: integer("original_principal_minor").notNull(),
    outstandingPrincipalMinor: integer("outstanding_principal_minor").notNull(),
    annualRatePpm: integer("annual_rate_ppm").notNull(),
    repaymentMethod: text("repayment_method", {
      enum: ["DECLINING", "EQUAL_PRINCIPAL", "ANNUITY", "INTEREST_ONLY"],
    }).notNull(),
    termMonths: integer("term_months").notNull(),
    startDate: text("start_date").notNull(),
    firstDueDate: text("first_due_date").notNull(),
    timezoneId: text("timezone_id").notNull(),
    earlyPaymentPolicy: text("early_payment_policy", {
      enum: [
        "KEEP_MATURITY_REDUCE_INSTALLMENT",
        "KEEP_INSTALLMENT_SHORTEN_TERM",
      ],
    }).notNull(),
    status: text("status", {
      enum: ["ACTIVE", "PAID_OFF", "ARCHIVED"],
    }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    paidOffAt: text("paid_off_at"),
  },
  (table) => [
    index("liabilities_status_idx").on(table.status, table.updatedAt),
    check(
      "liabilities_principal_range",
      sql`${table.originalPrincipalMinor} > 0 AND ${table.originalPrincipalMinor} <= 9007199254740991 AND ${table.outstandingPrincipalMinor} >= 0 AND ${table.outstandingPrincipalMinor} <= 9007199254740991`,
    ),
    check(
      "liabilities_rate_range",
      sql`${table.annualRatePpm} BETWEEN 0 AND 10000000`,
    ),
    check("liabilities_term_range", sql`${table.termMonths} BETWEEN 1 AND 600`),
  ],
);

export const liabilityInstallments = sqliteTable(
  "liability_installments",
  {
    id: text("id").primaryKey(),
    liabilityId: text("liability_id")
      .notNull()
      .references(() => liabilities.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    sequence: integer("sequence").notNull(),
    periodStart: text("period_start").notNull(),
    dueDate: text("due_date").notNull(),
    openingPrincipalMinor: integer("opening_principal_minor").notNull(),
    principalDueMinor: integer("principal_due_minor").notNull(),
    interestDueMinor: integer("interest_due_minor").notNull(),
    totalDueMinor: integer("total_due_minor").notNull(),
    closingPrincipalMinor: integer("closing_principal_minor").notNull(),
    annualRatePpm: integer("annual_rate_ppm").notNull(),
    principalPaidMinor: integer("principal_paid_minor").notNull().default(0),
    interestPaidMinor: integer("interest_paid_minor").notNull().default(0),
    status: text("status", {
      enum: [
        "UPCOMING",
        "DUE",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ],
    }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("liability_installments_liability_sequence_unique").on(
      table.liabilityId,
      table.sequence,
    ),
    index("liability_installments_due_idx").on(
      table.liabilityId,
      table.dueDate,
      table.sequence,
    ),
    check(
      "liability_installments_total_check",
      sql`${table.totalDueMinor} = ${table.principalDueMinor} + ${table.interestDueMinor}`,
    ),
  ],
);

export const liabilityPayments = sqliteTable(
  "liability_payments",
  {
    id: text("id").primaryKey(),
    liabilityId: text("liability_id")
      .notNull()
      .references(() => liabilities.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    scheduleId: text("schedule_id").references(() => liabilityInstallments.id, {
      onDelete: "restrict",
      onUpdate: "restrict",
    }),
    sourceAccountId: text("source_account_id")
      .notNull()
      .references(() => accounts.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    journalEntryId: text("journal_entry_id")
      .notNull()
      .unique()
      .references(() => journalEntries.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    fxRateNumerator: text("fx_rate_numerator").notNull().default("1"),
    fxRateDenominator: text("fx_rate_denominator").notNull().default("1"),
    replacesPaymentId: text("replaces_payment_id"),
    paidAt: text("paid_at").notNull(),
    principalPaidMinor: integer("principal_paid_minor").notNull(),
    interestPaidMinor: integer("interest_paid_minor").notNull(),
    feePaidMinor: integer("fee_paid_minor").notNull().default(0),
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("liability_payments_liability_paid_idx").on(
      table.liabilityId,
      table.paidAt,
    ),
    check(
      "liability_payments_amount_check",
      sql`${table.principalPaidMinor} >= 0 AND ${table.interestPaidMinor} >= 0 AND ${table.feePaidMinor} >= 0 AND ${table.principalPaidMinor} + ${table.interestPaidMinor} + ${table.feePaidMinor} > 0`,
    ),
  ],
);

export const liabilityRateChanges = sqliteTable(
  "liability_rate_changes",
  {
    id: text("id").primaryKey(),
    liabilityId: text("liability_id")
      .notNull()
      .references(() => liabilities.id, { onDelete: "restrict", onUpdate: "restrict" }),
    annualRatePpm: integer("annual_rate_ppm").notNull(),
    effectiveDate: text("effective_date").notNull(),
    reason: text("reason"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("liability_rate_changes_effective_unique").on(table.liabilityId, table.effectiveDate),
    index("liability_rate_changes_effective_idx").on(table.liabilityId, table.effectiveDate),
    check("liability_rate_changes_apr_range", sql`${table.annualRatePpm} BETWEEN 0 AND 10000000`),
  ],
);

export const liabilityPaymentAllocations = sqliteTable("liability_payment_allocations", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().references(() => liabilityPayments.id, { onDelete: "restrict", onUpdate: "restrict" }),
  installmentId: text("installment_id").notNull().references(() => liabilityInstallments.id, { onDelete: "restrict", onUpdate: "restrict" }),
  principalMinor: integer("principal_minor").notNull(),
  interestMinor: integer("interest_minor").notNull(),
  principalBeforeMinor: integer("principal_before_minor").notNull(),
  interestBeforeMinor: integer("interest_before_minor").notNull(),
  statusBefore: text("status_before").notNull(),
});

export const liabilityPaymentScheduleChanges = sqliteTable("liability_payment_schedule_changes", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().references(() => liabilityPayments.id, { onDelete: "restrict", onUpdate: "restrict" }),
  installmentId: text("installment_id").notNull().references(() => liabilityInstallments.id, { onDelete: "restrict", onUpdate: "restrict" }),
  action: text("action", { enum: ["CANCELLED", "CREATED"] }).notNull(),
  previousStatus: text("previous_status"),
});

export const liabilityPaymentReversals = sqliteTable("liability_payment_reversals", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().unique().references(() => liabilityPayments.id, { onDelete: "restrict", onUpdate: "restrict" }),
  journalEntryId: text("journal_entry_id").notNull().unique().references(() => journalEntries.id, { onDelete: "restrict", onUpdate: "restrict" }),
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
});

export const ledgerSchema = {
  currencies,
  ledgerSettings,
  accounts,
  categories,
  journalEntries,
  journalLines,
  assetSettings,
  assetRefreshStates,
  assetTypes,
  assets,
  assetLots,
  assetDcaComponents,
  assetTransactions,
  assetPriceQuotes,
  assetDailyValuations,
  interestPlans,
  interestAccruals,
  liabilities,
  liabilityInstallments,
  liabilityPayments,
  liabilityRateChanges,
  liabilityPaymentAllocations,
  liabilityPaymentScheduleChanges,
  liabilityPaymentReversals,
};
