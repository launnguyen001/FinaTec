export const migration0001 = String.raw`
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
  parent_id TEXT REFERENCES categories(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  is_archived INTEGER NOT NULL CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (parent_id IS NULL OR parent_id <> id)
);
--> statement-breakpoint
CREATE INDEX categories_parent_idx ON categories(parent_id);
--> statement-breakpoint
CREATE INDEX categories_kind_archived_idx ON categories(kind, is_archived);
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN subtype TEXT CHECK (
  (type = 'ASSET' AND (subtype IS NULL OR subtype IN ('CASH', 'BANK', 'EWALLET', 'SAVINGS', 'OTHER'))) OR
  (type <> 'ASSET' AND subtype IS NULL)
);
--> statement-breakpoint
UPDATE accounts SET subtype = 'OTHER' WHERE type = 'ASSET' AND subtype IS NULL;
--> statement-breakpoint
ALTER TABLE journal_entries ADD COLUMN transaction_kind TEXT NOT NULL DEFAULT 'LEGACY'
  CHECK (transaction_kind IN ('INCOME', 'EXPENSE', 'TRANSFER', 'OPENING_BALANCE', 'ADJUSTMENT', 'REVERSAL', 'LEGACY'));
--> statement-breakpoint
ALTER TABLE journal_entries ADD COLUMN category_id TEXT REFERENCES categories(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE journal_entries ADD COLUMN posting_purpose TEXT NOT NULL DEFAULT 'STANDARD'
  CHECK (posting_purpose IN ('STANDARD', 'ARCHIVED_ACCOUNT_SETTLEMENT', 'ARCHIVED_ACCOUNT_ADJUSTMENT', 'ARCHIVED_ACCOUNT_REVERSAL'));
--> statement-breakpoint
ALTER TABLE journal_entries ADD COLUMN audit_reason TEXT;
--> statement-breakpoint
CREATE INDEX journal_entries_category_idx ON journal_entries(category_id);
--> statement-breakpoint
CREATE INDEX journal_entries_kind_occurred_idx ON journal_entries(transaction_kind, occurred_at);
--> statement-breakpoint
CREATE TRIGGER accounts_no_hard_delete
BEFORE DELETE ON accounts
BEGIN
  SELECT RAISE(ABORT, 'accounts cannot be hard-deleted; archive the account instead');
END;
--> statement-breakpoint
CREATE TRIGGER categories_parent_kind_insert
BEFORE INSERT ON categories
WHEN NEW.parent_id IS NOT NULL
  AND (SELECT kind FROM categories WHERE id = NEW.parent_id) <> NEW.kind
BEGIN
  SELECT RAISE(ABORT, 'category parent and child must have the same kind');
END;
--> statement-breakpoint
CREATE TRIGGER categories_parent_kind_update
BEFORE UPDATE OF parent_id, kind ON categories
WHEN NEW.parent_id IS NOT NULL
  AND (SELECT kind FROM categories WHERE id = NEW.parent_id) <> NEW.kind
BEGIN
  SELECT RAISE(ABORT, 'category parent and child must have the same kind');
END;
--> statement-breakpoint
CREATE TRIGGER categories_parent_not_archived_insert
BEFORE INSERT ON categories
WHEN NEW.parent_id IS NOT NULL AND (SELECT is_archived FROM categories WHERE id = NEW.parent_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'archived category cannot be a parent');
END;
--> statement-breakpoint
CREATE TRIGGER categories_parent_not_archived_update
BEFORE UPDATE OF parent_id ON categories
WHEN NEW.parent_id IS NOT NULL AND (SELECT is_archived FROM categories WHERE id = NEW.parent_id) = 1
BEGIN
  SELECT RAISE(ABORT, 'archived category cannot be a parent');
END;
--> statement-breakpoint
CREATE TRIGGER categories_children_kind_update
BEFORE UPDATE OF kind ON categories
WHEN EXISTS (SELECT 1 FROM categories WHERE parent_id = OLD.id AND kind <> NEW.kind)
BEGIN
  SELECT RAISE(ABORT, 'category kind must match every child category');
END;
--> statement-breakpoint
CREATE TRIGGER categories_no_archive_with_active_children
BEFORE UPDATE OF is_archived ON categories
WHEN NEW.is_archived = 1 AND OLD.is_archived = 0 AND EXISTS (SELECT 1 FROM categories WHERE parent_id = OLD.id AND is_archived = 0)
BEGIN
  SELECT RAISE(ABORT, 'category with active children cannot be archived');
END;
--> statement-breakpoint
CREATE TRIGGER categories_no_cycle
BEFORE UPDATE OF parent_id ON categories
WHEN NEW.parent_id IS NOT NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    WITH RECURSIVE ancestors(id) AS (
      SELECT NEW.parent_id
      UNION ALL
      SELECT c.parent_id FROM categories c JOIN ancestors a ON c.id = a.id WHERE c.parent_id IS NOT NULL
    )
    SELECT 1 FROM ancestors WHERE id = NEW.id
  ) THEN RAISE(ABORT, 'category hierarchy cannot contain a cycle') END;
END;
--> statement-breakpoint
CREATE TRIGGER categories_kind_immutable_when_used
BEFORE UPDATE OF kind ON categories
WHEN OLD.kind <> NEW.kind AND EXISTS (SELECT 1 FROM journal_entries WHERE category_id = OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'category kind cannot change after use');
END;
--> statement-breakpoint
CREATE TRIGGER journal_entries_category_kind_insert
BEFORE INSERT ON journal_entries
WHEN NEW.category_id IS NOT NULL AND (
  (NEW.transaction_kind = 'INCOME' AND (SELECT kind FROM categories WHERE id = NEW.category_id) <> 'INCOME') OR
  (NEW.transaction_kind = 'EXPENSE' AND (SELECT kind FROM categories WHERE id = NEW.category_id) <> 'EXPENSE') OR
  NEW.transaction_kind IN ('TRANSFER', 'OPENING_BALANCE')
)
BEGIN
  SELECT RAISE(ABORT, 'journal entry category does not match transaction kind');
END;
--> statement-breakpoint
CREATE TRIGGER journal_entries_category_kind_update
BEFORE UPDATE OF category_id, transaction_kind ON journal_entries
WHEN NEW.category_id IS NOT NULL AND (
  (NEW.transaction_kind = 'INCOME' AND (SELECT kind FROM categories WHERE id = NEW.category_id) <> 'INCOME') OR
  (NEW.transaction_kind = 'EXPENSE' AND (SELECT kind FROM categories WHERE id = NEW.category_id) <> 'EXPENSE') OR
  NEW.transaction_kind IN ('TRANSFER', 'OPENING_BALANCE')
)
BEGIN
  SELECT RAISE(ABORT, 'journal entry category does not match transaction kind');
END;
`
