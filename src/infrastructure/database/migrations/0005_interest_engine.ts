export const migration0005 = String.raw`
CREATE TABLE interest_plans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  principal_account_id TEXT NOT NULL REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  interest_income_account_id TEXT NOT NULL REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  payout_account_id TEXT REFERENCES accounts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  annual_rate_ppm INTEGER NOT NULL CHECK (annual_rate_ppm BETWEEN 0 AND 10000000),
  rate_convention TEXT NOT NULL DEFAULT 'NOMINAL_APR' CHECK (rate_convention = 'NOMINAL_APR'),
  day_count TEXT NOT NULL DEFAULT 'ACT_365_FIXED' CHECK (day_count = 'ACT_365_FIXED'),
  compounding TEXT NOT NULL CHECK (compounding IN ('SIMPLE', 'AFTER_CAPITALIZATION')),
  posting_frequency TEXT NOT NULL CHECK (posting_frequency IN ('MONTHLY', 'AT_MATURITY')),
  start_date TEXT NOT NULL,
  maturity_date TEXT,
  timezone_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (maturity_date IS NULL OR maturity_date > start_date)
);
--> statement-breakpoint
CREATE INDEX interest_plans_principal_status_idx
  ON interest_plans(principal_account_id, status);
--> statement-breakpoint
CREATE TABLE interest_accruals (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL REFERENCES interest_plans(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  principal_minor INTEGER NOT NULL CHECK (principal_minor > 0 AND principal_minor <= 9007199254740991),
  accrued_numerator TEXT NOT NULL CHECK (length(accrued_numerator) > 0 AND accrued_numerator NOT GLOB '*[^0-9]*'),
  accrued_denominator TEXT NOT NULL CHECK (length(accrued_denominator) > 0 AND accrued_denominator NOT GLOB '*[^0-9]*' AND accrued_denominator <> '0'),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0 AND amount_minor <= 9007199254740991),
  status TEXT NOT NULL DEFAULT 'ACCRUED' CHECK (status IN ('ACCRUED', 'POSTED', 'PAID')),
  accrual_kind TEXT NOT NULL CHECK (accrual_kind IN ('CAPITALIZATION', 'PAYOUT')),
  journal_entry_id TEXT UNIQUE REFERENCES journal_entries(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  posted_at TEXT,
  paid_at TEXT,
  UNIQUE (plan_id, period_start, period_end, accrual_kind),
  CHECK (period_end > period_start),
  CHECK (
    (status = 'ACCRUED' AND journal_entry_id IS NULL AND posted_at IS NULL AND paid_at IS NULL)
    OR (status = 'POSTED' AND accrual_kind = 'CAPITALIZATION' AND journal_entry_id IS NOT NULL AND posted_at IS NOT NULL AND paid_at IS NULL)
    OR (status = 'PAID' AND accrual_kind = 'PAYOUT' AND journal_entry_id IS NOT NULL AND posted_at IS NOT NULL AND paid_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE INDEX interest_accruals_plan_period_idx
  ON interest_accruals(plan_id, period_end);
--> statement-breakpoint
CREATE TRIGGER interest_plans_account_guard
BEFORE INSERT ON interest_plans
BEGIN
  SELECT CASE WHEN
    (SELECT type FROM accounts WHERE id = NEW.principal_account_id) <> 'ASSET'
    OR (SELECT is_investment FROM accounts WHERE id = NEW.principal_account_id) <> 1
    THEN RAISE(ABORT, 'interest principal must be an INVESTMENT ASSET account') END;
  SELECT CASE WHEN
    (SELECT type FROM accounts WHERE id = NEW.interest_income_account_id) <> 'INCOME'
    THEN RAISE(ABORT, 'interest income account must have INCOME type') END;
  SELECT CASE WHEN
    (SELECT currency_code FROM accounts WHERE id = NEW.principal_account_id) <>
    (SELECT currency_code FROM accounts WHERE id = NEW.interest_income_account_id)
    THEN RAISE(ABORT, 'interest accounts must use the same currency') END;
  SELECT CASE WHEN NEW.payout_account_id IS NOT NULL AND (
    (SELECT type FROM accounts WHERE id = NEW.payout_account_id) <> 'ASSET'
    OR (SELECT currency_code FROM accounts WHERE id = NEW.principal_account_id) <>
       (SELECT currency_code FROM accounts WHERE id = NEW.payout_account_id)
  ) THEN RAISE(ABORT, 'payout account must be an ASSET in the plan currency') END;
END;
--> statement-breakpoint
CREATE TRIGGER interest_plans_terms_immutable
BEFORE UPDATE ON interest_plans
WHEN
  NEW.principal_account_id <> OLD.principal_account_id
  OR NEW.interest_income_account_id <> OLD.interest_income_account_id
  OR NEW.payout_account_id IS NOT OLD.payout_account_id
  OR NEW.annual_rate_ppm <> OLD.annual_rate_ppm
  OR NEW.rate_convention <> OLD.rate_convention
  OR NEW.day_count <> OLD.day_count
  OR NEW.compounding <> OLD.compounding
  OR NEW.posting_frequency <> OLD.posting_frequency
  OR NEW.start_date <> OLD.start_date
  OR NEW.maturity_date IS NOT OLD.maturity_date
  OR NEW.timezone_id <> OLD.timezone_id
  OR (OLD.status = 'CLOSED' AND NEW.status <> 'CLOSED')
BEGIN
  SELECT RAISE(ABORT, 'interest plan terms are immutable; create a new plan version');
END;
--> statement-breakpoint
CREATE TRIGGER interest_plans_no_delete
BEFORE DELETE ON interest_plans
BEGIN
  SELECT RAISE(ABORT, 'interest plans cannot be deleted; close the plan instead');
END;
--> statement-breakpoint
CREATE TRIGGER interest_accruals_insert_journal_guard
BEFORE INSERT ON interest_accruals
WHEN NEW.status <> 'ACCRUED'
BEGIN
  SELECT RAISE(ABORT, 'interest accrual must be created before posting');
END;
--> statement-breakpoint
CREATE TRIGGER interest_accruals_update_guard
BEFORE UPDATE ON interest_accruals
WHEN
  NEW.id <> OLD.id OR NEW.plan_id <> OLD.plan_id
  OR NEW.period_start <> OLD.period_start OR NEW.period_end <> OLD.period_end
  OR NEW.principal_minor <> OLD.principal_minor
  OR NEW.accrued_numerator <> OLD.accrued_numerator
  OR NEW.accrued_denominator <> OLD.accrued_denominator
  OR OLD.amount_minor <> 0
  OR NEW.accrual_kind <> OLD.accrual_kind
  OR NEW.idempotency_key <> OLD.idempotency_key
  OR NEW.created_at <> OLD.created_at
  OR OLD.status <> 'ACCRUED'
  OR NEW.status NOT IN ('POSTED', 'PAID')
  OR NEW.journal_entry_id IS NULL OR NEW.posted_at IS NULL
  OR (NEW.status = 'POSTED' AND (NEW.accrual_kind <> 'CAPITALIZATION' OR NEW.paid_at IS NOT NULL))
  OR (NEW.status = 'PAID' AND (NEW.accrual_kind <> 'PAYOUT' OR NEW.paid_at IS NULL))
BEGIN
  SELECT RAISE(ABORT, 'invalid or immutable interest accrual transition');
END;
--> statement-breakpoint
CREATE TRIGGER interest_accruals_no_delete
BEFORE DELETE ON interest_accruals
BEGIN
  SELECT RAISE(ABORT, 'interest accrual history cannot be deleted');
END;
--> statement-breakpoint
CREATE TRIGGER interest_accruals_posted_journal_guard
BEFORE UPDATE OF status ON interest_accruals
WHEN NEW.status IN ('POSTED', 'PAID')
  AND (SELECT status FROM journal_entries WHERE id = NEW.journal_entry_id) <> 'POSTED'
BEGIN
  SELECT RAISE(ABORT, 'interest accrual requires a POSTED journal entry');
END;
`;
