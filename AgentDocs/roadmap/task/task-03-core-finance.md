# TASK-03 — Tài chính cốt lõi

- **Giai đoạn:** 2 — MVP 1
- **Ưu tiên:** P0
- **Trạng thái:** IN_PROGRESS — triển khai trên branch `task/03-core-finance`
- **Phụ thuộc:** TASK-02 (DONE; cần mở rộng có kiểm soát policy posting theo mục 5)
- **Scope được duyệt:** 2026-11-03

## 1. Mục tiêu

Hoàn thiện nghiệp vụ quản lý tiền hằng ngày: Account, Category, số dư đầu kỳ, thu, chi, chuyển tiền, lịch sử giao dịch, Quick Entry và Dashboard dòng tiền.

Người dùng thao tác bằng ngôn ngữ tài chính thông thường. Mọi biến động tiền phải đi qua Application use case và Accounting Engine. Presentation không tự định khoản, ghi journal tables hoặc cập nhật số dư.

## 2. Phạm vi được duyệt

### 2.1 Account và Category

**Account**
- Tạo, xem, cập nhật metadata và archive tài khoản.
- Account đã tạo không được hard-delete, kể cả khi chưa có giao dịch.
- Giữ nguyên Account.type hiện tại: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE.
- Account loại ASSET có subtype: CASH, BANK, EWALLET, SAVINGS, OTHER. Danh sách có thể mở rộng ở task sau bằng migration; không tạo Account.type mới để biểu diễn nguồn tiền.
- subtype chỉ áp dụng cho ASSET; các loại Account khác để null.
- subtype chỉ phân loại nguồn tiền, không phải Asset record hoặc nguồn số dư riêng. Nếu TASK-04 tạo hồ sơ Asset liên kết Account, số dư kinh tế chỉ được tính một lần theo mapping/reconciliation của Core.
- Không lưu số dư trực tiếp trên Account. Số dư luôn suy ra từ journal lines thuộc Journal Entry POSTED.

**Category**
- Tạo bảng categories riêng, độc lập với accounts.
- Có cấu trúc cha–con bằng parent_id.
- kind của Category là INCOME hoặc EXPENSE.
- Một Journal Entry có tối đa một Category; category_id được phép null.
- Giao dịch thu dùng Category INCOME; giao dịch chi dùng Category EXPENSE.
- Chuyển tiền nội bộ và Opening Balance không có Category.
- Account là đối tượng kế toán; Category là nhãn phân loại nghiệp vụ. Không dùng Account INCOME/EXPENSE để thay Category.
- Category đã được tham chiếu không hard-delete; chỉ archive để ngừng chọn cho giao dịch mới và giữ lịch sử.
- Không cho phép tự làm cha, tạo chu trình phân cấp hoặc tạo Category con khác kind với cha.
- Được đổi tên mà không làm thay đổi lịch sử. Không đổi kind sau khi Category đã được sử dụng.

### 2.2 Vòng đời Account và số dư đầu kỳ

- Vòng đời Account: ACTIVE ↔ ARCHIVED; không có thao tác hard-delete. Bổ sung use case `restoreAccount()` để khôi phục Account đã archive.
- Chỉ được archive Account khi số dư Ledger hiện tại bằng chính xác 0 theo native currency của Account. Số dư phải được tính từ Journal Entry POSTED, không dùng số dư cache hoặc giá trị do UI truyền lên.
- Nếu số dư khác 0 (dương hoặc âm), từ chối archive. Người dùng phải đưa số dư về 0 bằng các giao dịch hợp lệ khi Account còn ACTIVE.
- Archive phải kiểm tra số dư và cập nhật trạng thái trong một transaction/critical section có tính nguyên tử để không xảy ra race với posting đồng thời.
- Account archive vẫn xuất hiện trong lịch sử, chi tiết giao dịch và truy vấn lịch sử số dư.
- Account archive bị cấm tham gia mọi posting mới, không có ngoại lệ theo posting purpose. Muốn giao dịch liên quan Account này, người dùng phải Restore trước.
- Số dư đầu kỳ phải được ghi bằng Opening Balance Journal Entry qua AccountingService.createOpeningBalance; không có số dư khởi tạo lưu trực tiếp trên Account.
- Account và offset EQUITY tuân theo giới hạn cùng currency hiện tại của TASK-02.

