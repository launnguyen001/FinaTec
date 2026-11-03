export const migration0009 = String.raw`
ALTER TABLE liability_payments ADD COLUMN replaces_payment_id TEXT REFERENCES liability_payments(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TABLE liability_payment_allocations (
  id TEXT PRIMARY KEY NOT NULL,
  payment_id TEXT NOT NULL REFERENCES liability_payments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  installment_id TEXT NOT NULL REFERENCES liability_installments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  principal_minor INTEGER NOT NULL CHECK (principal_minor >= 0 AND principal_minor <= 9007199254740991),
  interest_minor INTEGER NOT NULL CHECK (interest_minor >= 0 AND interest_minor <= 9007199254740991),
  principal_before_minor INTEGER NOT NULL CHECK (principal_before_minor >= 0 AND principal_before_minor <= 9007199254740991),
  interest_before_minor INTEGER NOT NULL CHECK (interest_before_minor >= 0 AND interest_before_minor <= 9007199254740991),
  status_before TEXT NOT NULL CHECK (status_before IN ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'CANCELLED')),
  UNIQUE(payment_id, installment_id)
);
--> statement-breakpoint
CREATE TABLE liability_payment_schedule_changes (
  id TEXT PRIMARY KEY NOT NULL,
  payment_id TEXT NOT NULL REFERENCES liability_payments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  installment_id TEXT NOT NULL REFERENCES liability_installments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('CANCELLED', 'CREATED')),
  previous_status TEXT CHECK (previous_status IS NULL OR previous_status IN ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'CANCELLED')),
  UNIQUE(payment_id, installment_id)
);
--> statement-breakpoint
CREATE TABLE liability_payment_reversals (
  id TEXT PRIMARY KEY NOT NULL,
  payment_id TEXT NOT NULL UNIQUE REFERENCES liability_payments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  journal_entry_id TEXT NOT NULL UNIQUE REFERENCES journal_entries(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  reason TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX liability_payments_replacement_unique
  ON liability_payments(replaces_payment_id) WHERE replaces_payment_id IS NOT NULL;
--> statement-breakpoint
DROP TRIGGER liability_installments_update_guard;
--> statement-breakpoint
CREATE TRIGGER liability_installments_update_guard
BEFORE UPDATE ON liability_installments
WHEN NEW.id <> OLD.id OR NEW.liability_id <> OLD.liability_id
  OR NEW.sequence <> OLD.sequence OR NEW.period_start <> OLD.period_start OR NEW.due_date <> OLD.due_date
  OR NEW.opening_principal_minor <> OLD.opening_principal_minor
  OR NEW.principal_due_minor <> OLD.principal_due_minor OR NEW.interest_due_minor <> OLD.interest_due_minor
  OR NEW.total_due_minor <> OLD.total_due_minor OR NEW.closing_principal_minor <> OLD.closing_principal_minor
  OR NEW.annual_rate_ppm <> OLD.annual_rate_ppm
  OR ((NEW.principal_paid_minor < OLD.principal_paid_minor OR NEW.interest_paid_minor < OLD.interest_paid_minor)
      AND NOT EXISTS (
        SELECT 1 FROM liability_payment_allocations a
        INNER JOIN liability_payment_reversals r ON r.payment_id = a.payment_id
        WHERE a.installment_id = OLD.id
          AND NEW.principal_paid_minor = a.principal_before_minor
          AND NEW.interest_paid_minor = a.interest_before_minor
      ))
  OR NEW.principal_paid_minor > NEW.principal_due_minor OR NEW.interest_paid_minor > NEW.interest_due_minor
BEGIN SELECT RAISE(ABORT, 'installment snapshots are immutable outside payment or linked reversal'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payment_allocations_no_update
BEFORE UPDATE ON liability_payment_allocations
BEGIN SELECT RAISE(ABORT, 'payment allocation history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payment_allocations_no_delete
BEFORE DELETE ON liability_payment_allocations
BEGIN SELECT RAISE(ABORT, 'payment allocation history cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payment_schedule_changes_no_update
BEFORE UPDATE ON liability_payment_schedule_changes
BEGIN SELECT RAISE(ABORT, 'payment schedule change history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payment_schedule_changes_no_delete
BEFORE DELETE ON liability_payment_schedule_changes
BEGIN SELECT RAISE(ABORT, 'payment schedule change history cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payment_reversals_no_update
BEFORE UPDATE ON liability_payment_reversals
BEGIN SELECT RAISE(ABORT, 'payment reversal history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER liability_payment_reversals_no_delete
BEFORE DELETE ON liability_payment_reversals
BEGIN SELECT RAISE(ABORT, 'payment reversal history cannot be deleted'); END;
`;
