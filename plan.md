# FinaTec — Implementation Roadmap

**Version:** 1.0  
**Status:** Planning baseline  
**Product direction:** Offline-first, privacy-first personal finance and wealth manager  
**Core principle:** Double-entry ledger is the source of truth for recorded financial events.

## 1. Product objective

Build a personal finance system that can answer, reliably and audibly:

- How much money do I have in each financial account?
- Where did money come from and where did it go?
- What assets and liabilities do I own or owe?
- What is my net worth at a selected point in time?
- How did my financial position change over a period?

Balances, reports and net worth must be derived from canonical records. Avoid maintaining multiple independent values for the same financial fact.

## 2. MVP boundaries

### Core MVP
1. Local application foundation and persistence.
2. Financial account and category management.
3. Double-entry accounting engine.
4. Income, expense and transfer workflows.
5. Asset and liability records with traceable value changes.
6. Account balances, cash-flow summaries and net-worth snapshots/reports.
7. Validation, automated tests, backup/export strategy and recovery behavior.

### Explicitly out of initial scope unless approved
- Bank integrations and automatic transaction imports.
- Multi-user collaboration and cloud synchronization.
- Investment trading, portfolio execution and real-time market feeds.
- Tax filing and tax advice.
- Complex multi-currency consolidation and automatic FX-rate services.
- Budgeting, recurring automation and notifications beyond what is needed for core correctness.

These can be added later without weakening the ledger model.

## 3. Delivery phases

| Phase | Focus | Exit condition |
|---|---|---|
| 0 | Product and technical decisions | Open decisions recorded and approved |
| 1 | Project foundation | App builds, test setup and persistence skeleton work |
| 2 | Domain model and storage | Schema supports accounts, journal entries, assets and liabilities |
| 3 | Accounting engine | Balanced posting, atomicity and balance derivation pass tests |
| 4 | Transaction use cases | Income, expense and transfer workflows are correct |
| 5 | Assets and liabilities | Ownership, valuation and liability changes are traceable |
| 6 | Reporting | Account balances, cash flow and net worth reconcile to ledger |
| 7 | Hardening | Backup/restore, migration, edge cases and release checks pass |

## 4. Task execution order

1. `tasks/task-00-decisions.md` — resolve product and technical decisions.
2. `tasks/task-01-foundation.md` — establish application and test foundation.
3. `tasks/task-02-data-model.md` — implement domain model and persistence.
4. `tasks/task-03-accounting-engine.md` — implement the ledger posting core.
5. `tasks/task-04-transactions.md` — implement financial transaction use cases.
6. `tasks/task-05-assets-liabilities.md` — implement asset and liability tracking.
7. `tasks/task-06-reports-net-worth.md` — derive balances and reports.

Tasks 02–03 are the critical path. Do not build transaction screens or reports against a provisional accounting model.

## 5. Global implementation rules

- One task per implementation scope. Do not bundle unrelated refactors.
- Before coding, inspect current code and state assumptions, affected modules and test plan.
- Do not introduce a framework, dependency or architectural layer without documenting why it is needed.
- Keep domain rules independent from UI and persistence details where the chosen stack allows it.
- Use exact decimal representation for money. Never use binary floating-point for monetary arithmetic.
- A posted journal entry must balance: total debits equal total credits for each supported currency.
- Posting must be atomic: either all lines are persisted or none are.
- Posted financial history must not be silently overwritten or deleted. Corrections require an explicit reversal/correction workflow.
- Derived balances and reports must be reproducible from canonical records.
- Date/time handling and currency behavior must be explicit; never rely on implicit machine defaults.
- Offline operation is a product requirement. Do not make core financial operations depend on a network request.
- Privacy and data ownership are architectural concerns, not a late UI feature.

## 6. Definition of Done

A task is complete only when:
- Its acceptance criteria are met.
- Relevant automated tests pass.
- Existing tests/build remain green.
- No unrelated files or behavior were changed.
- Documentation and `PROGRESS.md` are updated.
- The final report lists changed files, tests executed, results and known limitations.

## 7. Decisions that block implementation

Task 00 must record decisions for:
- Target platform(s) and UI technology.
- Language/runtime and project structure.
- Local database and migration strategy.
- Local data encryption and key lifecycle.
- Backup/export and restore expectations.
- Initial currency and whether multi-currency is MVP.
- Accounting basis and treatment of asset valuation changes.
- Whether financial accounts include cash, bank, e-wallet and credit accounts in the first release.

Until these are decided, do not guess a stack or lock an irreversible schema.
