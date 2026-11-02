# TASK-01 — Database Architecture

- **Phase:** 1 — Database Architecture & Accounting Engine
- **Priority:** P0
- **Status:** BLOCKED
- **Dependencies:** TASK-00

## Objective
Turn the conceptual ERD in the product specification into an approved relational schema and implement the initial local database, migrations and repository boundaries.

## Scope
- Audit the existing schema/database code after TASK-00.
- Define primary/foreign keys, ownership, nullability, uniqueness, indexes, precision, lifecycle and deletion policies.
- Design the minimum ledger foundation: currency, account, journal entry and journal line.
- Implement Drizzle schema, SQLite migrations, database bootstrap and repository adapters.
- Document ERD and data dictionary in the existing AgentDocs documentation convention.

Out of scope: asset/loan/interest/recurring feature schemas beyond approved foundational needs; UI; cloud persistence.

## Context
Read the product specification ERD and accounting rules, roadmap sections 5–6 and 13, plus TASK-00 spike results. The ERD is conceptual, not an already approved schema.

## Business rules
- Financial data remains local and encrypted according to the approved design.
- Enforce referential integrity in SQLite, not only in UI code.
- Posted journal history cannot be hard-deleted.
- Money, quantity and FX precision must be explicit; do not store money using ordinary floating point.
- Prevent economic double-counting between ledger accounts and separately tracked assets.

## Data changes
Initial production schema only for the approved ledger foundation and required audit metadata. Do not create speculative tables just because they appear in the conceptual ERD.

## Implementation plan
1. Resolve schema-affecting decisions and publish ERD/data dictionary.
2. Define constraints, indexes, precision and lifecycle rules.
3. Review schema against opening balance, income, expense, transfer and reversal examples.
4. Implement Drizzle schema and versioned migration.
5. Implement database initialization and repository interfaces/adapters.
6. Add migration and integrity test fixtures.

## Test plan
- Fresh install migration and repeat initialization.
- Foreign-key, unique and nullability constraints.
- Persistence round-trip for each entity.
- Migration failure rollback and upgrade path.
- Numeric precision/serialization boundaries.
- Domain/Application must not depend on SQLite implementation types.

## Acceptance criteria
- [ ] ERD and data dictionary reviewed against approved accounting rules.
- [ ] Keys, constraints, indexes, precision and deletion policy documented.
- [ ] Fresh database migration succeeds.
- [ ] Initialization is repeatable and safe.
- [ ] Repository boundaries follow the project architecture.
- [ ] Integrity and migration tests pass.
- [ ] No unresolved P0 decision is silently embedded in schema.

## Progress log
- **Done:** Task created from Phase 1 roadmap.
- **Doing:** Blocked pending TASK-00.
- **Next:** Approve ERD/schema, then implement migration.
- **Issues:** Multi-currency balancing and precision require explicit decisions.
- **Verification:** Not run.