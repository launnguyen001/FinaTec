# TASK-05 — Interest Engine

- Phase: 3 — MVP 2
- Priority: P1
- Status: BLOCKED
- Dependencies: TASK-02, TASK-04

## Objective
Calculate and record interest/accrual for eligible interest-bearing assets and liabilities using explicit rate, period, day-count and compounding rules.

## Scope
- Interest plan configuration for assets and liabilities.
- APR/APY interpretation and supported day-count conventions.
- Simple and compound interest calculations.
- Accrual schedule and posted/accrued/paid lifecycle.
- Payout to principal or designated account.
- Stake reward quantity accrual where explicitly supported.
- Idempotent catch-up processing.

Out of scope: provider-specific yield promises, automatic on-chain actions and unsupported financial products.

## Context
Read specification interest/staking section and roadmap Phase 3 and Phase 5. Confirm the final formulas and rounding policy before coding.

## Business rules
- Rate basis (APR/APY), period and day-count convention must be explicit.
- Accrual must be deterministic for the same inputs.
- Rounding occurs only at the approved recognition boundary.
- Re-running a period must not create duplicate accrual or journal postings.
- Asset interest and liability interest must map to the correct ledger accounts.
- Missed background execution is recovered safely when the app next runs.

## Proposed changes
InterestPlan and InterestAccrual domain types; pure calculators; accrual and payout use cases; persistence adapter; schedule/catch-up processor; interest detail UI.

## Data changes
Implement approved interest plan/accrual records and unique period/idempotency constraints.

## Implementation plan
1. Resolve supported rate basis, frequency, day count and rounding.
2. Write formula examples and expected results.
3. Implement pure simple/compound calculators.
4. Implement period generation and accrual lifecycle.
5. Map recognized interest to journal entries.
6. Add idempotent catch-up processing.
7. Build plan and history screens.

## Test plan
APR/APY conversions; leap-year and month boundaries; simple/compound schedules; zero rate; maturity payout; rounding; repeated catch-up; partial failure/retry; ledger reconciliation.

## Acceptance criteria
- [ ] Supported formulas and conventions are documented.
- [ ] Calculator outputs match approved reference examples.
- [ ] Accrual is traceable to journal postings.
- [ ] Reprocessing cannot duplicate a period.
- [ ] Asset and liability interest are accounted for correctly.
- [ ] Tests cover date boundaries and rounding.

## Progress log
- Done: Task defined from roadmap.
- Doing: Blocked pending approved asset model and interest decisions.
- Next: Approve calculation conventions and implement pure calculators.
- Issues: Day-count and payout rules are unresolved.
- Verification: Not run.