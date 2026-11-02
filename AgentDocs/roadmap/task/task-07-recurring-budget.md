# TASK-07 — Recurring Transactions & Budget

- Phase: 4 — MVP 3
- Priority: P1
- Status: BLOCKED
- Dependencies: TASK-02, TASK-03

## Objective
Support scheduled recurring financial records and category budgets with safe catch-up behavior and reminders.

## Scope
- Recurring rule configuration: frequency, next due date, amount, category and source account.
- Reminder-only and user-confirmed/automatic posting modes, subject to approved policy.
- Catch-up processing when app opens after missed dates.
- Monthly category budgets and consumption summaries.
- Notifications for upcoming recurring items and budget thresholds.

Out of scope: cloud scheduler, server-side automation and automatic payments.

## Context
Read specification sections on recurring rules, budgets and notifications; roadmap Phase 4. Reuse TASK-03 transaction use cases.

## Business rules
- Recurring generation must be idempotent across app restarts and repeated catch-up.
- Auto-post behavior must be explicit per rule; default should not silently move money.
- Generated transactions use the same accounting validation as manual transactions.
- Budget consumption is derived from eligible posted expenses, not separately maintained totals.
- Transfers are excluded from expense budget consumption.
- Notification delivery is best-effort; core records cannot depend on background execution.

## Proposed changes
RecurringRule model and processor; idempotency key/unique period constraint; budget use cases and queries; notification adapter; recurring and budget screens.

## Data changes
Approved recurring rule, generated-occurrence tracking and budget records. Add uniqueness that prevents duplicate occurrence creation.

## Implementation plan
1. Define recurrence frequencies, month-end behavior and catch-up policy.
2. Define confirmation versus auto-post behavior.
3. Implement due-occurrence calculation and idempotency.
4. Route generated entries through normal transaction use cases.
5. Implement budget limits and derived consumption.
6. Schedule notifications and handle denied permissions.
7. Build management and summary screens.

## Test plan
Month-end/leap-year schedules; app offline for multiple periods; repeated catch-up; retry after partial failure; auto-post versus reminder-only; budget period boundaries; transfer exclusion; notification permission denied.

## Acceptance criteria
- [ ] Recurring rules generate or remind according to configuration.
- [ ] Reprocessing never duplicates an occurrence.
- [ ] Generated postings pass normal accounting validation.
- [ ] Budget usage derives from eligible posted expenses.
- [ ] Transfers do not consume expense budgets.
- [ ] Missing background execution is recovered on next app launch.
- [ ] Tests cover date boundaries and retries.

## Progress log
- Done: Task defined from Phase 4.
- Doing: Blocked pending TASK-03 and recurrence policy decisions.
- Next: Approve schedule semantics and implement idempotent processor.
- Issues: Month-end and catch-up policy require confirmation.
- Verification: Not run.