### 2.3 Giao dịch thu, chi và chuyển tiền

Cung cấp Application use case riêng cho:
- Income.
- Expense.
- Internal transfer.
- Opening balance.
- Reversal và tạo giao dịch thay thế.
- Truy vấn lịch sử, chi tiết, số dư Account và Dashboard.

Các use case nghiệp vụ dùng chung Accounting Engine. Không tạo cơ chế ghi sổ thứ hai.

Quy tắc:
- Người dùng không nhập DEBIT/CREDIT.
- Transfer chỉ giữa hai Account ASSET, không phải INCOME hoặc EXPENSE.
- Mọi Journal Entry POSTED phải cân bằng theo invariant TASK-02.
- Giao dịch POSTED không được sửa/xóa trực tiếp.
- Điều chỉnh giao dịch POSTED: tạo reversal liên kết entry gốc, sau đó tạo entry thay thế nếu cần.
- occurredAt là mốc thời gian nghiệp vụ dùng cho lịch sử và báo cáo. createdAt/postedAt vẫn được giữ để audit và phân biệt thời điểm nhập với thời điểm ghi sổ.
- Báo cáo thu/chi dùng occurredAt, không dùng postedAt làm ngày phát sinh.
- Reversal giữ liên kết tới entry gốc và kế thừa Category để truy vết. Báo cáo thu/chi phải tính ảnh hưởng ròng của posting và reversal, không đếm reversal thành khoản thu/chi độc lập gây sai tổng.

### 2.4 Quick Entry

- Khoản chi thông thường phải hoàn tất trong tối đa 3 thao tác người dùng sau khi mở luồng Quick Expense.
- Luồng mặc định ưu tiên nhập số tiền, dùng Account/Category gần nhất hoặc mặc định hợp lệ, sau đó lưu.
- Không hy sinh tính chính xác: trước khi lưu phải xác định amount, Account nguồn và Category EXPENSE hợp lệ.
- Có thể mở rộng form để đổi Account, Category, ngày phát sinh hoặc mô tả; các trường mở rộng không làm tăng thao tác của luồng mặc định.

### 2.5 Dashboard

Dashboard TASK-03 chỉ gồm:
- Tiền khả dụng.
- Tổng thu.
- Tổng chi.
- Dòng tiền ròng = tổng thu − tổng chi.

Quy tắc:
- Tiền khả dụng là tổng số dư của tất cả Account type ASSET đang ACTIVE; không chỉ CASH/BANK/EWALLET.
- Account archive không được tính vào tiền khả dụng hiện tại.
- Số dư ASSET lấy từ posted journal lines; không đọc số dư lưu trực tiếp nếu chưa có cơ chế bảo đảm nhất quán.
- Tổng thu/chi là ảnh hưởng của journal lines thuộc Account INCOME/EXPENSE trong khoảng ngày được chọn, dựa trên occurredAt.
- Dòng tiền ròng = tổng thu trừ tổng chi trong cùng khoảng thời gian.
- Transfer không được tính vào tổng thu hoặc tổng chi.
- Reversal và replacement được phản ánh theo ảnh hưởng ròng của Ledger.
- Khoảng thời gian mặc định là tháng hiện tại; query Dashboard nhận khoảng ngày rõ ràng.

**Đa tiền tệ:**
- TASK-02 trả số dư theo native currency. Không cộng trực tiếp VND, USD hoặc currency khác thành một scalar total không có đơn vị.
- Tiền khả dụng phải tổng hợp/hiển thị riêng theo từng currency.
- Chỉ hiển thị tổng quy đổi sang base currency khi có FX quote báo cáo hợp lệ. Nếu thiếu tỷ giá, hiển thị phần chưa quy đổi; không tự giả định tỷ giá.
- TASK-03 không triển khai FX market feed, FX revaluation hoặc FX gain/loss. Đây là phạm vi ngoài task.

### 2.6 Lịch sử giao dịch

- Hiển thị theo occurredAt, mới nhất trước.
- Bộ lọc bắt buộc: khoảng ngày, Category, Account.
- Chi tiết hiển thị amount, description, occurredAt, createdAt/postedAt, Category, Account liên quan, trạng thái và reversal link.
- Giao dịch liên quan tới Account/Category đã archive vẫn xem được.
- Không sửa trực tiếp Journal Entry POSTED; điều chỉnh bằng reversal/replacement.

