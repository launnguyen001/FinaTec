# TASK-03 — Double-Entry Accounting Engine

**Priority:** P0 — Critical path  
**Status:** BLOCKED  
**Dependencies:** TASK-02

## Objective

Implement the accounting core that validates and posts financial events as balanced journal entries.

## Scope

- Money/value object with exact arithmetic and explicit currency.
- Debit/credit line model.
- Journal entry validation.
- Posting service/use case.
- Atomic persistence of entry and all lines.
- Account balance derivation from posted entries.
- Reversal/correction mechanism for posted entries.
- Domain errors for unbalanced, empty, invalid-currency and invalid-account postings.

## Invariants

1. A posted entry has at least two lines.
2. For each currency, total debit equals total credit.
3. Amounts are positive magnitudes; debit/credit direction is represented explicitly.
4. Draft entries are not included in balances.
5. A failed post leaves no partial journal entry or lines.
6. Posted entries are immutable.
7. Reversal entries link to the original and preserve audit history.
8. Balance calculation uses posted lines only and applies the account's normal balance rule.

## Required tests

- [ ] Balanced entry posts successfully.
- [ ] Unbalanced entry is rejected.
- [ ] One-line/empty entry is rejected.
- [ ] Zero/negative amount is rejected.
- [ ] Currency mismatch follows the approved currency policy.
- [ ] Draft entry does not affect balance.
- [ ] Posted entry affects balance exactly once.
- [ ] Duplicate submission is safely rejected or idempotently handled.
- [ ] Simulated persistence failure rolls back the entire posting.
- [ ] Posted entry cannot be silently edited/deleted.
- [ ] Reversal restores the expected account balances and remains auditable.
- [ ] Property-based or generated tests verify debit-credit equality over many inputs, if supported.

## Non-goals

- UI screens.
- Bank sync.
- Investment pricing.
- Automatic exchange-rate lookup.

## Acceptance criteria

All invariants and required tests pass. The accounting engine can be exercised independently of presentation code.
