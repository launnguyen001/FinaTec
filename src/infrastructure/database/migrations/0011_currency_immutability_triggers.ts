export const migration0011 = String.raw`
DROP TRIGGER IF EXISTS currencies_code_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS currencies_no_precision_change_when_referenced;
--> statement-breakpoint
CREATE TRIGGER currencies_code_immutable
BEFORE UPDATE OF code ON currencies
WHEN OLD.code <> NEW.code
BEGIN
  SELECT RAISE(ABORT, 'currency codes are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER currencies_no_precision_change_when_referenced
BEFORE UPDATE OF minor_unit ON currencies
WHEN OLD.minor_unit <> NEW.minor_unit
  AND (
    EXISTS (SELECT 1 FROM ledger_settings WHERE base_currency_code = OLD.code)
    OR EXISTS (SELECT 1 FROM accounts WHERE currency_code = OLD.code)
    OR EXISTS (SELECT 1 FROM journal_entries WHERE base_currency_code = OLD.code)
    OR EXISTS (SELECT 1 FROM journal_lines WHERE currency_code = OLD.code)
  )
BEGIN
  SELECT RAISE(ABORT, 'currency precision is immutable after first use');
END;
`;
