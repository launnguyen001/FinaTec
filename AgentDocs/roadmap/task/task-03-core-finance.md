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

- Vòng đời Account: ACTIVE → ARCHIVED; không có thao tác hard-delete.
- Account archive vẫn xuất hiện trong lịch sử, chi tiết giao dịch và truy vấn lịch sử số dư.
- Account archive không được chọn cho giao dịch thông thường mới.
- Cho phép tất toán/điều chỉnh Account archive thông qua Application use case chuyên biệt, có kiểm soát theo mục 5. Không cho phép UI/caller tự bật cờ bỏ qua archive validation.
- Số dư đầu kỳ phải được ghi bằng Opening Balance Journal Entry qua AccountingService.createOpeningBalance; không có số dư khởi tạo lưu trực tiếp trên Account.
- Account và offset EQUITY tuân theo giới hạn cùng currency hiện tại của TASK-02.

### 2.3 Giao dịch thu, chi và chuyển tiền

Cung cấp Application use case riêng cho:
- Income.
- Expense.
- Internal transfer.
- Opening balance.
- Reversal và tạo giao dịch thay thế.
- Archived-account settlement/adjustment.
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

### 5.1 Archived-account settlement — policy extension của TASK-02

**Xung đột đã xác định:** TASK-02 hiện từ chối mọi posting vào Account archive, trong khi scope được duyệt yêu cầu tất toán/điều chỉnh có kiểm soát.

Đây là thay đổi có chủ đích đối với policy TASK-02, không được bỏ qua hoặc xử lý bằng bypass ở UI/Repository.

Yêu cầu:
- Mặc định Account archive vẫn bị từ chối trong giao dịch thông thường.
- Chỉ Application use case chuyên biệt được phép yêu cầu posting có purpose ARCHIVED_ACCOUNT_SETTLEMENT hoặc ARCHIVED_ACCOUNT_ADJUSTMENT; reversal chạm Account archive dùng ARCHIVED_ACCOUNT_REVERSAL.
- Reversal của giao dịch cũ liên quan Account archive phải qua luồng reversal chuyên biệt và giữ audit link.
- Domain/Accounting Engine kiểm tra purpose, command type, Account archive liên quan và điều kiện tất toán. Caller không được truyền boolean allowArchived tùy ý.
- Ghi reason/audit metadata và idempotency key.
- Không cho phép giao dịch thu/chi/chuyển tiền thông thường mới trên Account archive.
- Cập nhật AgentDocs/accounting-rules.md và task02 policy note/kiến trúc tương ứng; giữ invariant cân bằng, atomicity, immutability và idempotency.
- Có test hợp lệ và test từ chối.

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
4. Archived account: settlement/adjustment chuyên biệt theo mục 5.1.
5. History: list/detail/filter by date range, category, account.
6. Dashboard: available balances grouped by currency, income, expense, net flow theo kỳ.

Mọi command ghi dữ liệu phải có Domain/Application validation, idempotency key ổn định, Repository transaction phù hợp và kết quả truy vết được tới Journal Entry. Lỗi Domain/Infrastructure phải được ánh xạ thành thông báo dễ hiểu ở Presentation.

## 8. Kế hoạch triển khai

1. Đọc Core, schema TASK-01, accounting rules TASK-02, code và design system.
2. Thiết kế ERD/schema delta cho Category, Account subtype, Journal Entry metadata; xác định migration/backfill.
3. Cập nhật policy TASK-02 cho archived-account settlement/reversal theo mục 5.1. Không triển khai use case trước khi validator và repository contract nhất quán.
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
- Account archive bị từ chối ở use case thông thường; settlement/adjustment chỉ qua use case chuyên biệt; command không đủ điều kiện bị từ chối.
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
- [ ] Archived Account chỉ tất toán/điều chỉnh qua policy và use case chuyên biệt đã kiểm thử.
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
- **Done:** Archived Account policy: ordinary posting tiếp tục bị chặn; settlement chỉ chuyển số dư dương từ một archived ASSET sang một active ASSET cùng currency, yêu cầu audit reason; archived reversal yêu cầu reason và mirror chính xác bút toán gốc. Repository revalidate trong transaction.
- **Done:** Dashboard query/service tổng hợp available balance, income, expense và net flow theo native currency; history query/service lọc occurredAt, Category và Account.
- **Done:** UI khung sản phẩm cho Dashboard, Account, Category, Quick Expense, Quick Income, Transfer (có FX snapshot), Opening Balance, History/reversal và archived-account settlement; có base-currency setup, empty/error/loading states và điều hướng.
- **Done:** Unit tests được bổ sung cho AccountService, CategoryService, income/expense, Dashboard multi-currency và archived-account settlement/reversal.
- **Doing:** Hoàn thiện UI chỉnh sửa Account/Category và luồng tạo giao dịch thay thế có liên kết; bổ sung repository integration tests cho migration/SQLite và kiểm thử UI/accessibility trên thiết bị.
- **Next:** Chạy TypeScript, ESLint, Prettier, Jest; bổ sung migration v1→v2 integration test trên Expo SQLite; sau đó Android offline regression và kiểm tra responsive/accessibility.
- **Issues:** Không có quyền thực thi package scripts trên môi trường làm việc hiện tại; clone GitHub thất bại do môi trường không phân giải được github.com. Vì vậy chưa có bằng chứng `typecheck`, `lint`, `format:check`, Jest hoặc Android acceptance pass. Migration SQL đã được smoke-test thủ công bằng SQLite, bao gồm subtype CHECK, category parent-kind/cycle và account hard-delete trigger; chưa chạy trên database thiết bị thật.
- **Verification:** Các thay đổi được ghi trên branch `task/03-core-finance`; chưa merge vào `main`, chưa đánh dấu TASK-03 DONE.
