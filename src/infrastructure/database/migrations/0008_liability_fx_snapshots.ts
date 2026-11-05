export const migration0008 = String.raw`
ALTER TABLE liabilities ADD COLUMN fx_rate_numerator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_numerator GLOB '[1-9]*' AND fx_rate_numerator NOT GLOB '*[^0-9]*');
--> statement-breakpoint
ALTER TABLE liabilities ADD COLUMN fx_rate_denominator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_denominator GLOB '[1-9]*' AND fx_rate_denominator NOT GLOB '*[^0-9]*');
--> statement-breakpoint
ALTER TABLE liability_payments ADD COLUMN fx_rate_numerator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_numerator GLOB '[1-9]*' AND fx_rate_numerator NOT GLOB '*[^0-9]*');
--> statement-breakpoint
ALTER TABLE liability_payments ADD COLUMN fx_rate_denominator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_denominator GLOB '[1-9]*' AND fx_rate_denominator NOT GLOB '*[^0-9]*');
--> statement-breakpoint
DROP TRIGGER liabilities_terms_immutable;
--> statement-breakpoint
CREATE TRIGGER liabilities_terms_immutable
BEFORE UPDATE ON liabilities
WHEN NEW.id <> OLD.id OR NEW.liability_account_id <> OLD.liability_account_id
  OR NEW.interest_expense_account_id <> OLD.interest_expense_account_id
  OR NEW.currency_code <> OLD.currency_code
  OR NEW.fx_rate_numerator <> OLD.fx_rate_numerator
  OR NEW.fx_rate_denominator <> OLD.fx_rate_denominator
  OR NEW.original_principal_minor <> OLD.original_principal_minor
  OR NEW.annual_rate_ppm <> OLD.annual_rate_ppm
  OR NEW.repayment_method <> OLD.repayment_method OR NEW.term_months <> OLD.term_months
  OR NEW.start_date <> OLD.start_date OR NEW.first_due_date <> OLD.first_due_date
  OR NEW.timezone_id <> OLD.timezone_id OR NEW.early_payment_policy <> OLD.early_payment_policy
  OR (OLD.status = 'ARCHIVED' AND NEW.status <> 'ARCHIVED')
BEGIN
  SELECT RAISE(ABORT, 'liability terms and origination FX snapshot are immutable');
END;

`;
