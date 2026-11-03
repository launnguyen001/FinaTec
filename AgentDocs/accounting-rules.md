# Két Số — Accounting Engine Rules (TASK-02)

**Status:** Implemented on `task/02-accounting-engine`  
**Schema:** TASK-01 schema version 1 (no migration required)  
**Layers:** pure Domain rules + Application use cases + SQLite repository adapter

## 1. Posting lifecycle

- A new command may create a `DRAFT` entry, then move it to `POSTED` through `AccountingService.postDraft`.
- A command that is complete may be written directly as `POSTED` in one repository transaction.
- Only `DRAFT` can transition to `POSTED`; an already posted entry returns the persisted result on retry.
- Posted entries and lines are immutable. Corrections use a new linked reversal and, if needed, a new adjustment entry.

## 2. Validation invariants

Before a posting is persisted:

1. The entry has a non-empty identity and base currency.
2. `status` and `posted_at` agree: `DRAFT` has no timestamp, `POSTED` has one.
3. There are at least two lines with unique positive line numbers and unique identities.
4. Every line belongs to the entry, uses a positive native amount, and has a valid DEBIT/CREDIT side.
5. The account exists, is not archived, and its fixed currency equals the line currency.
6. Both account currency and entry base currency are active.
7. The FX snapshot is a positive rational. A base-currency line uses exactly `1/1`.
8. `base_amount_minor` is recomputed from native amount, currency precision and the FX snapshot. A stored value that differs is rejected.
9. A line that rounds to zero in the base currency is rejected.
10. There is at least one DEBIT and one CREDIT, and their recomputed base totals are equal.

No rounding line is created. Rounding is half-up once per line, then the resulting base totals must balance.

## 3. Balances

- Normal sides: ASSET/EXPENSE = DEBIT; LIABILITY/EQUITY/INCOME = CREDIT.
- `calculateAccountBalance` returns a native-currency `Money`, positive on the normal side.
- Only lines belonging to `POSTED` entries are included.
- An archived account keeps its historical balance but cannot receive new postings.

## 4. Opening balance

- Targets an ASSET or LIABILITY account and an EQUITY offset account.
- The signed amount is expressed in the account's native currency and in its normal-side direction.
- Positive amount: normal-side line on the account, opposite line on equity.
- Negative amount: the approved contra posting (reverse both sides).
- Account and offset must share one currency. A non-base currency requires an explicit FX snapshot.
- No balance is written directly onto `accounts`; the balance is derived from the ledger.

## 5. Internal transfer

- Both accounts must be ASSET accounts and must differ.
- Same-currency: both lines use the same amount and the same FX snapshot.
- Cross-currency: the caller supplies the destination amount and both FX snapshots; the posting is rejected unless both recomputed base amounts are equal.
- No INCOME or EXPENSE line is created, so transfers do not affect income/expense totals. A balanced transfer leaves total assets unchanged.

## 6. Reversal and audit trace

- Only a `POSTED` entry can be reversed.
- A reversal is a new posted entry linked through `reversal_of_id`.
- Each line keeps its account, native amount, currency and FX snapshot; only the side is swapped.
- The original entry and lines remain untouched.
- The unique partial index on `reversal_of_id` guarantees at most one reversal per original entry.
- An adjustment is a new posting; it never mutates posted history.

## 7. Idempotency and transactions

- Every mutating command requires a stable, non-empty idempotency key.
- Retrying the same key returns the previously persisted entry, lines and `created: false`.
- The SQLite adapter checks idempotency and reversal links inside the same synchronous transaction that inserts the entry and all lines.
- A failure during entry/line insertion rolls back the whole command.
- `postDraftEntry` reads, validates and updates the status inside one transaction; posted-history triggers remain the final immutability guard.
- The repository re-runs the pure validator inside the write transaction, so direct repository use cannot bypass balance checks.

## 8. Known boundaries

- SQLite `INTEGER` persistence remains bounded by `Number.MAX_SAFE_INTEGER`; the adapter rejects unsafe values.
- Cross-currency transfers require an explicit destination amount because a rate alone would introduce a rounding policy between the two sides.
- Opening balance requires the offset equity account to share the account currency; reporting-level FX translation is outside this task.
- Current market FX gain/loss recognition is outside this task.

## 9. Verification

- Jest covers posting validation, FX recomputation, rounding, balances, opening balance, same/cross-currency transfer, draft lifecycle, reversal, one-reversal rule, idempotency and failed-commit rollback.
- TypeScript, Expo lint and Prettier must pass before merge.
- Android acceptance must be run on a development build because the database uses SQLCipher.
