# FinaTec — Business Rules

**Status:** Baseline invariants. Product-specific policy choices are marked as pending.

## 1. Money

- Monetary values must use exact arithmetic; binary floating-point is prohibited.
- Every amount has a currency.
- Currency precision/scale must be explicit.
- Rounding policy must be centralized and tested.
- Currency conversion must never happen implicitly.

## 2. Double-entry accounting

- Every posted journal entry contains at least two valid lines.
- For each currency represented in an entry, total debits must equal total credits.
- Debit and credit are distinct directions, not positive/negative values chosen ad hoc by each screen.
- An unbalanced entry cannot be posted.
- A posted entry and its lines are committed atomically.
- Draft entries may be edited; posted entries are immutable.
- A posted entry is corrected by a linked reversal and/or replacement entry, never by silent mutation or deletion.
- Account balances are derived from posted journal lines and the account's normal balance rules.

## 3. Transfers

- A transfer between two accounts is one financial event represented by balanced postings.
- A transfer must not be counted as income or expense in cash-flow reporting.
- Transfer fees, if supported, are represented separately as an expense.
- A transfer cannot be posted if source and destination are invalid or the amount is not positive.
- Cross-currency transfer behavior is pending Task 00 and must not be guessed.

## 4. Income and expenses

- Income and expense are categorized and represented by ledger postings.
- A transaction date is distinct from its creation/update timestamp.
- Reports must state which date basis they use.
- Editing a posted transaction must use the correction/reversal policy.

## 5. Assets and liabilities

- An asset is not automatically equivalent to cash in a financial account.
- A liability represents an obligation and must not be represented as a negative asset merely for convenience.
- Asset/liability value changes require an effective date and traceable reason/source.
- Valuation changes must be distinguishable from cash income/expense and transfers.
- Net worth = total asset value − total liability value at a defined valuation date.
- Valuation method, frequency and whether unrealized changes affect accounting profit are pending product decisions.

## 6. Offline and privacy

- Core account, transaction and reporting workflows must work without network connectivity.
- No financial record may be sent to a remote service without an explicit product decision and user-facing disclosure.
- Logs must not expose credentials, encryption keys or unnecessary sensitive financial details.

## 7. Pending policy decisions

Task 00 must settle or explicitly defer:
- Cash/accrual basis and the initial chart-of-accounts model.
- Whether categories map directly to ledger accounts or are separate reporting metadata.
- Whether negative balances/overdrafts are allowed by account type.
- Whether split transactions are part of MVP.
- Whether multi-currency is supported in MVP.
- Asset valuation methods and treatment of valuation gains/losses.
- Transaction deletion, archival and correction UX.
- Opening balances and migration/import semantics.
