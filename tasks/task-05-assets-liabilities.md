# TASK-05 — Asset and Liability Tracking

**Priority:** P1  
**Status:** BLOCKED  
**Dependencies:** TASK-03

## Objective

Track the user's broader financial position beyond liquid account balances.

## Scope

- Create, update and archive asset records according to approved lifecycle rules.
- Create, update and archive liability records.
- Record dated asset/liability valuation changes with reason/source.
- Link cash-affecting acquisition, disposal, repayment or settlement events to ledger postings where applicable.
- Distinguish market/manual valuation changes from realized cash flows.
- Preserve valuation history.

## Rules

- Assets and liabilities remain distinct domain concepts.
- Net worth is calculated as assets minus liabilities at a specified effective date.
- Valuation changes must not be misclassified as cash income or expense.
- Valuation policy and accounting impact must follow the approved decision record.
- Never overwrite historical valuations without an auditable correction.

## Acceptance criteria

- [ ] Asset and liability records persist with correct ownership and lifecycle.
- [ ] Valuation history is date-addressable and auditable.
- [ ] Acquisition/disposal/repayment flows reconcile with financial accounts where in scope.
- [ ] Valuation-only changes do not create cash movements.
- [ ] Tests cover historical valuation, corrections and edge cases.
