# Báo cáo kiểm thử FinaTec — TASK-00 → TASK-06

**Ngày kiểm thử:** 2026-11-04  
**Repository:** `/home/user/projects/FInTech`  
**Remote:** `https://github.com/launnguyen001/FinaTec.git`  
**Phạm vi:** TASK-00 đến TASK-06, đối chiếu Core Specification, Roadmap, accounting rules, database schema và task documents.

> **Nguyên tắc thực hiện:** Audit được thực hiện read-only trên source/test/migration/schema/config. Báo cáo này chỉ ghi nhận kết quả; không thay đổi task status, roadmap checkbox, source, test, migration hoặc cấu hình. PR #8 không được merge. Ngoài file `AgentDocs/report.md` này, working tree không bị sửa.

---

## Tóm tắt điều hành

| Task | Trạng thái tài liệu | Kết luận audit |
|---|---|---|
| TASK-00 | DONE | **PASS WITH LIMITATIONS** — iOS và old-key recovery chưa xác minh; có verification gap về key lifecycle |
| TASK-01 | DONE | **PASS** |
| TASK-02 | DONE | **PASS** |
| TASK-03 | DONE | **FAIL / BLOCKED** — production runtime thiếu CategoryRepository, làm hỏng luồng thu/chi |
| TASK-04 | COMPLETED | **PASS WITH HIGH FINDING** — migration `0004` làm mất trigger bất biến currency |
| TASK-05 | COMPLETED | **PASS** |
| TASK-06 | COMPLETE / DEVICE_ACCEPTED | **CONDITIONAL PASS** — fix FK đúng nhưng thiếu automated regression test |

### Kết luận tổng thể

**NO-GO** đối với việc tuyên bố TASK-00 → TASK-06 hoàn tất hoặc sẵn sàng release.

Lý do chính:

1. **F-01 — CRITICAL:** production `createFinanceRuntime()` không inject `CategoryRepository` vào `AccountingService`. Quick Income, Quick Expense và reversal của giao dịch có category thất bại với `Category does not exist`.
2. **F-02 — HIGH:** migration `0004_usdt_currency_code.ts` drop/recreate bảng `currencies` nhưng không tạo lại hai trigger bất biến currency code/precision.
3. **F-03 — MEDIUM:** fix thứ tự ghi TASK-06 chỉ được kiểm chứng bằng device diagnostic, không có automated real-SQLite regression test.
4. **F-04 — MEDIUM:** không có test nào boot production composition root, nên F-01 lọt qua CI.

**Riêng TASK-06 / PR #8:** **CONDITIONAL GO**. Bản thân diff TASK-06 không gây ra NO-GO cấp dự án; TASK-06 có thể merge sau khi bổ sung regression test F-03 hoặc có CI gate tương đương, và sau khi owner chấp nhận F-01/F-02 là lỗi có sẵn trên `main`.

---

## Phase 0 — Baseline

| Hạng mục | Giá trị |
|---|---|
| Branch hiện tại | `task/06-liability-management` |
| TASK-06 HEAD | `5257231a704a40f98b032679df8a3e4617b64bd3` |
| Baseline `origin/main` | `fe91858b6ae71d8f5f51d7ad664db1631e06dedb` — TASK-05 merge |
| Local `main` | Stale tại `f542c42`; không dùng làm baseline |
| Working tree | Sạch trước và sau audit |
| PR #8 | OPEN, mergeable, head `5257231`, base `fe91858`, merge ref `2e64633` |
| CI trên PR #8 HEAD | 2/2 check-runs success lúc `2026-11-04T06:43:12Z` |
| Node local | v22.23.1 |
| CI runtime | Node 22, Ubuntu, `npm ci`, typecheck, lint, format:check, `npm test` |

### Branch và merge baseline

| Task | Branch head | PR | Merge commit |
|---|---|---|---|
| TASK-00 | `9370e68` | #1 | `7e9cfc1` |
| TASK-00 closeout | — | #2 | `7185868` |
| TASK-01 | `5c6be5b` | #3 | `f542c42` |
| TASK-02 | `fe4f466` | #4 | `952bb1e` |
| TASK-03 | `403e250` | #5 | `736db0a` |
| TASK-04 | `b5c6034` | #6 | `38b6453` |
| TASK-05 | `a2ff67e` | #7 | `fe91858` |
| TASK-06 | `5257231` | #8 OPEN | Chưa merge |

### Phân loại bằng chứng

- **VERIFIED:** Kiểm tra trực tiếp repository hoặc chạy lệnh trong audit này.
- **CI:** GitHub check-runs cho đúng commit.
- **DEVICE:** Ghi nhận trong tài liệu acceptance; không thể chạy lại độc lập trong môi trường audit.
- **INFERRED:** Kết luận deterministic từ code đã kiểm tra, chưa chạy riêng.
- **UNKNOWN:** Không thể kết luận chỉ từ repository.

---

## Phase 1 — Nguồn và phương pháp

Tài liệu nguồn đã đọc:

- `AgentDocs/core/Đặc tả ứng dụng Quản lý Tài chính Cá nhân – Két Số.md`
- `AgentDocs/roadmap/plan.md`
- `AgentDocs/accounting-rules.md`
- `AgentDocs/database-schema.md`
- `AgentDocs/data-dictionary.md`
- Task documents TASK-00 → TASK-06
- Các quyết định TASK-04/TASK-05 được task documents tham chiếu

Tài liệu, checklist và CI được coi là **claim cần kiểm chứng**, không phải bằng chứng implementation. Khi code và tài liệu mâu thuẫn, code tại commit hiện tại được dùng làm bằng chứng chính và mâu thuẫn được ghi nhận.

---

## Phase 2 — Traceability Matrix

