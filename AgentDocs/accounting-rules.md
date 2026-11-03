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

## 10. TASK-03 transaction classification

Schema v2 adds `journal_entries.transaction_kind` and nullable `category_id`.

- INCOME and EXPENSE are business classifications on the Journal Entry; they still post through the same balanced Ledger Engine.
- INCOME means money enters the assets managed by the owner; EXPENSE means money leaves that managed-asset boundary, regardless of whether the user considers it personal spending, business cost, owner withdrawal or another purpose. The user supplies Category and description/note; no separate WITHDRAWAL or OWNER_DRAWING transaction kind is introduced.
- TRANSFER is reserved for movement between ASSET Accounts inside the same managed-asset boundary. Category classifies the event but does not determine whether money crossed that boundary.
- Income uses a DEBIT line on an ASSET account and a CREDIT line on an INCOME account.
- Expense uses a CREDIT line on an ASSET account and a DEBIT line on an EXPENSE account.
- TRANSFER and OPENING_BALANCE must have no Category and do not contribute to income/expense totals.
- Category kind must match INCOME/EXPENSE transaction kind. A Journal Entry has at most one Category.
- REVERSAL retains the original Category reference and swaps every original line side. Reporting must include the reversal's negative effect.
- Existing v1 entries are LEGACY and remain uncategorized unless a future audited backfill can infer their meaning without guessing.

## 11. Archived Account policy — strict lifecycle invariant

TASK-03 does not extend or bypass the TASK-02 posting policy. The existing invariant remains: every posting rejects an archived Account.

- An Account may be archived only when its current Ledger balance is exactly zero in its native currency, using the normal-side signed balance derived from POSTED lines.
- Balance is derived only from lines belonging to POSTED Journal Entries. Do not trust a UI-provided balance or a separately persisted balance.
- A non-zero balance, whether positive or negative, rejects archive. The user must bring the balance to zero through ordinary valid postings while the Account is ACTIVE.
- The SQLite `accounts_archive_requires_zero_balance` trigger checks the signed Ledger balance in the same atomic UPDATE that changes the archive state. The `journal_lines_no_archived_account_insert` and `journal_entries_no_archived_account_posting` triggers prevent new lines and posting of pre-existing drafts against archived Accounts. This closes both orderings of an archive/post race.
- `restoreAccount()` transitions ARCHIVED → ACTIVE without creating a Journal Entry or changing historical balances.
- Every posting that references an archived Account is rejected, regardless of transaction kind or posting purpose. This includes income, expense, transfer, opening balance, adjustment and reversal.
- To reverse a historical entry that references an archived Account, restore every affected Account first, then call the ordinary AccountingService reversal use case.
- No `allowedArchivedAccountIds`, `allowArchived`, archived-account settlement/reversal exceptions, posting-purpose field or archive audit-reason field exists. Schema v2 is still unreleased on the feature branch, so its migration is defined without these obsolete fields.
- Preserve balancing, atomicity, idempotency and posted-history immutability.

Required tests: archive succeeds at exactly zero; archive rejects positive and negative balances; restore succeeds and preserves history; every posting kind rejects archived Accounts; reversal rejects until all referenced archived Accounts are restored; concurrent archive/post attempts cannot violate the invariant.
