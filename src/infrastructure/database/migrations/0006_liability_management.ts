export const migration0006 = String.raw\`
CREATE TABLE liabilities (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  liability_account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  interest_expense_account_id TEXT NOT NULL REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  currency_code TEXT NOT NULL REFERENCES currencies(code) ON UPDATE RESTRICT ON DELETE RESTRICT,
  original_principal_minor INTEGER NOT NULL CHECK (original_principal_minor > 0 AND original_principal_minor <= 9007199254740991),
  outstanding_principal_minor INTEGER NOT NULL CHECK (outstanding_principal_minor >= 0 AND outstanding_principal_minor <= 9007199254740991),
  annual_rate_ppm INTEGER NOT NULL CHECK (annual_rate_ppm BETWEEN 0 AND 10000000),
  repayment_method TEXT NOT NULL CHECK (repayment_method IN ('DECLINING', 'EQUAL_PRINCIPAL', 'ANNUITY', 'INTEREST_ONLY')),
  term_months INTEGER NOT NULL CHECK (term_months BETWEEN 1 AND 600),
  start_date TEXT NOT NULL,
  first_due_date TEXT NOT NULL,
  timezone_id TEXT NOT NULL,
  early_payment_policy TEXT NOT NULL CHECK (early_payment_policy IN ('KEEP_MATURITY_REDUCE_INSTALLMENT', 'KEEP_INSTALLMENT_SHORTEN_TERM')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAID_OFF', 'ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_off_at TEXT,
  CHECK (first_due_date > start_date),
  CHECK ((status IN ('PAID_OFF', 'ARCHIVED') AND outstanding_principal_minor = 0 AND paid_off_at IS NOT NULL) OR (status = 'ACTIVE' AND paid_off_at IS NULL))
);
--> statement-breakpoint
CREATE INDEX liabilities_status_idx ON liabilities(status, updated_at);
--> statement-breakpoint
CREATE TABLE liability_installments (
  id TEXT PRIMARY KEY NOT NULL,
  liability_id TEXT NOT NULL REFERENCES liabilities(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  period_start TEXT NOT NULL,
  due_date TEXT NOT NULL,
  opening_principal_minor INTEGER NOT NULL CHECK (opening_principal_minor >= 0 AND opening_principal_minor <= 9007199254740991),
  principal_due_minor INTEGER NOT NULL CHECK (principal_due_minor >= 0 AND principal_due_minor <= 9007199254740991),
  interest_due_minor INTEGER NOT NULL CHECK (interest_due_minor >= 0 AND interest_due_minor <= 9007199254740991),
  total_due_minor INTEGER NOT NULL CHECK (total_due_minor = principal_due_minor + interest_due_minor),
  closing_principal_minor INTEGER NOT NULL CHECK (closing_principal_minor >= 0 AND closing_principal_minor <= 9007199254740991),
  annual_rate_ppm INTEGER NOT NULL CHECK (annual_rate_ppm BETWEEN 0 AND 10000000),
  principal_paid_minor INTEGER NOT NULL DEFAULT 0 CHECK (principal_paid_minor >= 0 AND principal_paid_minor <= principal_due_minor),
  interest_paid_minor INTEGER NOT NULL DEFAULT 0 CHECK (interest_paid_minor >= 0 AND interest_paid_minor <= interest_due_minor),
  status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (liability_id, sequence),
  CHECK (due_date > period_start)
);
--> statement-breakpoint
CREATE INDEX liability_installments_due_idx ON liability_installments(liability_id, due_date, sequence);
--> statement-breakpoint
CREATE TABLE liability_payments (
  id TEXT PRIMARY KEY NOT NULL,
  liability_id TEXT NOT NULL REFERENCES liabilities(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  schedule_id TEXT REFERENCES liability_installments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  source_account_id TEXT NOT NULL REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  journal_entry_id TEXT NOT NULL UNIQUE REFERENCES journal_entries(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  paid_at TEXT NOT NULL,
  principal_paid_minor INTEGER NOT NULL CHECK (principal_paid_minor >= 0 AND principal_paid_minor <= 9007199254740991),
  interest_paid_minor INTEGER NOT NULL CHECK (interest_paid_minor >= 0 AND interest_paid_minor <= 9007199254740991),
  fee_paid_minor INTEGER NOT NULL DEFAULT 0 CHECK (fee_paid_minor >= 0 AND fee_paid_minor <= 9007199254740991),
  note TEXT,
  created_at TEXT NOT NULL,
  CHECK (principal_paid_minor + interest_paid_minor + fee_paid_minor > 0)
);
--> statement-breakpoint
CREATE INDEX liability_payments_liability_paid_idx ON liability_payments(liability_id, paid_at);
--> statement-breakpoint
CREATE TRIGGER liabilities_accounts_guard
BEFORE INSERT ON liabilities
BEGIN
  SELECT CASE WHEN (SELECT type FROM accounts WHERE id = NEW.liability_account_id) <> 'LIABILITY'
    OR (SELECT currency_code FROM accounts WHERE id = NEW.liability_account_id) <> NEW.currency_code
    THEN RAISE(ABORT, 'liability account must be a LIABILITY in the selected currency') END;
  SELECT CASE WHEN (SELECT type FROM accounts WHERE id = NEW.interest_expense_account_id) <> 'EXPENSE'
    OR (SELECT currency_code FROM accounts WHERE id = NEW.interest_expense_account_id) <> NEW.currency_code
    THEN RAISE(ABORT, 'interest account must be an EXPENSE in the liability currency') END;
END;
--> statement-breakpoint
CREATE TRIGGER liabilities_terms_immutable
BEFORE UPDATE ON liabilities
WHEN NEW.id <> OLD.id OR NEW.liability_account_id <> OLD.liability_account_id
  OR NEW.interest_expense_account_id <> OLD.interest_expense_account_id
  OR NEW.currency_code <> OLD.currency_code
  OR NEW.original_principal_minor <> OLD.original_principal_minor
  OR NEW.annual_rate_ppm <> OLD.annual_rate_ppm
  OR NEW.repayment_method <> OLD.repayment_method OR NEW.term_months <> OLD.term_months
  OR NEW.start_date <> OLD.start_date OR NEW.first_due_date <> OLD.first_due_date
  OR NEW.timezone_id <> OLD.timezone_id OR NEW.early_payment_policy <> OLD.early_payment_policy
  OR (OLD.status = 'ARCHIVED' AND NEW.status <> 'ARCHIVED')
BEGIN
  SELECT RAISE(ABORT, 'liability terms are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER liabilities_no_delete BEFORE DELETE ON liabilities
BEGIN SELECT RAISE(ABORT, 'liability history cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER liability_installments_update_guard
BEFORE UPDATE ON liability_installments
WHEN NEW.id <> OLD.id OR NEW.liability_id <> OLD.liability_id
  OR NEW.sequence <> OLD.sequence OR NEW.period_start <> OLD.period_start OR NEW.due_date <> OLD.due_date
  OR NEW.opening_principal_minor <> OLD.opening_principal_minor
  OR NEW.principal_due_minor <> OLD.principal_due_minor OR NEW.interest_due_minor <> OLD.interest_due_minor
  OR NEW.total_due_minor <> OLD.total_due_minor OR NEW.closing_principal_minor <> OLD.closing_principal_minor
  OR NEW.annual_rate_ppm <> OLD.annual_rate_ppm
  OR NEW.principal_paid_minor < OLD.principal_paid_minor OR NEW.interest_paid_minor < OLD.interest_paid_minor
  OR NEW.principal_paid_minor > NEW.principal_due_minor OR NEW.interest_paid_minor > NEW.interest_due_minor
BEGIN SELECT RAISE(ABORT, 'installment snapshots are immutable; only payment state may advance'); END;
--> statement-breakpoint
CREATE TRIGGER liability_installments_no_delete
BEFORE DELETE ON liability_installments
BEGIN SELECT RAISE(ABORT, 'installment history cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payments_journal_guard
BEFORE INSERT ON liability_payments
WHEN (SELECT status FROM journal_entries WHERE id = NEW.journal_entry_id) <> 'POSTED'
BEGIN SELECT RAISE(ABORT, 'liability payment requires a POSTED journal entry'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payments_no_update
BEFORE UPDATE ON liability_payments
BEGIN SELECT RAISE(ABORT, 'liability payment history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payments_no_delete
BEFORE DELETE ON liability_payments
BEGIN SELECT RAISE(ABORT, 'liability payment history cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER liabilities_archive_guard
BEFORE UPDATE OF status ON liabilities
WHEN NEW.status = 'ARCHIVED' AND (
  NEW.outstanding_principal_minor <> 0
  OR EXISTS (SELECT 1 FROM liability_installments s WHERE s.liability_id = OLD.id AND s.status NOT IN ('PAID', 'CANCELLED'))
)
BEGIN SELECT RAISE(ABORT, 'liability cannot be archived while principal or unpaid installments remain'); END;
\`;
