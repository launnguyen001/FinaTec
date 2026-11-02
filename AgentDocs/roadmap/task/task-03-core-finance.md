# TASK-03 — Core Finance

- **Phase:** 2 — MVP 1: Core Finance
- **Priority:** P0
- **Status:** BLOCKED
- **Dependencies:** TASK-02

## Objective
Deliver daily money workflows: accounts, opening balances, income, expenses, internal transfers, categories, transaction history and a basic cash-flow dashboard.

## Scope
Account create/edit/deactivate; income and expense categories; income/expense/transfer use cases; transaction history and filters; quick entry targeting at most three actions for a normal expense; dashboard for funds, income, expense and net cash flow. App lock/PIN is included only if its security design is approved and assigned here.

Out of scope: asset acquisition/disposal, loans, budgets, advanced reports, bank integrations and direct UI database writes.

## Context
Read specification screen descriptions, sample journal postings and roadmap Phase 2. Inspect existing routes, components and design tokens before adding screens.

## Business rules
- Users do not enter Debit/Credit manually.
- Transfers are excluded from income and expense.
- Balances derive from posted ledger entries.
- Posted transactions are corrected through reversal/replacement, not destructive edits.
- Preserve occurred-at and recorded-at timestamps.
- Inactive accounts remain visible historically and cannot receive new postings unless approved policy permits.

## Proposed changes
Account/category use cases and repositories; income/expense/transfer commands; account, quick-entry, transaction-list/detail and dashboard screens; view models and user-facing error mapping.

## Data changes
Use approved account, category and journal schema. Review and migrate any required extension.

## Implementation plan
1. Define account/category lifecycle.
2. Implement repositories and use cases.
3. Map transaction commands to journal entries.
4. Build account management screens.
5. Build quick-entry form and validation.
6. Build transaction history, filters and details.
7. Build dashboard queries from application/domain sources.
8. Verify offline UX and platform behavior.

## Test plan
Income/expense/transfer use cases; balance reconciliation; transfer exclusion; reversal flow; date/time-zone filters; UI validation and empty/loading/error states; offline regression.

## Acceptance criteria
- [ ] Account/category management works offline.
- [ ] Income, expense and transfer can be created and reviewed.
- [ ] All financial mutations pass through Application/Accounting Engine.
- [ ] Balances reconcile with ledger and transfers are not double-counted.
- [ ] Normal expense entry targets three actions or fewer.
- [ ] History filters work correctly.
- [ ] Core screens handle empty, loading and failure states.
- [ ] Tests preserve previously posted financial history.

## Progress log
- **Done:** Task defined from Phase 2.
- **Doing:** Blocked pending TASK-02.
- **Next:** Implement account/category and transaction workflows.
- **Issues:** Account lifecycle and category-edit policy must be confirmed.
- **Verification:** Not run.