### 2.7 UI và UX

- UI hoàn chỉnh theo design system hiện có; không dừng ở wireframe hoặc màn hình demo.
- Responsive trên kích thước màn hình Android/iOS mục tiêu.
- Accessibility cho luồng chính: label cho control, focus order hợp lý, tương phản màu, trạng thái không chỉ biểu đạt bằng màu, touch target đủ lớn, hỗ trợ font scale và screen reader.
- Có loading, empty, error, validation và success states.
- Không yêu cầu người dùng hiểu DEBIT/CREDIT.
- Kiểm tra và tái sử dụng design tokens/components hiện có; ghi rõ nếu phải mở rộng design system.

## 3. Ngoài phạm vi

- Asset, Asset Lot, cost basis, market price, P&L: TASK-04.
- Interest plan/accrual/staking: TASK-05.
- Liability và repayment schedule: TASK-06.
- Recurring transaction và budget: TASK-07.
- Báo cáo nâng cao, net-worth snapshot, FX reporting và reconciliation nâng cao: TASK-08.
- PIN, biometric, encrypted backup/restore và release hardening: task bảo mật/phát hành tương ứng.
- Kết nối ngân hàng, tự động lấy giao dịch hoặc thực hiện thanh toán thật.

## 4. Bối cảnh kiến trúc hiện tại

### 4.1 TASK-01 — Database Foundation

Schema version 1 hiện có currencies, ledger_settings, accounts, journal_entries, journal_lines.

Invariant cần giữ:
- Account cố định currency; journal line phải cùng currency với Account.
- Journal Entry có occurred_at, created_at, posted_at, status, base currency snapshot, idempotency key và reversal link.
- Posted entries/lines bất biến.
- Foreign keys dùng RESTRICT.
- Không có account balance column.
- Schema chưa có Category, Account subtype hoặc transaction kind.

### 4.2 TASK-02 — Accounting Engine

Tái sử dụng:
- src/domain/ledger/posting.ts
- src/domain/ledger/posting-plan.ts
- src/application/ledger/accounting-service.ts
- src/infrastructure/database/sqlite-ledger-repository.ts

AccountingService đã có các use case nền: draft/post, opening balance, internal transfer, reversal và balance lookup.

Không được:
- Ghi trực tiếp journal tables từ Presentation.
- Bỏ qua Domain validator hoặc Repository transaction.
- Sửa/xóa posted history.
- Thêm nguồn số dư độc lập trên Account.
- Tạo logic thu/chi tách rời khỏi Ledger.

### 4.3 Presentation

App hiện mới ở mức khung/skeleton và diagnostic/acceptance screens. TASK-03 phải xây luồng sản phẩm thực tế, không coi diagnostic screen là UI hoàn thành. Kiểm tra route, component, theme token và provider trước khi thay đổi; không xóa acceptance workflow nếu chưa có phương án thay thế.

## 5. Hai điểm kiến trúc bắt buộc xử lý

### 5.1 Archived Account — strict zero-balance lifecycle policy

**Quyết định scope:** TASK-02 từ chối posting vào Account Archived và TASK-03 giữ nguyên invariant này. Không mở rộng Accounting Engine bằng settlement/adjustment/reversal exception.

Yêu cầu bắt buộc:
- `archiveAccount()` chỉ thành công khi số dư Ledger của Account bằng chính xác 0 theo native currency. Balance phải được tính từ các Journal Entry POSTED.
- Từ chối archive khi số dư dương hoặc âm; không tự tạo bút toán, không tự chuyển tiền và không tự điều chỉnh số dư trong quá trình archive.
- Kiểm tra zero-balance và cập nhật `is_archived` phải nguyên tử với các thao tác ghi sổ để ngăn race condition. Repository phải bảo đảm không có posting mới lọt vào giữa bước kiểm tra balance và archive.
- Bổ sung `restoreAccount()` để chuyển ARCHIVED → ACTIVE. Restore không tạo Journal Entry và không thay đổi số dư/lịch sử.
- Mọi posting mới đều từ chối nếu có bất kỳ line nào tham chiếu Account Archived, bất kể transaction kind hoặc posting purpose; bao gồm INCOME, EXPENSE, TRANSFER, OPENING_BALANCE, ADJUSTMENT và REVERSAL.
- Nếu cần reversal một entry cũ có tham chiếu Account Archived, người dùng phải Restore Account liên quan trước, sau đó mới thực hiện reversal qua luồng AccountingService thông thường.
- Không dùng `allowedArchivedAccountIds`, `allowArchived`, `ARCHIVED_ACCOUNT_SETTLEMENT`, `ARCHIVED_ACCOUNT_ADJUSTMENT` hoặc `ARCHIVED_ACCOUNT_REVERSAL` để vượt qua policy. Loại bỏ các nhánh exception đã thêm riêng cho TASK-03 khỏi implementation và persisted purpose model nếu chưa phát hành migration ra người dùng; nếu đã phát hành schema v2 thì migration tiếp theo phải xử lý tương thích, không sửa migration đã chạy.
- Giữ nguyên immutability, balancing, atomicity, idempotency và audit trace của TASK-02.
- Có unit và repository integration tests cho zero-balance archive, non-zero archive rejection, restore, archived posting rejection và race/atomicity.

