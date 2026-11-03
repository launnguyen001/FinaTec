export const migration0008 = String.raw`
ALTER TABLE liabilities ADD COLUMN fx_rate_numerator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_numerator GLOB '[1-9]*' AND fx_rate_numerator NOT GLOB '*[^0-9]*');
--> statement-breakpoint
ALTER TABLE liabilities ADD COLUMN fx_rate_denominator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_denominator GLOB '[1-9]*' AND fx_rate_denominator NOT GLOB '*[^0-9]*');
--> statement-breakpoint
ALTER TABLE liability_payments ADD COLUMN fx_rate_numerator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_numerator GLOB '[1-9]*' AND fx_rate_numerator NOT GLOB '*[^0-9]*');
--> statement-breakpoint
ALTER TABLE liability_payments ADD COLUMN fx_rate_denominator TEXT NOT NULL DEFAULT '1' CHECK (fx_rate_denominator GLOB '[1-9]*' AND fx_rate_denominator NOT GLOB '*[^0-9]*');
`;
