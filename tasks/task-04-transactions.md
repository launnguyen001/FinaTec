# TASK-04 — Financial Transaction Use Cases

**Priority:** P0  
**Status:** BLOCKED  
**Dependencies:** TASK-03

## Objective

Expose reliable user-level operations on top of the accounting engine.

## Scope

Implement application use cases for:
- Record income.
- Record expense.
- Transfer between financial accounts.
- Create and edit draft transactions.
- Post/confirm a transaction.
- Correct or reverse a posted transaction.
- Query transaction history with account, category and date filters.

Support split lines only if approved in TASK-00.

## Business rules

- Income and expense create balanced journal entries.
- A transfer is not income or expense.
- Transfer fees, if supported, are posted separately as expenses.
- Transaction effective date is distinct from record creation time.
- All writes go through the accounting engine; UI must not update balances directly.
- Duplicate submissions must not create duplicate postings.

## Acceptance criteria

- [ ] Income updates the intended account balance and income reporting classification.
- [ ] Expense updates the intended account balance and expense classification.
- [ ] Transfer decreases source and increases destination without changing income/expense totals.
- [ ] Invalid account, amount, date or currency is rejected.
- [ ] Posted transaction correction preserves original history.
- [ ] Filtering and sorting return correct results.
- [ ] Tests cover successful flows, validation failures, duplicate submission and rollback.
