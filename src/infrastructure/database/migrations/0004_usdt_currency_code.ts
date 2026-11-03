export const migration0004 = String.raw`
PRAGMA defer_foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE currencies_replacement (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  minor_unit INTEGER NOT NULL CHECK (minor_unit BETWEEN 0 AND 6),
  is_active INTEGER NOT NULL CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK (length(code) BETWEEN 3 AND 4 AND code = upper(code))
);
--> statement-breakpoint
INSERT INTO currencies_replacement (code, name, minor_unit, is_active, created_at)
SELECT code, name, minor_unit, is_active, created_at FROM currencies;
--> statement-breakpoint
DROP TABLE currencies;
--> statement-breakpoint
ALTER TABLE currencies_replacement RENAME TO currencies;
--> statement-breakpoint
INSERT OR IGNORE INTO currencies (code, name, minor_unit, is_active, created_at)
VALUES ('USDT', 'Tether USD', 6, 1, '2026-11-04T00:00:00.000Z');
--> statement-breakpoint
PRAGMA defer_foreign_keys = OFF;
`;
