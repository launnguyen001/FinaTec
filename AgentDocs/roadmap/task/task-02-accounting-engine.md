# TASK-02 — Accounting Engine

- **Phase:** 1 — Database Architecture & Accounting Engine
- **Priority:** P0 / critical path
- **Status:** BLOCKED
- **Dependencies:** TASK-00, TASK-01

## Objective
Build a UI-independent accounting domain that validates, posts and reverses balanced journal entries atomically and deterministically.

## Scope
Money/Currency/Amount value objects; debit-credit semantics; journal validation and posting lifecycle; opening balance and internal-transfer primitives; reversal/adjustment linkage; audit metadata; retry protection; account balance queries. Excludes transaction screens, asset cost basis, interest and loan calculations.

## Context
Read specification accounting sections 6.1–6.2 and roadmap Phase 1. Use the approved schema and decision records. Do not infer missing multi-currency rules.

## Business rules
- A posted entry must contain valid debit and credit lines and balance under the approved currency policy.
- Posting and related records persist atomically or not at all.
- Posted entries are immutable; corrections use linked reversal/adjustment entries.
- Internal transfers are not income or expense.
- Opening balances have an explicit equity counterpart.
- Arithmetic and rounding follow approved precision rules.
- Retried commands must not duplicate postings.

## Proposed changes
Domain accounting types and validation; Application posting/reversal/opening-balance/transfer use cases; Infrastructure transactional repository; unit and integration tests.

## Data changes
Use TASK-01 schema. Any schema extension requires a concrete invariant and review before migration.

## Implementation plan
1. Define normal-balance semantics for account types.
2. Implement exact arithmetic and currency-aware validation.
3. Implement draft validation and posting transition.
4. Implement atomic persistence boundary.
5. Implement opening balance and internal transfer.
6. Implement reversal and correction traceability.
7. Add retry/idempotency protection.
8. Derive account balances from posted ledger lines.

## Test plan
Balanced/unbalanced entries; missing/invalid lines; invalid account/currency; atomic rollback at each write step; reversal offsets original; posted-entry mutation/deletion rejected; transfer leaves net wealth unchanged; opening balance equity counterpart; precision, rounding, overflow and retry cases.

## Acceptance criteria
- [ ] Domain has no React Native or SQLite dependency.
- [ ] Invalid or unbalanced entries cannot be posted.
- [ ] Posting and reversal are atomic.
- [ ] Posted history is immutable and traceable.
- [ ] Opening balance and transfer primitives pass tests.
- [ ] Account balances derive from ledger entries.
- [ ] Accounting invariant suite passes.

## Progress log
- **Done:** Task defined from Phase 1.
- **Doing:** Blocked pending TASK-00 and TASK-01.
- **Next:** Implement posting primitives after schema approval.
- **Issues:** Multi-currency balancing policy requires an explicit decision.
- **Verification:** Not run.