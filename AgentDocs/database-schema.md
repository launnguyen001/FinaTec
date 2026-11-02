# Két Số — Database Schema (TASK-01)

**Status:** Initial schema proposal implemented on `task/01-database-architecture`; pending verification/review.  
**Schema version:** 1  
**Database:** local SQLite + SQLCipher  
**ORM:** Drizzle ORM / Expo SQLite

## 1. Scope

Version 1 establishes only the financial ledger foundation:

- `currencies`
- `ledger_settings`
- `accounts`
- `journal_entries`
- `journal_lines`

Asset lots, liabilities, budgets, recurring rules, price history, interest plans, and snapshots remain outside TASK-01. Do not create tables merely because they appear in the conceptual ERD.

## 2. ERD

```mermaid
erDiagram
  CURRENCIES ||--o{ ACCOUNTS : denominates
  CURRENCIES ||--o| LEDGER_SETTINGS : base_currency
  CURRENCIES ||--o{ JOURNAL_ENTRIES : base_currency_snapshot
  CURRENCIES ||--o{ JOURNAL_LINES : native_currency
  ACCOUNTS ||--o{ JOURNAL_LINES : owns
  JOURNAL_ENTRIES ||--|{ JOURNAL_LINES : contains
  JOURNAL_ENTRIES ||--o| JOURNAL_ENTRIES : reversal_of

  CURRENCIES {
    string code PK
    string name
    int minor_unit
    boolean is_active
    string created_at
  }
  LEDGER_SETTINGS {
    int id PK
    string base_currency_code FK
    string created_at
    string updated_at
  }
  ACCOUNTS {
    string id PK
    string name
    string type
    string currency_code FK
    boolean is_system
    boolean is_archived
    string created_at
    string updated_at
  }
  JOURNAL_ENTRIES {
    string id PK
    string occurred_at
    string description
    string status
    string base_currency_code FK
    string idempotency_key UK
    string reversal_of_id FK_UK
    string created_at
    string posted_at
  }
  JOURNAL_LINES {
    string id PK
    string entry_id FK
    int line_number
    string account_id FK
    string currency_code FK
    string side
    int amount_minor
    string fx_rate_numerator
    string fx_rate_denominator
    int base_amount_minor
    string memo
    string created_at
  }
```

## 3. Currency and precision policy

- Currency codes are uppercase three-letter codes. Currency metadata stores the number of minor-unit decimal places.
- Initial catalogue seeds VND (0 decimal places) and USD (2 decimal places). Additional supported currencies must be explicitly added with reviewed precision metadata; do not infer precision from locale formatting.
- Monetary values are stored as integer minor units. Domain calculations use `bigint`; the SQLite adapter rejects values outside JavaScript's safe integer range before persistence.
- FX rates are never represented by binary floating-point values. Each journal line stores an exact positive rational quote as numerator/denominator decimal integer strings.
- Rate convention: **base major currency units per one native major currency unit**.
- Each line stores the native amount, native currency, rate snapshot, and converted base amount. The converted base amount is rounded half-up once at line-recording time using the base currency's minor-unit scale. No intermediate floating-point rounding is permitted.
- A line already denominated in the entry's base currency must store FX 1/1 and an unchanged minor-unit amount. A same-currency FX quote other than 1 is invalid.
- The posting use case must compare the sum of converted DEBIT and CREDIT minor units. It must reject an imbalance; TASK-01 does not create an implicit balancing/rounding line. Any explicit rounding account policy must be decided in TASK-02.
- VND and USD follow the product specification: VND 0 decimals, USD 2. Other currencies use explicitly configured metadata.
- For a line in the base currency, the FX snapshot must be 1/1.
- An entry snapshots its base currency. Changing the current base currency affects only future entries; posted history is not rewritten.
- Reporting at current market rates and FX gain/loss recognition are outside this schema task; a later price/FX provider task may persist dated market quotes.

## 4. Ledger rules encoded at persistence boundary

- Every account has one fixed currency. Journal lines must use that same currency (composite foreign key).
- Entry status is `DRAFT` or `POSTED`; `posted_at` must be null for draft and non-null for posted.
- A journal line has a positive native amount, a DEBIT/CREDIT side, a positive FX rational, and a non-negative base amount.
- `line_number` is unique within an entry.
- Non-null idempotency keys are unique.
- One original entry can have at most one linked reversal.
- Posted entries and their lines cannot be updated or deleted. Corrections use a new linked reversal and a new adjustment entry.
- Foreign keys use RESTRICT; accounts/currencies are archived/deactivated rather than deleted once referenced.

## 5. Deliberate omissions

- No current FX-rate feed/history table: line-level transaction-time FX snapshots are in-scope; current market FX quotes are external market data and require a separate freshness/source policy.
- No asset/liability detail tables, categories, budgets, interest, recurring schedules, goals, or net-worth snapshots.
- No account balance column. Balances must be derived from posted journal lines, preventing a second source of truth.
- No user/profile table: the product is local-first and single-owner in this release.

## 6. Indexes and integrity

| Table | Index / constraint | Purpose |
|---|---|---|
| currencies | PK(code), code format, minor_unit 0–6 | Currency identity and precision |
| ledger_settings | singleton id=1, FK currency | Exactly one base-currency setting |
| accounts | PK(id), UNIQUE(id,currency_code), type/archive index | Account identity and currency-aware FK |
| journal_entries | PK(id), occurred_at, status, partial unique idempotency, partial unique reversal | History queries, retry safety, one reversal |
| journal_lines | PK(id), UNIQUE(entry_id,line_number), entry index, account/currency index | Ordered entry detail and balance queries |

Posted-history immutability is enforced with SQLite triggers in the bundled versioned migration. Drizzle's TypeScript schema declares tables/indexes/checks; triggers are migration-owned objects and must be kept in sync with future migrations.

## 7. Transaction and migration behavior

- SQLCipher availability is checked before applying the key. If `PRAGMA cipher_version` is empty, initialization aborts; no plaintext fallback is allowed.
- The key is 32 random bytes, hex-encoded and stored only in SecureStore. If the DB exists and the key is missing/invalid, initialization fails closed. No key regeneration, database deletion, or plaintext open is allowed.
- A failed SQLCipher preflight removes only a database file created by that same fresh preflight (and its newly generated key); an existing database is never deleted.
- Foreign keys and WAL are enabled on the encrypted connection before migrations.
- Drizzle migration is versioned and safe to rerun using its migration journal. Migration failure closes the connection and rejects initialization; the application must not use a partially initialized repository.
- The initialized database connection is process-singleton. Do not create new SQLite connections for queries/transactions unless the SQLCipher key setup is also performed on that connection.

## 8. Sources

- Product specification: `AgentDocs/core/Đặc tả ứng dụng Quản lý Tài chính Cá nhân – Két Số.md`, sections 5.1 and 6.1.
- TASK-01: `AgentDocs/roadmap/task/task-01-database-architecture.md`.
- Expo SDK 58 SQLite documentation: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
- Drizzle Expo SQLite: https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite
