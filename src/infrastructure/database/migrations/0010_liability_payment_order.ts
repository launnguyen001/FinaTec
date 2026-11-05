export const migration0010 = String.raw`
ALTER TABLE liability_payments ADD COLUMN posting_order INTEGER NOT NULL DEFAULT 0 CHECK (posting_order >= 0);
--> statement-breakpoint
UPDATE liability_payments SET posting_order = rowid WHERE posting_order = 0;
--> statement-breakpoint
CREATE UNIQUE INDEX liability_payments_order_unique ON liability_payments(liability_id, posting_order);
`;
