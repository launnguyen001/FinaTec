export const migration0003 = String.raw`
ALTER TABLE asset_lots
  ADD COLUMN remaining_cost_basis_minor INTEGER NOT NULL DEFAULT 0
  CHECK (remaining_cost_basis_minor >= 0 AND remaining_cost_basis_minor <= 9007199254740991);
--> statement-breakpoint
UPDATE asset_lots
SET remaining_cost_basis_minor = cost_basis_minor;
`;