### 5.2 Dashboard đa tiền tệ

**Xung đột đã xác định:** không thể cộng native balance nhiều currency thành một scalar total có ý nghĩa.

Cách đáp ứng scope là tổng hợp theo từng currency; tổng quy đổi base currency là thông tin bổ sung có điều kiện, không phải điều kiện để TASK-03 hoạt động. Không kéo FX provider hoặc FX revaluation vào task này.

## 6. Data changes và migration strategy

TASK-03 được phép tái cấu trúc schema khi có lý do, nhưng phải bảo toàn dữ liệu. Không sửa migration TASK-01 đã phát hành theo cách làm mất khả năng nâng cấp database hiện hữu.

Schema delta dự kiến, xác nhận lại trong migration design:
- Thêm accounts.subtype, chỉ áp dụng cho ASSET.
- Tạo categories với ID, name, kind, parent reference, archive state và timestamps.
- Thêm journal_entries.category_id nullable, FK tới Category.
- Thêm transaction kind cho Journal Entry để phân biệt nghiệp vụ: INCOME, EXPENSE, TRANSFER, OPENING_BALANCE, ADJUSTMENT, REVERSAL; có LEGACY cho dữ liệu cũ không thể phân loại chắc chắn.
- Thêm posting_purpose và audit_reason để lưu lý do kiểm toán cho settlement/reversal chạm Account archive.
- Index cho Category hierarchy, account subtype/archive, occurredAt và history filters.
- Bổ sung FK/check/unique constraints phù hợp; invariant không biểu diễn được bằng SQL phải validate ở Domain/Application.

Migration rules:
- Tạo migration version mới; không viết lại 0000_ledger_foundation.ts đã chạy trên database người dùng.
- Test nâng cấp schema version 1 lên version mới với database rỗng và database có ledger history.
- Không tự gán Category hoặc transaction kind sai cho dữ liệu lịch sử. Nếu không thể suy luận an toàn, giữ Category null và kind LEGACY; dữ liệu cũ vẫn đọc được.
- Account ASSET hiện hữu backfill subtype OTHER nếu không có nguồn dữ liệu đáng tin cậy để suy luận; Account không phải ASSET giữ subtype null.
- Bảo toàn IDs, journal lines, FX snapshots, idempotency keys, reversal links, timestamps và posted state.
- Không drop/recreate ledger tables theo cách làm mất dữ liệu. Nếu buộc rebuild do giới hạn SQLite, dùng migration transaction, copy/verify row counts và invariant trước khi swap.
- Migration lỗi phải rollback an toàn; không plaintext fallback, không xóa database hoặc tái tạo key.

Sau khi schema được duyệt, cập nhật đồng bộ AgentDocs/database-schema.md, AgentDocs/data-dictionary.md, migration registry, Drizzle schema và repository contracts/adapters bị ảnh hưởng.

## 7. Application và Domain deliverables

Nhóm use case/repository:
1. Account: create, update metadata, archive, list/detail, balance query.
2. Category: create, rename, reparent, archive, list/tree query; validate kind và cycle.
3. Transaction: income, expense, internal transfer, opening balance, reversal/replacement.
4. Account lifecycle: archive chỉ khi Ledger balance = 0; restore để cho phép sử dụng lại.
5. History: list/detail/filter by date range, category, account.
6. Dashboard: available balances grouped by currency, income, expense, net flow theo kỳ.

