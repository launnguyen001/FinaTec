# TASK-00 — Product and Technical Decisions

**Priority:** P0  
**Status:** DOING  
**Dependencies:** None  
**Purpose:** Resolve decisions that would otherwise cause rework in the database and accounting core.

## Scope

Produce an approved decision record. Do not implement application features in this task.

## Decisions required

### Product
- [ ] Confirm target: Android only, desktop, web, or cross-platform.
- [ ] Confirm the primary user and whether multiple personal profiles/households are in scope.
- [ ] Confirm initial financial account types: cash, bank, e-wallet, credit card/loan.
- [ ] Confirm whether multi-currency is MVP or explicitly deferred.
- [ ] Confirm whether budgets, recurring transactions and investment portfolios are outside MVP.

### Accounting policy
- [ ] Choose initial accounting basis and chart-of-accounts structure.
- [ ] Decide whether categories are reporting metadata or map to ledger accounts.
- [ ] Define opening-balance creation and correction.
- [ ] Define split transaction support.
- [ ] Define overdraft/negative-balance rules by account type.
- [ ] Define asset valuation methods and treatment of unrealized gains/losses.
- [ ] Define correction/reversal UX for posted entries.

### Technical and privacy
- [ ] Choose language, UI framework and application architecture.
- [ ] Choose local database and migration mechanism.
- [ ] Decide encryption-at-rest requirement for MVP and key lifecycle.
- [ ] Define backup, export and restore behavior.
- [ ] Define minimum supported OS/runtime versions and test strategy.

## Deliverables

1. `docs/DECISIONS.md` containing each decision, rationale, alternatives considered and date.
2. Updated `plan.md` and `docs/ARCHITECTURE.md` reflecting approved choices.
3. A confirmed MVP boundary.
4. No unresolved P0 decision that blocks schema design.

## Acceptance criteria

- [ ] Every decision above is marked **Accepted**, **Deferred** or **Not applicable**.
- [ ] Deferred items have an explicit reason and a boundary preventing accidental partial implementation.
- [ ] Technology choices are internally compatible.
- [ ] The next task can be implemented without guessing the platform, persistence technology or accounting policy.

## Verification

Review the decision record with the project owner. This is a planning task; automated tests are not applicable.
