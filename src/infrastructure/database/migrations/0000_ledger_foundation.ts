export const migration0000 = String.raw`
CREATE TABLE currencies (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  minor_unit INTEGER NOT NULL CHECK (minor_unit BETWEEN 0 AND 6),
  is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK (length(code) = 3 AND code = upper(code))
);

INSERT INTO currencies (code, name, minor_unit, is_active, created_at)
VALUES
  ('VND', 'Vietnamese Dong', 0, 1, '2026-11-02T00:00:00.000Z'),
  ('USD', 'US Dollar', 2, 1, '2026-11-02T00:00:00.000Z');

CREATE TABLE ledger_settings (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  base_currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  is_system INTEGER NOT NULL CHECK (is_system IN (0, 1)),
  is_archived INTEGER NOT NULL CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX accounts_id_currency_unique ON accounts(id, currency_code);
CREATE INDEX accounts_type_archived_idx ON accounts(type, is_archived);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'POSTED')),
  base_currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  idempotency_key TEXT,
  reversal_of_id TEXT REFERENCES journal_entries(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  posted_at TEXT,
  CHECK ((status = 'DRAFT' AND posted_at IS NULL) OR (status = 'POSTED' AND posted_at IS NOT NULL)),
  CHECK (reversal_of_id IS NULL OR reversal_of_id <> id)
);
CREATE INDEX journal_entries_occurred_at_idx ON journal_entries(occurred_at);
CREATE INDEX journal_entries_status_idx ON journal_entries(status);
CREATE UNIQUE INDEX journal_entries_idempotency_unique
  ON journal_entries(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX journal_entries_reversal_unique
  ON journal_entries(reversal_of_id) WHERE reversal_of_id IS NOT NULL;

CREATE TABLE journal_lines (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  account_id TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('DEBIT', 'CREDIT')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  fx_rate_numerator TEXT NOT NULL CHECK (
    fx_rate_numerator GLOB '[1-9]*' AND fx_rate_numerator NOT GLOB '*[^0-9]*'
  ),
  fx_rate_denominator TEXT NOT NULL CHECK (
    fx_rate_denominator GLOB '[1-9]*' AND fx_rate_denominator NOT GLOB '*[^0-9]*'
  ),
  base_amount_minor INTEGER NOT NULL CHECK (base_amount_minor >= 0),
  memo TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (entry_id, line_number),
  FOREIGN KEY (account_id, currency_code)
    REFERENCES accounts(id, currency_code)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE INDEX journal_lines_account_idx ON journal_lines(account_id, currency_code);
CREATE INDEX journal_lines_entry_idx ON journal_lines(entry_id);

CREATE TRIGGER journal_entries_no_update_posted
BEFORE UPDATE ON journal_entries
WHEN OLD.status = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'posted journal entries are immutable');
END;

CREATE TRIGGER journal_entries_no_delete_posted
BEFORE DELETE ON journal_entries
WHEN OLD.status = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'posted journal entries cannot be deleted');
END;

CREATE TRIGGER journal_lines_no_insert_into_posted
BEFORE INSERT ON journal_lines
WHEN (SELECT status FROM journal_entries WHERE id = NEW.entry_id) = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'cannot add lines to a posted journal entry');
END;

CREATE TRIGGER journal_lines_no_update_in_posted
BEFORE UPDATE ON journal_lines
WHEN
  (SELECT status FROM journal_entries WHERE id = OLD.entry_id) = 'POSTED'
  OR (SELECT status FROM journal_entries WHERE id = NEW.entry_id) = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'posted journal lines are immutable');
END;

CREATE TRIGGER journal_lines_no_delete_from_posted
BEFORE DELETE ON journal_lines
WHEN (SELECT status FROM journal_entries WHERE id = OLD.entry_id) = 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'posted journal lines cannot be deleted');
END;
`;