| Yêu cầu / contract | Task | Implementation | Bằng chứng automated | Bằng chứng device / CI | Kết luận |
|---|---|---|---|---|---|
| Expo/TypeScript/Router foundation | TASK-00 | `src/app/`, `package.json`, CI | Router 10/10; typecheck/lint/format PASS | CI PASS | **PASS** |
| SQLCipher fail-closed key lifecycle | TASK-00 | `database.ts`, `spike/key-lifecycle.ts` | Key 4/4 nhưng chỉ test spike helper | Android fresh-file diagnostic; iOS NOT VERIFIED | **PASS WITH VERIFICATION GAP — F-06** |
| Versioned migrations và atomic ledger writes | TASK-01 | `migrations/index.ts`, `sqlite-ledger-repository.ts` | Accounting suites PASS | CI PASS | **PASS** |
| Posted-entry và account-currency immutability | TASK-01 | Trigger trong `0000_ledger_foundation.ts` | Posting/accounting tests PASS | Static inspection | **PASS** |
| Currency code/precision immutability sau khi dùng | TASK-01, bị regression bởi TASK-04 | Trigger tạo ở `0000`; bị mất ở `0004` | Không có migration regression test | Static inspection | **FAIL — F-02** |
| Balanced double-entry, rational FX, HALF_UP base amount | TASK-02 | `posting.ts`, `posting-plan.ts` | 10 posting + 15 use-case tests | CI PASS | **PASS** |
| Idempotency, reversal, replacement atomicity | TASK-02 | `accounting-service.ts`, `sqlite-ledger-repository.ts` | Use-case tests PASS | CI PASS | **PASS** |
| Archived-account rejection, zero-balance archive | TASK-02/03 | Domain validators + SQLite triggers | Account 4/4, posting tests | TASK-03 Android acceptance | **PASS** |
| Account lifecycle, subtype, restore | TASK-03 | `account-service.ts`, `account-repository.ts` | 4/4 account tests | Device acceptance recorded | **PASS** |
| Category tree, kind, archive, cycle protection | TASK-03 | `category-service.ts`, trigger `0001` | 5/5 category tests | Device acceptance recorded | **PASS** |
| Income/expense qua shared accounting engine | TASK-03 | `finance-transaction-service.ts` + `finance-runtime.ts` | 2/2 unit tests nhưng inject category thủ công | Device acceptance recorded | **FAIL — F-01** |
| Transfer, opening balance, reversal | TASK-03 | `accounting-service.ts` | Use-case tests PASS | Device acceptance recorded | **PASS**, trừ reversal có category bị F-01 |
| Dashboard per-currency aggregation | TASK-03, sửa bởi TASK-04 | `dashboard-service.ts` | 1/1 dashboard test | Device acceptance recorded | **PASS** |
| History filter và full transaction detail | TASK-03 | `finance-read-repository.ts`, `HistoryScreen.tsx` | Không có query test trực tiếp | Không có device evidence riêng | **PARTIAL — F-05** |
| Asset lifecycle, lots, cost basis, atomic buy/sell | TASK-04 | `asset-transaction-service.ts`, `sqlite-asset-repository.ts` | 15 domain + service tests | Android 15/15 | **PASS** |
| USDT currency migration | TASK-04 | `0004_usdt_currency_code.ts` | Không có migration test | Static inspection | **FAIL — F-02** |
| Interest calculation, accrual, posting, catch-up | TASK-05 | `interest.ts`, `interest-service.ts`, `sqlite-interest-repository.ts` | 8/8 interest tests | Android 8/8 | **PASS** |
| Liability repayment methods và schedule | TASK-06 | `repayment-schedule.ts` | 7/7 schedule tests | Device round 2 | **PASS** |
| Liability payment atomicity/idempotency | TASK-06 | `liability-service.ts`, `sqlite-liability-repository.ts` | 12/12 service tests, repository bị mock | Device round 2 | **PASS WITH TEST GAP — F-03** |
| Liability FK write-order fix | TASK-06 | `cfc95c2`, current `commitPayment` | Không có real-SQLite automated test | Device round 2 PASS | **PASS WITH TEST GAP — F-03** |
| Liability reversal, replacement, APR, FX, archive, reconciliation | TASK-06 | Migration `0006`–`0010`, service/repository | Service/schedule/input tests | Device round 2 | **PASS** |

---

## Phase 3 — Audit từng task

### TASK-00 — Project Foundation

**Trạng thái tài liệu:** DONE.  
**Kết luận audit:** **PASS WITH LIMITATIONS.**

Đã xác minh:

- Expo/React Native, Expo Router, TypeScript, lint, formatting và CI pipeline tồn tại.
- SQLCipher được cấu hình; database initialization fail closed khi SQLCipher không khả dụng.
- Key lifecycle có tài liệu và bằng chứng Android cho fresh-file creation/reopen.

Giới hạn:

- iOS runtime **NOT VERIFIED**; chỉ có prebuild/config evidence.
- Khôi phục database cũ với key thiếu/không chắc chắn **NOT VERIFIED**.
- Test key import `src/infrastructure/database/spike/key-lifecycle.ts`, không test resolver đang dùng trong `database.ts`. Hai implementation bị duplicate. Đây là **F-06**.

### TASK-01 — Database Architecture

**Trạng thái tài liệu:** DONE.  
**Kết luận audit:** **PASS.**

Đã xác minh:

- Migration có version và journal.
- Ledger schema dùng fixed account currency, composite FK, posted-entry immutability trigger, system-account deletion protection và không có cached balance column.
- `sqlite-ledger-repository.ts` dùng synchronous SQLite transaction cho draft/post/replacement.
- Domain validation tính lại base amount từ FX snapshot và reject unbalanced entry.

Ghi chú:

- TASK-01 tạo đúng trigger currency immutability trong `0000`. Trigger này bị TASK-04 `0004` làm mất; lỗi được quy cho TASK-04 qua **F-02**, không phải implementation gốc TASK-01.