Mọi command ghi dữ liệu phải có Domain/Application validation, idempotency key ổn định, Repository transaction phù hợp và kết quả truy vết được tới Journal Entry. Lỗi Domain/Infrastructure phải được ánh xạ thành thông báo dễ hiểu ở Presentation.

## 8. Kế hoạch triển khai

1. Đọc Core, schema TASK-01, accounting rules TASK-02, code và design system.
2. Thiết kế ERD/schema delta cho Category, Account subtype, Journal Entry metadata; xác định migration/backfill.
3. Giữ nguyên policy TASK-02: mọi posting vào Account Archived đều bị từ chối; loại bỏ exception settlement/adjustment/reversal của TASK-03. Bổ sung kiểm tra zero-balance nguyên tử cho archive và use case restore.
4. Xây Category Domain/Repository/Application và Account subtype/lifecycle use cases.
5. Xây use case thu, chi, chuyển tiền, opening balance và reversal/replacement dùng Accounting Engine.
6. Xây query layer cho số dư, history và Dashboard; kiểm tra multi-currency theo mục 2.5.
7. Xây UI Account, Category, Quick Entry, transaction history/detail và Dashboard theo design system.
8. Bổ sung responsive, accessibility và đầy đủ UI states.
9. Chạy migration tests, unit/integration tests, regression và offline checks trên Android development build.
10. Cập nhật schema, dictionary, accounting rules và progress log bằng bằng chứng kiểm chứng.

## 9. Kế hoạch kiểm thử

### Domain / use case
- Tạo, cập nhật, archive Account; không có hard-delete use case.
- Chỉ ASSET có subtype; subtype không hợp lệ bị từ chối.
- Category INCOME/EXPENSE; từ chối self-parent, cycle và parent/child khác kind.
- Category đã tham chiếu không hard-delete; archive không làm mất lịch sử.
- Thu yêu cầu Category INCOME; chi yêu cầu Category EXPENSE; transfer/opening balance không có Category.
- Income/expense/transfer tạo posting qua Accounting Engine.
- Transfer không ảnh hưởng tổng thu/chi.
- Opening balance dùng đúng offset EQUITY, không ghi balance trực tiếp.
- Posted entry không sửa/xóa; reversal giữ audit trace và replacement là entry mới.
- Reversal triệt tiêu đúng ảnh hưởng thu/chi của entry gốc trong báo cáo.
- Account archive chỉ thành công khi Ledger balance bằng 0; số dư khác 0 bị từ chối. Restore cho phép sử dụng lại Account.
- Mọi posting có line tham chiếu Account Archived đều bị từ chối, bao gồm reversal; phải restore trước.
- Archive zero-balance check và state update nguyên tử, không có race với posting.
- Idempotent retry không tạo duplicate entry.

### Repository / migration integration
- Migration version 1 → version mới với database rỗng và database có ledger history.
- Bảo toàn row count, IDs, journal lines, posted state, FX snapshots, idempotency, reversal links và timestamps.
- Backfill subtype/category/kind an toàn; dữ liệu không phân loại được dùng LEGACY, không gán giả.
- Foreign key, unique constraint, archive policy và Category hierarchy.
- Atomic rollback khi migration hoặc multi-table transaction thất bại.
- Balance Account khớp posted journal lines.
- History filter chính xác theo occurredAt, Category và Account.
- Dashboard tính đúng theo từng currency; không cộng chéo currency khi thiếu FX.
- Dashboard loại transfer và phản ánh reversal theo ảnh hưởng ròng.

### Presentation / regression
- Quick Expense mặc định hoàn tất tối đa 3 thao tác.
- Loading, empty, error, validation và success states.
- Responsive trên kích thước màn hình mục tiêu.
- Accessibility: labels, focus order, contrast, touch target, font scale và screen reader cho luồng chính.
- Account/category/transaction/history/dashboard cốt lõi hoạt động offline.
- Không lộ dữ liệu tài chính trong log.
- Regression toàn bộ TASK-01/TASK-02 acceptance flows.

## 10. Tiêu chí nghiệm thu

