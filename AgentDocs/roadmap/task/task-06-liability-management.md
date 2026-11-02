# TASK-06 — Liability Management

- Phase: 4 — MVP 3
- Priority: P1
- Status: BLOCKED
- Dependencies: TASK-02, TASK-03, TASK-05

## Objective
Manage user-declared liabilities, calculate repayment schedules, record payments and reconcile outstanding amounts with the ledger.

## Scope
Create and configure liability records; calculate schedules for declining balance, equal principal, annuity and interest-only methods; track due and overdue periods; support full, partial and early repayment; split principal and interest; select the funding account.

Out of scope: loan applications, lender integrations and automatic bank payments.

## Context
Read the specification's liability and repayment sections, ERD, sample postings and roadmap Phase 4. Align formulas with TASK-05 conventions.

## Business rules
- Outstanding amount must reconcile with posted principal movements.
- Principal repayment reduces liability; interest is an expense.
- A payment cannot be applied more than once.
- Partial and early repayment must update future periods according to an approved policy.
- Due dates, day-count and rounding must be explicit.
- Schedule status must be consistent with payments and dates.

## Proposed changes
Liability model; pure repayment calculator; schedule generator; create/repay use cases; ledger mapping; liability and schedule screens; reconciliation query.

## Data changes
Implement approved liability and repayment schedule records with payment-to-journal linkage and duplicate protection.

## Implementation plan
1. Define inputs and repayment conventions.
2. Implement and verify calculators for supported methods.
3. Generate and persist schedules.
4. Implement full, partial and early repayment.
5. Map principal and interest to ledger.
6. Recalculate future schedule under approved rules.
7. Add overdue view and reconciliation.

## Test plan
Reference examples for each method; rate and date boundaries; rounding; partial/early repayment; overdue transitions; retry behavior; ledger reconciliation.

## Acceptance criteria
- [ ] Formulas and reference tests exist for every supported method.
- [ ] Schedule totals reconcile with assumptions.
- [ ] Payments update cash and liability correctly.
- [ ] Partial/early repayment follows approved policy.
- [ ] Duplicate processing is prevented.
- [ ] Outstanding balance reconciles with journal history.

## Progress log
- Done: Task defined from Phase 4.
- Doing: Blocked pending ledger and interest conventions.
- Next: Approve repayment policies and implement calculator.
- Issues: Early repayment and rate-change behavior need explicit rules.
- Verification: Not run.