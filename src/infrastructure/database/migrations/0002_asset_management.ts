export const migration0002 = String.raw`
INSERT OR IGNORE INTO currencies (code, name, minor_unit, is_active, created_at)
VALUES ('USDT', 'Tether USD', 6, 1, '2026-11-03T00:00:00.000Z');
--> statement-breakpoint
CREATE TABLE asset_settings (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  timezone_mode TEXT NOT NULL DEFAULT 'DEVICE' CHECK (timezone_mode IN ('DEVICE', 'CUSTOM')),
  timezone_id TEXT NOT NULL DEFAULT 'UTC',
  crypto_refresh_minutes INTEGER NOT NULL DEFAULT 15 CHECK (crypto_refresh_minutes BETWEEN 15 AND 1440),
  metal_refresh_minutes INTEGER NOT NULL DEFAULT 60 CHECK (metal_refresh_minutes BETWEEN 15 AND 1440),
  fiat_refresh_minutes INTEGER NOT NULL DEFAULT 1440 CHECK (fiat_refresh_minutes BETWEEN 15 AND 10080),
  primary_crypto_provider TEXT NOT NULL DEFAULT 'COINPAPRIKA',
  fallback_crypto_provider TEXT NOT NULL DEFAULT 'COINGECKO',
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO asset_settings (id, timezone_mode, timezone_id, updated_at)
VALUES (1, 'DEVICE', 'UTC', '2026-11-03T00:00:00.000Z');
--> statement-breakpoint
CREATE TABLE asset_refresh_states (
  provider_key TEXT PRIMARY KEY NOT NULL,
  last_attempt_at TEXT,
  last_success_at TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  next_attempt_at TEXT,
  last_error TEXT
);
--> statement-breakpoint
CREATE TABLE asset_types (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  asset_class TEXT NOT NULL CHECK (asset_class IN ('CRYPTO', 'METAL', 'STOCK', 'OTHER')),
  valuation_model TEXT NOT NULL CHECK (valuation_model IN ('STABLE_VALUE', 'MARKET_VALUED')),
  unit_code TEXT NOT NULL,
  quantity_precision INTEGER NOT NULL CHECK (quantity_precision BETWEEN 0 AND 12),
  price_precision INTEGER NOT NULL CHECK (price_precision BETWEEN 0 AND 12),
  quote_currency TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE assets (
  id TEXT PRIMARY KEY NOT NULL,
  asset_type_id TEXT NOT NULL REFERENCES asset_types(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  symbol TEXT NOT NULL,
  provider_symbol TEXT,
  quote_currency TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX assets_type_idx ON assets(asset_type_id, is_archived);
--> statement-breakpoint
CREATE TABLE asset_lots (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  quantity TEXT NOT NULL,
  remaining_quantity TEXT NOT NULL,
  cost_basis_minor INTEGER NOT NULL CHECK (cost_basis_minor >= 0 AND cost_basis_minor <= 9007199254740991),
  acquired_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'MERGED', 'CLOSED')),
  merged_into_id TEXT REFERENCES asset_lots(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  CHECK ((status = 'MERGED' AND merged_into_id IS NOT NULL) OR (status <> 'MERGED' AND merged_into_id IS NULL))
);
--> statement-breakpoint
CREATE INDEX asset_lots_asset_status_idx ON asset_lots(asset_id, status);
--> statement-breakpoint
CREATE TABLE asset_dca_components (
  aggregate_lot_id TEXT NOT NULL REFERENCES asset_lots(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  component_lot_id TEXT NOT NULL UNIQUE REFERENCES asset_lots(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (aggregate_lot_id, component_lot_id),
  CHECK (aggregate_lot_id <> component_lot_id)
);
--> statement-breakpoint
CREATE TABLE asset_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  transaction_kind TEXT NOT NULL CHECK (transaction_kind IN ('BUY', 'SELL')),
  lot_id TEXT NOT NULL REFERENCES asset_lots(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  quantity TEXT NOT NULL,
  execution_price TEXT NOT NULL,
  currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  gross_amount_minor INTEGER NOT NULL CHECK (gross_amount_minor >= 0 AND gross_amount_minor <= 9007199254740991),
  net_cash_amount_minor INTEGER NOT NULL CHECK (net_cash_amount_minor >= 0 AND net_cash_amount_minor <= 9007199254740991),
  cost_basis_minor INTEGER NOT NULL CHECK (cost_basis_minor >= 0 AND cost_basis_minor <= 9007199254740991),
  fee_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (fee_amount_minor >= 0 AND fee_amount_minor <= 9007199254740991),
  fee_category_id TEXT REFERENCES categories(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  cash_account_id TEXT NOT NULL REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  investment_account_id TEXT NOT NULL REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  journal_entry_id TEXT NOT NULL UNIQUE REFERENCES journal_entries(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  price_quote_id TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (fee_amount_minor = 0 OR fee_category_id IS NOT NULL),
  CHECK (length(trim(quantity)) > 0 AND length(trim(execution_price)) > 0)
);
--> statement-breakpoint
CREATE INDEX asset_transactions_asset_occurred_idx ON asset_transactions(asset_id, occurred_at);
--> statement-breakpoint
CREATE TABLE asset_price_quotes (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  price_decimal TEXT NOT NULL,
  currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  source TEXT NOT NULL CHECK (source IN ('COINPAPRIKA', 'COINGECKO', 'FRANKFURTER', 'METALS_PROVIDER', 'MANUAL')),
  quote_status TEXT NOT NULL CHECK (quote_status IN ('FRESH', 'STALE', 'REJECTED')),
  observed_at TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  conversion_basis TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX asset_price_quotes_latest_idx ON asset_price_quotes(asset_id, captured_at);
--> statement-breakpoint
CREATE TABLE asset_daily_valuations (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  valuation_date TEXT NOT NULL,
  quantity TEXT NOT NULL,
  unit_price TEXT NOT NULL,
  total_value TEXT NOT NULL,
  currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  source TEXT NOT NULL CHECK (source IN ('COINPAPRIKA', 'COINGECKO', 'FRANKFURTER', 'METALS_PROVIDER', 'MANUAL')),
  quote_status TEXT NOT NULL CHECK (quote_status IN ('FRESH', 'STALE', 'REJECTED')),
  observed_at TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (asset_id, valuation_date)
);
--> statement-breakpoint
CREATE INDEX asset_daily_valuations_history_idx ON asset_daily_valuations(asset_id, valuation_date);
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN is_investment INTEGER NOT NULL DEFAULT 0
  CHECK (is_investment IN (0, 1) AND (is_investment = 0 OR type = 'ASSET'));
--> statement-breakpoint
CREATE TRIGGER asset_lots_no_merge_cycle
BEFORE UPDATE OF merged_into_id ON asset_lots
WHEN NEW.merged_into_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NEW.merged_into_id = NEW.id
    THEN RAISE(ABORT, 'an asset lot cannot merge into itself') END;
END;
--> statement-breakpoint
CREATE TRIGGER asset_transactions_fee_category_kind
BEFORE INSERT ON asset_transactions
WHEN NEW.fee_amount_minor > 0
  AND ((SELECT kind FROM categories WHERE id = NEW.fee_category_id) <> 'EXPENSE'
    OR (SELECT is_archived FROM categories WHERE id = NEW.fee_category_id) = 1)
BEGIN
  SELECT RAISE(ABORT, 'asset transaction fee requires an EXPENSE category');
END;
--> statement-breakpoint
CREATE TRIGGER asset_transactions_posted_journal_guard
BEFORE INSERT ON asset_transactions
WHEN (SELECT status FROM journal_entries WHERE id = NEW.journal_entry_id) <> 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'asset transaction must reference a POSTED journal entry');
END;
--> statement-breakpoint
CREATE TRIGGER asset_transactions_investment_account_guard
BEFORE INSERT ON asset_transactions
WHEN (SELECT is_investment FROM accounts WHERE id = NEW.investment_account_id) <> 1
  OR (SELECT type FROM accounts WHERE id = NEW.investment_account_id) <> 'ASSET'
BEGIN
  SELECT RAISE(ABORT, 'asset transactions require a designated investment ASSET account');
END;
--> statement-breakpoint
CREATE TRIGGER asset_transactions_no_update
BEFORE UPDATE ON asset_transactions
BEGIN
  SELECT RAISE(ABORT, 'asset transaction history is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER asset_transactions_no_delete
BEFORE DELETE ON asset_transactions
BEGIN
  SELECT RAISE(ABORT, 'asset transaction history cannot be deleted');
END;
--> statement-breakpoint
CREATE TRIGGER asset_price_quotes_no_update
BEFORE UPDATE ON asset_price_quotes
BEGIN
  SELECT RAISE(ABORT, 'price quote history is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER asset_price_quotes_no_delete
BEFORE DELETE ON asset_price_quotes
BEGIN
  SELECT RAISE(ABORT, 'price quote history cannot be deleted');
END;
--> statement-breakpoint
CREATE TRIGGER asset_daily_valuations_closed_immutable
BEFORE UPDATE ON asset_daily_valuations
WHEN OLD.closed_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'closed daily valuations are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER asset_daily_valuations_no_delete
BEFORE DELETE ON asset_daily_valuations
BEGIN
  SELECT RAISE(ABORT, 'daily valuation history cannot be deleted');
END;
`;