### TASK-02 — Accounting Engine

**Trạng thái tài liệu:** DONE.  
**Kết luận audit:** **PASS.**

Đã xác minh:

- `AccountingService` có draft, direct posting, opening balance, same/cross-currency transfer, reversal và atomic replacement.
- `validateJournalEntry` enforce balance theo base currency, positive line amount, FX snapshot, account/line currency, category kind và archived-account rejection.
- Reversal đảo side, giữ native amount và FX snapshot.
- Replacement ghi reversal + replacement trong một transaction.
- Tests cover unbalanced entry, archived account, FX identity, idempotent retry, reversal và replacement.

Không phát hiện defect material trong bản thân TASK-02.

### TASK-03 — Core Finance

**Trạng thái tài liệu:** DONE với Android acceptance.  
**Kết luận audit:** **FAIL / BLOCKED** do **F-01**.

#### Critical finding

`createFinanceRuntime()` tạo `AccountingService` mà không truyền category repository:

- `src/infrastructure/finance-runtime.ts:42` — `new AccountingService(ledger, { createId, now })`
- `src/application/ledger/accounting-service.ts:695-716` — categories trở thành empty map khi option vắng mặt.
- `src/application/ledger/accounting-service.ts:103-123` — mọi entry `INCOME`/`EXPENSE` cần category resolvable, nếu không sẽ throw `Category does not exist`.

Production Quick Income/Quick Expense gọi `runtime.transactions.recordIncome` / `recordExpense`, rồi đi qua `AccountingService.postEntry`. Đường đi deterministic:

`QuickExpenseScreen → FinanceTransactionService.recordExpense → AccountingService.postEntry → validateJournalEntry → "Category does not exist"`

Đã reproduce bằng một Jest harness nằm ngoài repo, mô phỏng đúng production composition root. Test pass với expected rejection.

Missing category map cũng làm reversal của entry có category thất bại, vì `REVERSAL` kế thừa category và phải resolve category trong `validateJournalEntry`.

**Quan trọng:** Điều này mâu thuẫn trực tiếp với TASK-03 device acceptance ghi rằng Quick Expense/Quick Income đã được kiểm chứng. Repository evidence không thể xác định acceptance flow có thực sự đi qua path này hay record không chính xác. Đây là **UNKNOWN**, không phải kết luận rằng device test bị fabricated.

Các phần khác của TASK-03:

- Account lifecycle, subtype, archive/restore: **PASS**.
- Category tree, kind, cycle protection, archive: **PASS**.
- Dashboard per-currency: **PASS**, với thay đổi TASK-04 loại investment account khỏi available cash là intentional và có tài liệu.
- History filter: **PARTIAL — F-05**.

### TASK-04 — Asset Management

**Trạng thái tài liệu:** COMPLETED — Android SQLCipher 15/15; iOS NOT VERIFIED; metals provider DEFERRED.  
**Kết luận audit:** **PASS WITH HIGH DEFECT — F-02.**

Đã xác minh:

- Asset purchase/sale build và validate journal posting, sau đó commit asset transaction, lots và ledger entry atomically.
- Cost basis, remaining cost basis, DCA merge, price quotes, daily valuations, archive và refresh orchestration được implement.
- Có test và device acceptance evidence.

High defect:

- `0004_usdt_currency_code.ts` drop và recreate bảng `currencies` để mở rộng currency code lên 4 ký tự.
- Drop table tự động drop hai trigger tạo ở `0000`:
  - `currencies_code_immutable`
  - `currencies_no_precision_change_when_referenced`
- Migration không recreate chúng. Grep toàn repository chỉ thấy tên trigger trong `0000`.
- Điều này vi phạm `AgentDocs/database-schema.md` §4 và §6, nơi yêu cầu currency identity/precision immutability và nói trigger là migration-owned object phải được giữ đồng bộ.

Đây là **latent** integrity regression: UI hiện tại không expose mutation currency code/minor unit, nên chưa user-reachable. Tuy nhiên invariant đã mất và phải sửa trước mọi tính năng currency management hoặc migration sau này.

### TASK-05 — Interest Engine

**Trạng thái tài liệu:** COMPLETED — CI PASS; Android 8/8.  
**Kết luận audit:** **PASS.**

Đã xác minh:

- Nominal APR, ACT/365 Fixed, integer/rational BigInt, HALF_UP, simple và post-capitalization accrual.
- Interest plan yêu cầu account cùng base currency trong MVP; foreign-currency interest posting bị reject rõ ràng.
- Accrual persistence, posting, capitalization, catch-up, idempotency được implement và có test.
- Không phát hiện defect material trong scope đã audit.

### TASK-06 — Liability Management

**Trạng thái tài liệu:** COMPLETE — DEVICE_ACCEPTED; PR #8 open.  
**Kết luận audit:** **PASS WITH TEST GAP — F-03.**

#### Truy vết lỗi FK lịch sử

Round 1 device acceptance fail tại early-principal stage:

`Error code 19: FOREIGN KEY constraint failed`  
Stack: `commitPayment → recordPayment`

Nguyên nhân deterministic từ thứ tự ghi cũ:

1. `recordPayment` tính payment allocation và replacement schedule.
2. `commitPayment` mở một transaction và ghi:
   - posted journal entry/lines;
   - payment row;
   - allocation rows;
   - update existing installments;
   - **schedule-change audit rows**;
   - **new replacement installments**;
   - liability balance/status update.
3. `liability_payment_schedule_changes.installment_id` có FK immediate tới `liability_installments.id`.
4. `CREATED` schedule-change row tham chiếu replacement installment chưa được insert. SQLite reject ngay.
5. Toàn bộ write nằm trong `db.transaction(...)`, nên payment command rollback toàn bộ. Vì vậy không có partial payment và `PRAGMA foreign_key_check` sau failure trả `[]`.