- [ ] Quản lý Account hoạt động offline; chỉ archive, không hard-delete.
- [ ] ASSET subtype được lưu và validate đúng.
- [ ] Category độc lập Account, có cây cha–con và kind INCOME/EXPENSE.
- [ ] Journal Entry liên kết tối đa một Category; dữ liệu cũ migrate an toàn.
- [ ] Có use case riêng income, expense, transfer; cùng dùng Accounting Engine.
- [ ] Opening balance được ghi bằng Journal Entry.
- [ ] Archive Account chỉ thành công khi số dư Ledger chính xác bằng 0 theo native currency; thao tác kiểm tra và cập nhật trạng thái nguyên tử.
- [ ] Có `restoreAccount()`; restore không tạo posting và giữ nguyên lịch sử.
- [ ] Không có posting exception cho Account Archived; mọi posting, kể cả reversal, phải restore trước.
- [ ] Posted transaction chỉ điều chỉnh bằng reversal và replacement.
- [ ] Quick Expense thông thường hoàn tất tối đa 3 thao tác.
- [ ] History lọc đúng ngày, Category, Account; dùng occurredAt làm business date.
- [ ] Dashboard có tiền khả dụng, tổng thu, tổng chi, dòng tiền ròng; transfer không tính thu/chi.
- [ ] Tiền khả dụng tổng hợp theo currency; không cộng sai native currency khác nhau.
- [ ] Số dư Account khớp Ledger; không có nguồn số dư thứ hai.
- [ ] Migration từ schema version 1 bảo toàn dữ liệu và có test.
- [ ] Unit và integration tests cho repository/use case pass.
- [ ] UI hoàn chỉnh theo design system, responsive và accessibility cho luồng chính.
- [ ] Offline regression và TASK-01/TASK-02 accounting regression pass.
- [ ] Schema, data dictionary và accounting rules được cập nhật đồng bộ.

## 11. Nhật ký tiến độ

- **Done:** Chủ dự án chốt scope ngày 2026-11-03; branch `task/03-core-finance` được tạo từ `main`.
- **Done:** Migration `0001_core_finance.ts` và migration registry cho schema v2; bổ sung Category, Account subtype, transaction kind/category FK, posting purpose/audit reason, index và integrity triggers. Migration v1 không bị sửa.
- **Done:** Domain/Application/SQLite repository cho Category tree, parent-kind validation, cycle protection và archive lifecycle.
- **Done:** Account create/list/rename/update metadata/archive; ASSET subtype được validate ở Application và database migration.
- **Done:** Income/Expense use cases dùng chung AccountingService; transfer, opening balance và reversal được phân loại theo transaction kind; reversal kế thừa Category.
- **Superseded by scope decision (2026-11-03):** Loại bỏ archived-account settlement/adjustment/reversal exceptions. Account chỉ được archive khi Ledger balance chính xác bằng 0; Account Archived không tham gia bất kỳ posting mới nào; phải restore trước khi posting/reversal. Bổ sung zero-balance archive atomicity và restore vào implementation/test plan.
- **Done:** Dashboard query/service tổng hợp available balance, income, expense và net flow theo native currency; history query/service lọc occurredAt, Category và Account.
- **Done:** UI khung sản phẩm cho Dashboard, Account, Category, Quick Expense, Quick Income, Transfer (có FX snapshot), Opening Balance, History/reversal và archived-account settlement; có base-currency setup, empty/error/loading states và điều hướng.
- **Done:** Unit tests được bổ sung cho AccountService, CategoryService, income/expense, Dashboard multi-currency và archived-account settlement/reversal.
- **Doing:** Hoàn thiện UI chỉnh sửa Account/Category và luồng tạo giao dịch thay thế có liên kết; bổ sung repository integration tests cho migration/SQLite và kiểm thử UI/accessibility trên thiết bị.
- **Next:** Chạy TypeScript, ESLint, Prettier, Jest; bổ sung migration v1→v2 integration test trên Expo SQLite; sau đó Android offline regression và kiểm tra responsive/accessibility.
- **Issues:** Không có quyền thực thi package scripts trên môi trường làm việc hiện tại; clone GitHub thất bại do môi trường không phân giải được github.com. Vì vậy chưa có bằng chứng `typecheck`, `lint`, `format:check`, Jest hoặc Android acceptance pass. Migration SQL đã được smoke-test thủ công bằng SQLite, bao gồm subtype CHECK, category parent-kind/cycle và account hard-delete trigger; chưa chạy trên database thiết bị thật.
- **Verification:** Các thay đổi được ghi trên branch `task/03-core-finance`; chưa merge vào `main`, chưa đánh dấu TASK-03 DONE.
