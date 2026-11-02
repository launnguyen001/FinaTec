# FinaTec — Architecture

**Status:** Logical architecture baseline; physical stack pending Task 00.

## 1. Architectural direction

Use a domain-centered architecture. The accounting domain must not depend on UI widgets, database APIs or platform-specific presentation code.

Suggested logical flow:

`Presentation → Application Use Cases → Domain → Persistence Adapters`

- **Presentation:** screens, forms, navigation and user interaction.
- **Application:** coordinates use cases and transaction boundaries.
- **Domain:** money, accounts, journal entries, posting rules, assets, liabilities and domain invariants.
- **Persistence adapters:** repositories, local database, migrations, backup/export.

The concrete folder names and dependency injection mechanism are decided after the platform and language are selected.

## 2. Core domain modules

### Accounting
Owns journal entries, journal lines, debit/credit validation, posting, reversal and balance derivation.

### Financial accounts
Represents places or instruments where funds are held or owed, such as cash, bank, e-wallet and credit accounts. Exact MVP account types are a Task 00 decision.

### Transactions
Provides user-facing use cases such as income, expense and transfer. A transaction is not merely a mutable balance adjustment; it produces a balanced journal entry.

### Assets and liabilities
Tracks owned assets and obligations separately from liquid financial accounts. Value changes must have a date, source/reason and auditable history.

### Reporting
Queries canonical accounting and valuation records. Reports must not become a second source of truth.

## 3. Dependency constraints

- Presentation may call application use cases; it must not write directly to database tables.
- Application coordinates domain operations and repository transactions.
- Domain must not import UI, database or network frameworks.
- Persistence maps stored records to domain objects and enforces database-level constraints where possible.
- Reporting reads canonical records; it does not independently mutate balances.
- Network access must not be required for core offline workflows.

## 4. Persistence and consistency

- Use versioned schema migrations.
- Enforce atomic writes for a journal entry and all of its lines.
- Add unique identifiers and appropriate indexes for account, date and journal lookups.
- Store money in exact decimal-safe form (for example integer minor units when currency scale is fixed, or a decimal representation with explicit scale).
- Never persist a floating-point amount as the authoritative monetary value.
- Define deletion/archival semantics before implementing financial records.
- Backup/restore must preserve referential integrity and ledger consistency.

## 5. Security and privacy

The application is privacy-first and offline-first. Task 00 must decide:
- Whether the database is encrypted at rest in MVP.
- How encryption keys are generated, stored, unlocked and rotated.
- Whether biometric/device authentication is required or optional.
- What data is included in exports and backups.
- How sensitive data is excluded from logs, crash reports and diagnostics.

Do not claim data is encrypted until the implementation and tests demonstrate it.

## 6. Future extensibility

Keep boundaries that allow later bank import, cloud sync, multi-currency and investment modules. Do not implement speculative abstractions before a concrete use case requires them.
