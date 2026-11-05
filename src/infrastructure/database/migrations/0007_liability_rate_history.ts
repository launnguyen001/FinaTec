export const migration0007 = String.raw`
CREATE TABLE liability_rate_changes (
  id TEXT PRIMARY KEY NOT NULL,
  liability_id TEXT NOT NULL REFERENCES liabilities(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  annual_rate_ppm INTEGER NOT NULL CHECK (annual_rate_ppm BETWEEN 0 AND 10000000),
  effective_date TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX liability_rate_changes_effective_idx
  ON liability_rate_changes(liability_id, effective_date);
--> statement-breakpoint
CREATE TRIGGER liability_rate_changes_no_update
BEFORE UPDATE ON liability_rate_changes
BEGIN SELECT RAISE(ABORT, 'APR history is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER liability_rate_changes_no_delete
BEFORE DELETE ON liability_rate_changes
BEGIN SELECT RAISE(ABORT, 'APR history cannot be deleted'); END;
`;
