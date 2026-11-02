# TASK-08 — Reports & Reconciliation

- Phase: 5 — V1.0
- Priority: P1
- Status: BLOCKED
- Dependencies: TASK-02 through TASK-07

## Objective
Deliver accurate financial reports and balance checking based on the same ledger and domain rules used by the rest of the app.

## Scope
Income and expense by category/period; cash flow; account balances; assets, liabilities and net worth; historical net-worth snapshots; compare recorded account balance with actual balance; traceable correction entry; CSV/PDF export if included in the approved V1 split.

## Context
Read specification dashboard/report requirements and roadmap Phase 5 and Definition of Done.

## Business rules
- Reports must reuse domain/ledger rules; do not create a separate calculation path in UI.
- Net worth equals total assets minus total liabilities for the selected date and reporting currency.
- Transfers are excluded from income and expense.
- Market valuation is distinct from realized profit/loss.
- Differences found during balance checking must be visible and any correction must be traceable.
- Snapshot generation must be safe to retry.

## Proposed changes
Report query services; balance-check use case; snapshot processor; report screens/charts; correction workflow; export adapter if in scope.

## Data changes
Approved snapshot and reconciliation records with links to related journal records.

## Implementation plan
1. Define report dimensions, date boundaries and currency conversion policy.
2. Implement income/expense and cash-flow queries.
3. Implement balance sheet and net-worth calculation.
4. Implement daily snapshots and duplicate protection.
5. Implement actual-versus-recorded balance comparison.
6. Route corrections through Accounting Engine.
7. Build report screens and charts.
8. Verify export consistency if included.

## Test plan
Known ledger fixtures; transfer exclusion; net-worth equation; currency conversion; historical snapshots; retry behavior; balance difference cases; correction traceability; report totals versus source queries.

## Acceptance criteria
- [ ] Report totals reconcile with ledger/domain data.
- [ ] Transfers are excluded from income/expense.
- [ ] Net worth is consistent for selected date/currency.
- [ ] Snapshots are reproducible and idempotent.
- [ ] Differences and corrections are traceable.
- [ ] Charts/exports match report query results.
- [ ] Date and conversion boundary tests pass.

## Progress log
- Done: Task defined from Phase 5.
- Doing: Blocked pending upstream finance modules.
- Next: Define reporting and snapshot policies.
- Issues: Multi-currency and historical FX policy require approval.
- Verification: Not run.