Commit `cfc95c2` sửa bằng cách insert `input.newInstallments` trước `input.scheduleChanges`.

Thứ tự hiện tại:

`journal entry/lines → payment → allocations → existing installment updates → new installments → schedule-change audit → liability balance/status update → reload payment`

Transaction hiện tại: `src/infrastructure/database/sqlite-liability-repository.ts:336-513`. Fix nằm ở lines 472-488.

Residual risk:

- Fix chỉ được cover bởi device diagnostic.
- `src/application/liability/liability-service.test.ts:87-89` mock `commitPayment`; không chạy SQLite hoặc FK.
- Không có automated real-SQLite regression test sẽ fail nếu write order bị đảo lại. Đây là **F-03**.

Các phần khác của TASK-06 đã xác minh:

- Idempotency payload comparison gồm liability, source account, schedule, FX, replacement link, note, principal, interest, fee.
- Payment reversal tạo linked reversal journal, restore installment counters/schedule, enforce reverse posting order.
- APR history immutable và chỉ áp dụng forward.
- Archive yêu cầu full ledger/subledger/payment reconciliation.
- FX rounding imbalance bị reject thay vì post journal mất cân bằng.
- Device round 2 pass toàn bộ trên Huawei LYA-L29 / Android 10 / API 29 / SQLCipher 4.17.0 community.

---

## Phase 4 — Audit cross-module

### 4.1 Composition root

Đây là vấn đề kiến trúc lớn nhất:

| Dependency | Inject đúng? | Hệ quả |
|---|---|---|
| `LedgerRepository` | Có | Core ledger hoạt động |
| `CategoryRepository` vào `FinanceTransactionService` | Có | Input validation hoạt động |
| `CategoryRepository` vào `AccountingService` | **Không** | **F-01: mọi posting có category thất bại** |
| `LedgerRepository` vào `DashboardService` | Có | Balance reads hoạt động |
| `CategoryRepository` vào asset transaction service | Có | Asset fee/category validation hoạt động |
| Interest và liability services | Có | Posting paths tự validate |

Đây không phải domain-layer flaw mà là dependency-injection omission tại runtime boundary. Nó cũng cho thấy unit test pass chưa đủ: unit test tạo `AccountingService` đúng với categories, còn shipped runtime thì không.

### 4.2 Posting paths

| Writer | Transaction boundary | Validation | Trạng thái |
|---|---|---|---|
| `AccountingService` | `commitPostedEntry`, `commitReplacement` | Domain posting validator | Đúng, nhưng production category injection hỏng |
| `AssetTransactionService` | `commitPurchase`, `commitSale` | `buildJournalPosting` + repository validation | Đúng |
| `InterestService` | `commitPostedAccrual` | Repository validate journal và accrual balance | Đúng |
| `LiabilityService` | `commitPayment`, `reversePayment` | Repository validate journal và exact reversal | Đúng sau `cfc95c2` |

Cả bốn specialized paths đều enforce double-entry balance và posted-history immutability. Rủi ro còn lại là journal-construction logic bị duplicate giữa các module; chỉ chấp nhận được khi mỗi path có integration coverage riêng.

### 4.3 Idempotency

| Domain | Cơ chế | Payload comparison | Trạng thái |
|---|---|---|---|
| Generic journal entries | Unique partial index trên idempotency key | Không so sánh payload; retry trả entry cũ | Chấp nhận theo accounting rules hiện tại |
| Liability payments | Unique key + field-by-field comparison ở service/repository | Có | Strong |
| Interest accruals | Deterministic key + unique index + retry lookup | Calculated payload consistency | Adequate |
| Asset transactions | Unique key + repository retry lookup | Purchase/sale reference check | Adequate |

Không phát hiện cross-module key collision.

### 4.4 Read models

- Dashboard đọc posted journal lines theo date và aggregate native amount theo currency.
- History đọc posted lines join accounts/categories.
- TASK-04 intentional loại investment accounts khỏi “available cash”; có tài liệu và test, thay thế wording cũ của TASK-03.
- History account filtering chưa đầy đủ; xem **F-05**.

### 4.5 Currency và FX

- TASK-02/03 dùng native-currency balance, không cộng chéo currency.
- TASK-04 thêm USDT và quote conversion convention.
- TASK-05 giới hạn interest plan ở base currency.
- TASK-06 hỗ trợ rational FX snapshot và reject base-currency rounding imbalance.
- Currency metadata immutability hiện bị phá bởi **F-02**.

---

## Phase 5 — Financial invariants

| Invariant | Enforcement | Kết quả |
|---|---|---|
| Mọi posted entry cân bằng theo base currency | Domain validator + repository validation | **PASS** |
| Posted entry/lines immutable | SQLite trigger + repository design | **PASS** |
| Account currency immutable | Trigger `accounts_currency_immutable` | **PASS** |
| Currency code immutable | Trigger bị mất bởi `0004` | **FAIL — F-02** |
| Currency precision immutable sau khi dùng | Trigger bị mất bởi `0004` | **FAIL — F-02** |
| System account không thể delete | SQLite trigger | **PASS** |
| Archived account không nhận posting mới | Domain validator + trigger | **PASS** |
| Archive account cần exact zero balance | Service check + atomic trigger | **PASS** |
| Không có cached account balance | Schema và balance derivation | **PASS** |
| Liability principal balance reconcile với ledger | `reconcile()` + device diagnostic | **PASS trên evidence hiện có** |
| Liability payment atomic | Single repository transaction | **PASS by code inspection; thiếu regression test** |
| Liability schedule/audit FK hợp lệ | FK constraint + fixed write order | **PASS sau `cfc95c2`; device evidence only** |
| Interest dùng exact rational arithmetic và HALF_UP một lần | Domain calculator + tests | **PASS** |
| Income/expense dùng được trong production | Production runtime wiring | **FAIL — F-01** |

