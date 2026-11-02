# TASK-06 — Balances, Cash Flow and Net Worth Reports

**Priority:** P1  
**Status:** BLOCKED  
**Dependencies:** TASK-04, TASK-05

## Objective

Produce trustworthy financial summaries from canonical ledger and valuation data.

## Scope

- Financial account balances at a selected date.
- Income and expense summaries over a date range.
- Transfer-excluded cash-flow reporting.
- Asset and liability totals at a valuation date.
- Net-worth calculation and historical trend where data supports it.
- Drill-down from summary values to source transactions/valuations.

## Rules

- Every report defines its date basis and period boundaries.
- Reports derive from posted journal entries and dated valuation records.
- Draft and reversed entries are handled according to the accounting policy.
- Transfers are excluded from income and expense totals.
- Historical reports must not silently use current asset values for past dates.
- Any caching is derived and safely invalidatable; it is never the source of truth.

## Acceptance criteria

- [ ] Account balances reconcile with the accounting engine.
- [ ] Income/expense totals reconcile with categorized ledger postings.
- [ ] Transfers do not inflate income or expenses.
- [ ] Net worth equals assets minus liabilities at the selected date.
- [ ] Historical reports use historical effective-date data.
- [ ] Every summary can be traced to underlying records.
- [ ] Tests cover period boundaries, empty periods, reversals and historical valuation.
