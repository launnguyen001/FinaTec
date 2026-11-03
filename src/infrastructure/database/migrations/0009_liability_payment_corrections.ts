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
