# TASK-02 — Core Data Model and Persistence

**Priority:** P0  
**Status:** BLOCKED  
**Dependencies:** TASK-00, TASK-01

## Objective

Design and implement the smallest persistent model that can support balanced accounting and later asset/liability tracking.

## Candidate entities

Finalize names and fields against approved decisions:
- FinancialAccount
- AccountType / Account classification
- Currency
- JournalEntry
- JournalLine
- Category (if retained separately from ledger accounts)
- Asset
- Liability
- ValuationRecord (or equivalent dated value history)

Do not create all candidate tables blindly. Include only entities required by the approved MVP.

## Requirements

- Stable identifiers and explicit created/updated/effective timestamps.
- Explicit currency and exact monetary representation.
- Foreign keys and database constraints for referential integrity.
- Versioned migrations from the first schema.
- Indexes for account/date/journal queries.
- Clear lifecycle/status fields for draft and posted records.
- Posted financial records protected from silent update/delete at the application layer.
- Repository interfaces or equivalent persistence boundary consistent with the chosen stack.

## Acceptance criteria

- [ ] ERD/schema is documented and matches implementation.
- [ ] Every monetary field has an explicit currency/precision strategy.
- [ ] Journal entries and lines can be persisted with referential integrity.
- [ ] Migrations apply on a fresh database and upgrade from the previous version.
- [ ] Invalid foreign keys and invalid lifecycle transitions are rejected.
- [ ] Tests cover persistence, migration and constraints.
- [ ] No report-specific cached balance is introduced as an independent source of truth.

## Deliverables

- ERD or schema diagram.
- Migration files.
- Domain/persistence models and repositories.
- Tests and updated architecture documentation.