---

## Phase 6 — Regression evidence và roadmap alignment

### 6.1 Lệnh local đã chạy

| Command | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run format:check` | PASS |
| `npx jest --runInBand --roots ./src` | **17/17 suites, 116/116 tests PASS** |
| `npm test` (repo-wide) | **33/34 suites, 222/232 tests pass; 1 suite / 10 tests fail** do nested acceptance worktree |

Repo-wide failure không đại diện repository sạch:

- `android/.task06-acceptance-eb4e9b7` là nested worktree có `node_modules` riêng.
- Jest discover router tests của worktree và load bản Expo module thứ hai.
- Failure: `Cannot find native module 'ExpoLinking'`.
- Scoped `--roots ./src` là kết quả sạch, khớp TASK-06 documented 17 suites / 116 tests.

### 6.2 CI evidence

| Commit | Checks |
|---|---|
| `5257231` (TASK-06 HEAD) | 2/2 success lúc `2026-11-04T06:43:12Z` |
| `a2ff67e` (TASK-05) | Success |
| `b5c6034` (TASK-04) | Success |
| `fe91858` (`origin/main`) | Success |
| Các commit task cũ | Không có check-runs từ API |

CI chứng minh test suite hiện tại pass; không chứng minh production composition root hoạt động, vì không có test nào boot `createFinanceRuntime`.

### 6.3 Device evidence

| Task | Evidence ghi nhận | Phân loại audit |
|---|---|---|
| TASK-00 | Android fresh-file SQLCipher; old DB key NOT VERIFIED; iOS NOT VERIFIED | DEVICE / UNKNOWN |
| TASK-01 | Schema upgrade acceptance | DEVICE |
| TASK-02 | Android acceptance 9/9 | DEVICE |
| TASK-03 | Android UI/offline acceptance | DEVICE, mâu thuẫn với F-01 code path |
| TASK-04 | Android SQLCipher 15/15 | DEVICE |
| TASK-05 | Android SQLCipher 8/8 | DEVICE |
| TASK-06 | Round 1 BLOCKED FK; round 2 PASS trên `cfc95c2` | DEVICE |

Device acceptance không được chạy lại độc lập trong môi trường audit.

### 6.4 Roadmap alignment

| Task | Roadmap phase | Dependencies | Trạng thái tài liệu | Trạng thái audit |
|---|---|---|---|---|
| TASK-00 | Phase 0 — Foundation | None | DONE | PASS WITH LIMITATIONS |
| TASK-01 | Phase 1 — Database/Accounting | TASK-00 | DONE | PASS |
| TASK-02 | Phase 1 — Accounting Engine | TASK-00, 01 | DONE | PASS |
| TASK-03 | Phase 2 — MVP 1 Core Finance | TASK-02 | DONE | **FAIL — F-01** |
| TASK-04 | Phase 3 — MVP 2 Assets | TASK-02, 03 | COMPLETED | PASS WITH HIGH FINDING |
| TASK-05 | Phase 3 — MVP 2 Interest | TASK-02, 04 | COMPLETED | PASS |
| TASK-06 | Phase 4 — MVP 3 Liabilities | TASK-02, 03, 05 | COMPLETE / DEVICE_ACCEPTED | CONDITIONAL PASS |

Project-level Definition of Done trong `plan.md` vẫn còn các release gate chưa check, gồm Android/iOS verification, backup/restore, performance target và release polish. TASK-06 device-accepted không làm dự án release-ready.

---

## Phase 7 — Findings register, remediation plan và kết luận

### F-01 — Production finance runtime không inject categories vào accounting engine

- **ID:** F-01
- **Severity:** **CRITICAL**
- **Type:** Functional defect / composition-root wiring
- **Requirement:** TASK-03 §2.3, §2.6; TASK-02 category-aware posting; Core Specification income/expense flows
- **Task:** TASK-03
- **Files:**
  - `src/infrastructure/finance-runtime.ts:42`
  - `src/application/ledger/accounting-service.ts:103-123, 695-716`
  - `src/application/finance/finance-transaction-service.ts:56-78, 110-132`
  - `src/presentation/screens/QuickExpenseScreen.tsx:145`
  - `src/presentation/screens/QuickIncomeScreen.tsx:132`
  - `src/tests/finance-transaction-service.test.ts:67-71`
- **Evidence:**
  - Runtime tạo `AccountingService` không có `categories`.
  - `loadContext()` do đó cung cấp empty category map.
  - `validateJournalEntry` throw khi `INCOME`/`EXPENSE` tham chiếu category.
  - Out-of-repo Jest harness mô phỏng runtime composition đã reproduce rejection.
  - Unit test pass chỉ vì inject category repository thủ công.
- **Actual:** Quick Income, Quick Expense và reversal của entry có category fail với `Category does not exist`.
- **Expected:** Các flow này post balanced journal entry và update balance.
- **Impact:** Core TASK-03 workflows không dùng được trong shipped runtime dù có device acceptance record. TASK-03 completion claim không còn hiệu lực cho đến khi re-verify.
- **Recommendation:** Truyền `categories: categoryRepository` vào production `AccountingService`; thêm composition-root test cho income, expense và categorized reversal; chạy lại Android Quick Expense/Quick Income/History reversal acceptance.
- **Owner:** TASK-03 implementation owner.
- **Dependencies:** None.
- **Verification:** Test fail trước fix, pass sau fix; device acceptance ghi nhận posting thành công và journal rows.

### F-02 — Migration `0004` phá hủy currency immutability triggers

- **ID:** F-02
- **Severity:** **HIGH**
- **Type:** Schema/invariant regression
- **Requirement:** `AgentDocs/database-schema.md` §4, §6; TASK-01 currency identity/precision invariants
- **Task:** TASK-04
- **Files:**
  - `src/infrastructure/database/migrations/0000_ledger_foundation.ts:95-115`
  - `src/infrastructure/database/migrations/0004_usdt_currency_code.ts:1-23`
- **Evidence:**
  - `0000` tạo `currencies_code_immutable` và `currencies_no_precision_change_when_referenced`.
  - `0004` drop `currencies`, recreate thành `currencies_replacement`, rename lại.
  - `0004` không có `CREATE TRIGGER`.
  - Grep chỉ thấy tên trigger trong `0000`.
  - Schema document nói rõ trigger là migration-owned và phải giữ đồng bộ.
- **Actual:** Database migrate qua `0004` không còn trigger currency code/precision immutability.
- **Expected:** Hai trigger tồn tại và reject mutation identity/precision sau first use.
- **Impact:** Latent financial-data integrity regression. UI hiện tại chưa update currency, nhưng feature/migration/admin repair trong tương lai có thể vi phạm invariant. Fresh install và upgraded install đều bị ảnh hưởng.
- **Recommendation:** Thêm forward migration `0011` dùng `DROP TRIGGER IF EXISTS` và recreate cả hai trigger; đăng ký trong `migrations/index.ts`; thêm migration test apply `0000`–`0011` trên empty và populated DB, assert trigger tồn tại trong `sqlite_master`, assert mutation bị reject. Không sửa retroactive `0000`/`0004`.
- **Owner:** TASK-04 implementation owner.
- **Dependencies:** None.
- **Verification:** Migration test trên fresh/upgraded DB; update currency code/minor unit fail; `PRAGMA foreign_key_check` empty.

### F-03 — TASK-06 FK write-order fix thiếu automated real-SQLite regression test

- **ID:** F-03
- **Severity:** **MEDIUM**
- **Type:** Test coverage / regression risk
- **Requirement:** TASK-06 §4 atomic payment; §9 rollback/idempotency tests
- **Task:** TASK-06
- **Files:**
  - `src/infrastructure/database/sqlite-liability-repository.ts:336-513`
  - `src/application/liability/liability-service.test.ts:87-89`
  - `src/infrastructure/database/liability-acceptance-diagnostic.ts:334`
  - Fix commit `cfc95c2`
- **Evidence:**
  - Historical error do schedule-change rows tham chiếu replacement installments trước khi chúng tồn tại.
  - `cfc95c2` sửa thứ tự.
  - Device round 2 pass trên fixed source.
  - Service tests mock `commitPayment`, không chạy SQLite FK.
  - Không có repository integration test assert write order/rollback.
- **Actual:** Fix chỉ được validate bằng manual device diagnostic.
- **Expected:** CI có real-SQLite regression fail nếu schedule-change audit rows được ghi trước replacement installments.
- **Impact:** Refactor tương lai có thể tái tạo production-blocking FK error trong khi unit tests vẫn green.
- **Recommendation:** Thêm repository integration test dùng real SQLite và actual migrations. Test tạo liability, record early principal payment sinh replacement installments, assert schedule-change rows/new installments tồn tại và `PRAGMA foreign_key_check`; thêm rollback assertion khi transaction forced fail sau partial writes. Giữ device diagnostic làm release gate.
- **Owner:** TASK-06 implementation owner.
- **Dependencies:** Real-SQLite test harness trong CI (Node 22 `node:sqlite` hoặc drizzle-compatible SQLite driver).
- **Verification:** Test fail trên pre-`cfc95c2` order, pass trên current order; CI chạy test.

### F-04 — Không có integration test boot production finance composition root

- **ID:** F-04
- **Severity:** **MEDIUM**
- **Type:** Test architecture gap
- **Requirement:** Project Definition of Done; TASK-03 offline/end-to-end operation
- **Task:** TASK-00/03
- **Files:**
  - `src/infrastructure/finance-runtime.ts`
  - Các service test dưới `src/tests/` và `src/application/**/*.test.ts`
- **Evidence:** Không test nào import/gọi `createFinanceRuntime`; mọi service test tự construct dependencies. Điều này cho phép F-01 lọt CI.
- **Actual:** CI verify isolated services nhưng không verify shipped dependency graph.
- **Expected:** Ít nhất một test exercise runtime composition và một real user flow qua đó.
- **Impact:** Dependency-injection omission có thể reach production mà không bị phát hiện.
- **Recommendation:** Thêm `finance-runtime.test.ts` tạo runtime với test adapters và exercise income, expense, transfer, history. Ưu tiên real SQLite + migrations thay vì mock.
- **Owner:** TASK-03 owner với CI/test owner.
- **Dependencies:** F-01 fix; suitable test database harness.
- **Verification:** Test fail với runtime hiện tại, pass sau category injection.

### F-05 — History account filter chỉ trả matching journal line

- **ID:** F-05
- **Severity:** **LOW**
- **Type:** Functional/UI correctness
- **Requirement:** TASK-03 §2.6 — detail displays related accounts và reversal link
- **Task:** TASK-03
- **Files:**
  - `src/infrastructure/database/finance-read-repository.ts:33-49`
  - `src/application/finance/transaction-history-service.ts:21-31`
  - `src/presentation/screens/HistoryScreen.tsx:223-245`
- **Evidence:** Khi có `accountId`, query filter `journalLines.accountId` trước khi grouping. Chỉ matching line được trả. UI render `item.lines` và check reversal existence chỉ trong filtered result.
- **Actual:** Filter theo một account ẩn account khác trên cùng entry; entry đã reversed có thể vẫn hiện “reverse” nếu reversal nằm ngoài filtered result.
- **Expected:** Filter chọn matching entries nhưng detail hiển thị tất cả lines của entry và reversal status chính xác.
- **Impact:** Transaction detail không đầy đủ và reversal affordance gây nhầm lẫn trong workflow bắt buộc của TASK-03.
- **Recommendation:** Chọn matching entry IDs trước, sau đó fetch all lines; hoặc dùng `EXISTS` subquery cho account filter trong khi join all lines. Thêm test two-line transfer filtered by one account và assert cả hai lines. Resolve reversal status từ unfiltered entry relation.
- **Owner:** TASK-03 implementation owner.
- **Dependencies:** None.
- **Verification:** New history query test và filtered History screen check.

### F-06 — Shipped key lifecycle bị duplicate và chỉ spike helper được test

- **ID:** F-06
- **Severity:** **LOW**
- **Type:** Verification gap / maintainability
- **Requirement:** TASK-00 key lifecycle, fail-closed behavior
- **Task:** TASK-00
- **Files:**
  - `src/infrastructure/database/database.ts:43-63`
  - `src/infrastructure/database/spike/key-lifecycle.ts:1-43`
  - `src/tests/key-lifecycle.test.ts:2-4`
- **Evidence:** Production và spike implement resolver riêng. Tests import spike module. Production resolver không validate generated key bằng `RAW_KEY_PATTERN`, trong khi spike có.
- **Actual:** Unit tests không chạy shipped resolver; generated-key validation khác nhau.
- **Expected:** Một tested key-lifecycle implementation dùng chung cho production và diagnostics.
- **Impact:** Hiện thấp vì `Crypto.getRandomBytesAsync(32)` thường tạo valid 64-char lowercase hex key. Rủi ro là future divergence và false confidence vào TASK-00 unit coverage.
- **Recommendation:** Extract resolver thành shared pure module dùng bởi production và spike; validate generated keys; add tests cho shared implementation. Giữ device missing-key recovery làm residual risk riêng.
- **Owner:** TASK-00 implementation owner.
- **Dependencies:** None.
- **Verification:** Production resolver được test import; generated-key validation test; behavior giống nhau giữa spike và runtime.

---

## Remediation plan

| Priority | Finding | Action | Acceptance gate |
|---|---|---|---|
| **P0** | F-01 | Inject `categories` vào production `AccountingService`; thêm runtime composition test; chạy lại Android Quick Income/Expense và categorized reversal | Test fail trước fix, pass sau fix; journal rows posted trên device |
| **P1** | F-02 | Thêm migration `0011` recreate hai currency triggers; thêm migration regression test | Trigger present trên fresh/upgraded DB; mutation bị reject |
| **P1** | F-03 | Thêm real-SQLite payment regression test với FK check và rollback assertion | Test fail trên old write order, pass trên current order; CI green |
| **P2** | F-04 | Thêm `finance-runtime` integration test | Runtime composition được exercise end-to-end |
| **P2** | F-05 | Fix history filter trả all lines của matching entries; fix reversal status lookup | Two-line entry filtered by one account trả cả hai lines |
| **P3** | F-06 | Extract shared key-lifecycle module; test generated-key validation | Production và spike dùng chung tested code |

**Thứ tự thực hiện đề xuất:** F-01 trước vì block core product. F-02 tiếp theo vì restore schema invariant. F-03/F-04 đóng hai test gap đã cho phép critical regression lọt qua. F-05/F-06 theo sau như quality work.

---

## Kết luận cuối cùng

### TASK-00 → TASK-06 tổng thể: **NO-GO**

Repository chưa sẵn sàng để tuyên bố hoàn tất hoặc release-ready vì:

1. **F-01 là critical production defect:** Quick Income, Quick Expense và categorized reversal fail deterministic qua shipped runtime, dù TASK-03 acceptance record ghi pass.
2. **F-02 là high-severity schema regression:** currency identity/precision immutability không còn được enforce sau migration `0004`.
3. **F-03 và F-04 là material verification gaps:** TASK-06 FK fix chỉ có device evidence; không có test nào exercise production dependency graph.

### Riêng TASK-06 / PR #8: **CONDITIONAL GO**

Diff TASK-06 không phải nguyên nhân của NO-GO cấp dự án. TASK-06 có vẻ đúng chức năng sau `cfc95c2`, và device acceptance đáng tin cho source đã test. Chỉ merge sau khi:

- F-03 được cover bởi automated real-SQLite regression test, hoặc có CI gate tương đương.
- Owner chấp nhận rõ F-01 và F-02 là lỗi có sẵn trên `main`, sẽ remediate riêng.

---

## Remediation closeout — F-01 → F-06 (PR #9)

**Ngày:** 2026-11-04  
**Branch:** `remediation/audit-00-06`  
**Base/remote HEAD được fetch:** `848ad77c76d30878e80791efb487d49752dcc550`  
**PR:** #9, không merge. Không chuyển sang TASK-07.

Phần audit phía trên ghi nhận trạng thái trước remediation; các kết luận NO-GO ở đó là lịch sử của baseline, không phải trạng thái hiện tại của source. Remote được fetch và kiểm tra; các commit remediation đã có trên remote được giữ nguyên:

| Finding | Commit triển khai trên branch |
|---|---|
| F-01 | `998a34b` — inject CategoryRepository vào production accounting runtime |
| F-02 | `39bb6d5` — khôi phục currency triggers trong migration 0004 |
| F-05 | `9fa2e48` — account-filtered history giữ đủ journal lines |
| F-06 | `895270e`, `061db02`, `c282eb2`, `848ad77` — lifecycle dùng chung, test module production và bỏ spike resolver trùng |

### Kết quả theo finding

| Finding | Trạng thái nghiệm thu | Thay đổi / bằng chứng |
|---|---|---|
| F-01 | **Implementation + automated integration PASS; device acceptance PENDING** | `finance-runtime.ts` giữ injection `categories: categoryRepository`. `finance-runtime.integration.test.ts` khởi tạo `createFinanceRuntime()` trên SQLite/migrations thật, ghi Quick Income, Quick Expense và categorized reversal; kiểm tra posted entries, journal lines, category linkage, reversal và balance. Test gọi composition root nên bỏ injection làm fail. Native route đã được thêm nhưng chưa chạy được trên thiết bị. |
| F-02 | **Migration implementation + fresh/upgrade database tests PASS; requested device DB reset PENDING** | Migration 0004 trên remote tạo lại hai trigger. `currency-migration.integration.test.ts` áp dụng toàn bộ migration chain vào SQLite mới, xác nhận `sqlite_master`, từ chối đổi currency code/precision sau reference và `foreign_key_check=[]`. Test upgrade chạy migrations 0000–0003 rồi 0004–0010 và kiểm tra cùng invariants. Không xóa migration source/history. Development DB trên thiết bị chưa reset được. |
| F-03 | **FIXED — automated acceptance PASS** | `liability-repository.integration.test.ts` dùng SQLite thật và migrations thật, không mock `commitPayment`. Early principal repayment xác nhận replacement installments được lưu trước các schedule audit references, payment/journal đầy đủ, outstanding và scheduled principal đều reconcile về 80,000, FK check rỗng. Probe ghi audit row trước installment bị immediate FK reject, tái hiện lỗi của thứ tự cũ. Trigger gây lỗi ở bước ghi liability balance xác nhận toàn bộ journal/payment/installment/audit writes rollback. |
| F-04 | **FIXED — automated integration PASS** | Cùng `finance-runtime.integration.test.ts` boot production composition root thay vì tự dựng AccountingService. Test cover income/expense/reversal và balances. |
| F-05 | **FIXED — automated repository integration PASS** | `finance-history-repository.integration.test.ts` tạo transfer/reversal có hai account, lọc theo một account và kiểm tra detail vẫn trả cả hai journal lines cùng reversal relation/status. Chạy correlated EXISTS query qua Drizzle/SQLite thật. |
| F-06 | **FIXED — shared production module and lifecycle tests PASS** | Production database và spike diagnostics import `src/infrastructure/database/key-lifecycle.ts`; không còn resolver duplicate. `key-lifecycle.test.ts` cover valid stored, missing key + existing DB, invalid stored, valid generated và invalid generated; trường hợp generated invalid xác nhận SecureStore không được ghi. |

### Verification, CI và device

Chuỗi chạy tuần tự trên working tree hiện tại:

1. `npm ci` — PASS (1355 packages installed; npm báo 45 dependency audit findings: 1 low, 44 moderate; không tự ý nâng dependency ngoài remediation).
2. `npm run typecheck` — PASS.
3. `npm run lint` — PASS.
4. `npm run format:check` — PASS.
5. `npm test` — PASS, **21 suites / 123 tests**; Jest giới hạn `roots` về `src` để test discovery không bị các worktree/dev artifact ngoài source làm nhiễu.

CI run **#715**, run ID `41792371045`, PR #9, SHA `848ad77c76d30878e80791efb487d49752dcc550`: **FAIL** tại Typecheck; lint, format và unit tests bị skip. Local typecheck ban đầu tái hiện các lỗi stale import `./key-lifecycle` trong hai spike diagnostics; import đã được sửa thành `../key-lifecycle`. Không có CI run mới cho working tree sau remediation vì thay đổi local chưa được push; do đó không claim GitHub CI green.

SQLite repository tests chạy cùng production Drizzle migration bundle. Fresh DB test áp dụng toàn bộ journal entries; upgrade test đi qua migration 0004 và kiểm tra trigger trước/sau. Cả hai xác nhận trigger, mutation rejection và foreign key integrity. Đây là test database ephemeral thật, không phải mock.

Native Android: `npx expo run:android --no-bundler` **BUILD SUCCESSFUL** trên cấu hình `arm64-v8a`. Chưa đạt device acceptance: app không tải JavaScript bundle do timeout tới `10.137.0.11:8081`; sau khi thử ADB reverse tunnel, màn hình vẫn chưa hiển thị route/test result. `run-as com.anonymous.fintech` cũng thất bại với `/data has wrong owner`. Vì vậy production development DB **chưa reset**, migration trên DB đó chưa được kiểm tra độc lập trong lần này, và Quick Income/Expense/reversal chưa được xác nhận trên device. Không đánh dấu device PASS. Chỉ build không được tính là acceptance.

### Working tree handoff

Các test/harness, development acceptance route và typecheck import fixes hiện là thay đổi local chưa commit trên `848ad77`; remote commit HEAD không bị ghi đè. Source diff gồm `finance-runtime.ts`, hai spike import paths, Jest root config, integration tests/helpers, lifecycle regression tests, `remediation-acceptance.tsx`, `remediation-acceptance-diagnostic.ts`, `AppScreen.tsx`, và report này. PR không merge.

**Kết luận nghiệm thu:** F-03, F-04, F-05, F-06 có implementation và automated evidence đủ; F-01/F-02 đã pass automated source/migration tests nhưng các acceptance điều kiện native trên DB development chưa thực hiện được. Do yêu cầu bắt buộc reset/kiểm tra development DB và chạy native flow, không thể tuyên bố toàn bộ F-01 → F-06 đã nghiệm thu xong. Giữ F-01/F-02 ở trạng thái pending device/database verification cho tới khi route chạy được trên thiết bị; không chuyển TASK-07.

PR #8 vẫn chưa merge. Không task status hoặc roadmap checkbox nào bị thay đổi bởi audit này.

**Audit dừng tại đây. Chưa implement remediation. Cần approval rõ ràng trước khi sửa code.**
