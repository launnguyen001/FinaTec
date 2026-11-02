# KÉT SỐ --- PRODUCT & DEVELOPMENT ROADMAP

**Tài liệu:** `plan.md`\
**Phiên bản:** 1.0\
**Trạng thái:** Proposed --- chờ duyệt trước khi triển khai\
**Sản phẩm:** Két Số --- ứng dụng quản lý tài chính cá nhân\
**Nền tảng mục tiêu:** Android và iOS\
**Định hướng:** Offline-first, privacy-first, accounting-based

------------------------------------------------------------------------

## 1. Mục đích tài liệu

`plan.md` là tài liệu định hướng cấp dự án, dùng làm nguồn tham chiếu
chung cho người phát triển và AI Agent trong toàn bộ vòng đời Két Số.

Tài liệu xác định:

-   Tầm nhìn, mục tiêu và phạm vi sản phẩm.
-   Nguyên tắc kiến trúc và công nghệ.
-   Các phân hệ nghiệp vụ.
-   Thứ tự triển khai và dependency giữa các giai đoạn.
-   Milestone, tiêu chí nghiệm thu cấp giai đoạn.
-   Quy trình quản lý `task.md`, kiểm thử và cập nhật tiến độ.

Tài liệu này **không thay thế task triển khai chi tiết**. Mỗi đơn vị
công việc phải có một `task.md` riêng, mô tả phạm vi, file dự kiến tác
động, business rules, test cases và tiêu chí hoàn thành.

## 2. Product vision

Két Số là một chiếc két tài chính cá nhân trên điện thoại, giúp người
dùng quản lý tập trung:

-   Nguồn tiền và tài khoản.
-   Thu nhập, chi tiêu và chuyển tiền nội bộ.
-   Tài sản tiết kiệm và tài sản đầu tư đang nắm giữ.
-   Lãi suất, lợi tức và các khoản sinh lãi.
-   Khoản nợ và nghĩa vụ trả nợ.
-   Ngân sách, mục tiêu tiết kiệm và báo cáo tài chính.

Sản phẩm không phải ứng dụng giao dịch tài chính. Két Số ghi nhận và
phân tích tài sản do người dùng khai báo; không trực tiếp mua bán tài
sản, không kết nối ngân hàng trong phạm vi hiện tại và không cung cấp tư
vấn đầu tư.

### 2.1 Giá trị cốt lõi

1.  **Offline-first:** các chức năng quản lý tài chính cốt lõi vẫn hoạt
    động khi không có mạng.
2.  **Privacy-first:** dữ liệu tài chính được lưu cục bộ và mã hóa;
    không bắt buộc tài khoản người dùng hay máy chủ lưu dữ liệu tài
    chính.
3.  **Accounting-based:** biến động tài chính được ghi nhận bằng bút
    toán cân bằng để có thể truy vết và đối soát.
4.  **Fast entry:** thao tác ghi nhận một khoản chi thông thường hướng
    tới tối đa ba chạm.
5.  **Unified wealth view:** tổng hợp tiền, tài sản và nợ thành một bức
    tranh tài sản ròng.

### 2.2 Nguyên tắc sản phẩm

-   Giao diện đơn giản; người dùng không cần hiểu Debit/Credit.
-   Accounting Engine chịu trách nhiệm tạo bút toán phía sau các thao
    tác UI.
-   Mạng chỉ cần thiết cho dữ liệu bên ngoài như giá thị trường và tỷ
    giá.
-   Giá bên ngoài phải hiển thị thời điểm cập nhật; dữ liệu cũ phải được
    nhận diện là stale.
-   Không lưu seed phrase, private key hoặc thông tin bí mật tương đương
    của tài sản số.
-   Không gửi dữ liệu tài chính cá nhân lên dịch vụ bên ngoài.
-   Không biến thay đổi giá thị trường thành thu nhập đã thực hiện.

## 3. Phạm vi sản phẩm

### 3.1 In scope

-   Quản lý nguồn tiền/tài khoản.
-   Thu nhập, chi tiêu, chuyển khoản nội bộ.
-   Danh mục và ngân sách.
-   Tài sản, lô tài sản và giá vốn.
-   Giá thị trường và tỷ giá qua các provider có thể thay thế.
-   Lãi tiền gửi, lãi kép, staking/lợi tức theo cấu hình.
-   Khoản nợ, lịch trả nợ và thanh toán một phần/trước hạn.
-   Giao dịch định kỳ và nhắc nhở.
-   Mục tiêu tiết kiệm.
-   Báo cáo thu chi, dòng tiền, tài sản, nợ và tài sản ròng.
-   Đối soát số dư.
-   PIN, sinh trắc học, ẩn số dư.
-   Sao lưu/khôi phục mã hóa và xuất dữ liệu CSV/PDF.

### 3.2 Out of scope --- phiên bản hiện tại

-   Thực hiện lệnh mua/bán tài sản.
-   Kết nối trực tiếp tài khoản ngân hàng hoặc tự động đồng bộ giao dịch
    ngân hàng.
-   Tư vấn đầu tư, khuyến nghị mua/bán hoặc cam kết lợi nhuận.
-   Lưu trữ seed phrase/private key.
-   Máy chủ lưu trữ dữ liệu tài chính cá nhân.
-   Đồng bộ đa thiết bị trong MVP/V1.0.
-   Phân hệ cổ phiếu hoàn chỉnh trong MVP/V1.0; có thể xem xét sau V1.

### 3.3 Phân biệt dữ liệu nội bộ và dữ liệu bên ngoài

**Dữ liệu nội bộ:** tài khoản, giao dịch, tài sản, số lượng nắm giữ,
khoản nợ, lịch trả nợ, ngân sách và thông tin cá nhân. Dữ liệu này ở
trên thiết bị.

**Dữ liệu bên ngoài:** giá tài sản và tỷ giá. Chỉ gửi mã tài sản/cặp
tiền cần truy vấn; không gửi số dư, danh mục tài sản cá nhân hoặc lịch
sử giao dịch.

Nếu cần proxy để cache hoặc bảo vệ API key, proxy chỉ xử lý dữ liệu giá
công khai và không được trở thành nơi lưu dữ liệu tài chính người dùng.

## 4. Công nghệ mục tiêu

  ----------------------------------------------------------------------------
  Lớp                     Công nghệ định hướng         Ghi chú
  ----------------------- ---------------------------- -----------------------
  Mobile framework        React Native + Expo          Một codebase
                                                       Android/iOS

  Language                TypeScript                   Strict mode

  Navigation              Expo Router                  Điều hướng theo route

  Local database          SQLite + SQLCipher           Mã hóa dữ liệu cục bộ

  ORM / migration         Drizzle ORM                  Schema có kiểu và
                                                       migration

  UI state                Zustand                      Trạng thái giao diện

  Remote data/cache       TanStack Query               Giá thị trường, tỷ giá

  Monetary calculation    Integer minor units hoặc     Không dùng
                          decimal.js                   floating-point thông
                                                       thường cho phép tính
                                                       tiền

  Authentication lock     expo-local-authentication,   PIN/sinh trắc học và
                          expo-secure-store            lưu khóa phù hợp

  Charts                  Thư viện biểu đồ tương thích Chọn sau khi kiểm tra
                          React Native                 khả năng tương thích

  Notifications           Expo Notifications           Nhắc lịch và đến hạn

  Testing                 Jest/Vitest tùy mức tương    Chốt trong Foundation
                          thích, React Native Testing  
                          Library                      

  Build                   EAS Build hoặc CI macOS phù  Không phụ thuộc máy Mac
                          hợp                          cá nhân
  ----------------------------------------------------------------------------

**Lưu ý kỹ thuật:** SQLCipher và một số native module có thể yêu cầu
Expo Development Build/custom native build; không mặc định rằng Expo Go
đáp ứng được toàn bộ yêu cầu. Trước khi khóa dependency, phải kiểm tra
tương thích phiên bản Expo SDK, React Native và Drizzle.

Các thư viện cụ thể ngoài danh sách trên chỉ được bổ sung sau khi có lý
do kỹ thuật và đánh giá tương thích.

## 5. Kiến trúc hệ thống

Áp dụng kiến trúc phân lớp, giữ Domain độc lập với UI, SQLite và nhà
cung cấp dữ liệu giá.

``` text
src/
├── app/                         # Expo Router, route và layout
├── presentation/                # Screens, components, hooks, view models
├── application/                 # Use cases, orchestration, interfaces
├── domain/                      # Entities, value objects, rules, domain services
├── infrastructure/              # SQLite, repositories, providers, backup, notifications
├── shared/                      # Utilities, constants, types dùng chung
└── tests/                       # Test helpers và integration tests
```

### 5.1 Trách nhiệm từng lớp

-   **Presentation:** hiển thị dữ liệu, nhận thao tác, quản lý trạng
    thái giao diện; không chứa quy tắc kế toán.
-   **Application:** điều phối use case như `CreateExpense`,
    `TransferFunds`, `AccrueInterest`, `RepayLiability`,
    `UpdateAssetPrice`, `CreateNetWorthSnapshot`.
-   **Domain:** định nghĩa thực thể, quy tắc kế toán, tính giá vốn, tính
    lãi và lịch trả nợ; ưu tiên pure function để kiểm thử.
-   **Infrastructure:** triển khai repository SQLite, migration,
    PriceProvider, notification, backup/restore và export.

### 5.2 Luồng xử lý chuẩn

``` text
User Action
    ↓
Presentation
    ↓
Application Use Case
    ↓
Domain Rules / Domain Services
    ↓
Repository Interface
    ↓
Infrastructure Repository
    ↓
SQLite / External Price Provider
```

UI không được ghi trực tiếp vào database. Use case không được phụ thuộc
trực tiếp vào component React Native.

## 6. Nguyên tắc dữ liệu và kế toán

Đây là các nguyên tắc nền tảng. Chi tiết triển khai phải được đặc tả
thêm trong `docs/accounting-rules.md` và `docs/database-schema.md`.

1.  Mọi biến động tài chính được ghi nhận theo mô hình journal entry và
    journal line.
2.  Mỗi journal entry đã posted phải cân bằng: tổng Debit bằng tổng
    Credit trong cùng phạm vi tiền tệ/quy đổi được xác định.
3.  Ghi bút toán và các dữ liệu liên quan phải nằm trong một transaction
    SQLite nguyên tử.
4.  Không hard-delete bút toán đã posted; sửa sai bằng
    reversal/adjustment có liên kết truy vết.
5.  Chuyển tiền giữa hai tài khoản của cùng người dùng không được tính
    là thu nhập hoặc chi phí.
6.  Thay đổi giá thị trường làm thay đổi giá trị tài sản ước tính, không
    tự tạo realized income.
7.  Phân biệt rõ giá vốn, giá trị thị trường, lãi/lỗ đã thực hiện và
    lãi/lỗ chưa thực hiện.
8.  Không được tính trùng tiền trong tài khoản và tài sản. Mỗi giá trị
    kinh tế chỉ được phản ánh một lần trong tổng tài sản.
9.  Dư nợ phải có khả năng đối chiếu với các bút toán và lịch trả nợ;
    không duy trì một con số dư nợ độc lập không có cơ chế reconcile.
10. Sử dụng số học chính xác cho tiền, số lượng và tỷ giá; quy định
    precision và rounding theo từng loại tài sản/tiền tệ.
11. Giao dịch định kỳ và ghi nhận lãi phải idempotent, tránh tạo bản ghi
    trùng khi app mở lại hoặc tác vụ chạy lại.
12. Mọi giao dịch cần phân biệt thời điểm phát sinh (`occurred_at`) và
    thời điểm ghi nhận (`created_at`/`posted_at`) khi nghiệp vụ yêu cầu.

### 6.1 Mô hình dữ liệu định hướng

Các nhóm thực thể dự kiến:

-   **Currency & FX:** `CURRENCY`, `FX_RATE`.
-   **Ledger:** `ACCOUNT`, `JOURNAL_ENTRY`, `JOURNAL_LINE`.
-   **Categorization:** `CATEGORY`, `BUDGET`.
-   **Assets:** `ASSET`, `ASSET_LOT`, `PRICE_SOURCE`, `PRICE_HISTORY`.
-   **Interest:** `INTEREST_PLAN`, `INTEREST_ACCRUAL`.
-   **Liabilities:** `LIABILITY`, `REPAYMENT_SCHEDULE`.
-   **Automation & goals:** `RECURRING_RULE`, `GOAL`.
-   **Historical reporting:** `NET_WORTH_SNAPSHOT`.

Đây là danh sách định hướng, không phải schema đã khóa. Trước khi
migration đầu tiên được duyệt, phải xác định rõ khóa chính/ngoại,
cardinality, ownership, trạng thái, precision, index, uniqueness và quy
tắc xóa/lưu trữ.

## 7. Roadmap và milestone

Thời gian là ước tính lập kế hoạch cho một người phát triển có AI hỗ
trợ. Thời gian thực tế phụ thuộc độ phức tạp native module, kiểm thử tài
chính, chất lượng UX và tích hợp dữ liệu giá. Không coi thời lượng là
cam kết phát hành.

### Phase 0 --- Project Foundation

**Ước tính:** 1--2 tuần\
**Mục tiêu:** tạo nền tảng kỹ thuật ổn định trước khi xây nghiệp vụ.

Phạm vi: - Khởi tạo React Native, Expo, TypeScript và Expo Router. -
Thiết lập lint, format, type-check và test runner. - Kiểm tra khả năng
tích hợp SQLite + SQLCipher + Drizzle. - Thiết lập migration và database
initialization. - Tạo cấu trúc thư mục theo kiến trúc đã duyệt. - Xây
design tokens, typography, spacing, màu sắc và component cơ bản. - Thiết
lập logging không làm lộ dữ liệu tài chính. - Xây dựng quy trình build
Android development.

Deliverables: - App chạy trên Android development build. - Database
mở/đóng được và migration chạy được. - Có test mẫu cho domain và
application. - Có quy chuẩn code và cấu trúc thư mục.

Exit criteria: - Build thành công trên thiết bị/emulator mục tiêu. -
Migration có thể chạy từ database mới. - Có thể đóng/mở database theo cơ
chế khóa đã chọn. - Type-check, lint và test baseline chạy trong quy
trình kiểm tra.

### Phase 1 --- Database Architecture & Accounting Engine

**Ước tính:** 3--4 tuần\
**Mục tiêu:** xây lõi dữ liệu và ghi nhận tài chính chính xác.

Phạm vi: - Chốt ERD và schema nền. - Thiết kế account, journal entry và
journal line. - Xây các value object cho Money, Currency và Amount. -
Xây use case tạo bút toán và kiểm tra cân bằng. - Hỗ trợ opening balance
và internal transfer. - Xây reversal/adjustment và audit metadata. - Quy
định transaction boundary và xử lý lỗi. - Kiểm thử invariant kế toán.

Deliverables: - Database schema và migrations được duyệt. - Accounting
Engine độc lập với UI. - Repository interface và SQLite
implementation. - Bộ test domain/application cho các nghiệp vụ cốt lõi.

Exit criteria: - Không thể post journal entry mất cân bằng. - Lỗi giữa
chừng rollback toàn bộ thao tác ghi sổ. - Internal transfer không làm
thay đổi tổng tài sản ròng. - Reversal tạo được dấu vết và đảo đúng ảnh
hưởng của giao dịch gốc. - Có test cho precision, rounding và các tình
huống biên.

### Phase 2 --- MVP 1: Core Finance

**Ước tính:** 3--4 tuần\
**Mục tiêu:** người dùng quản lý được dòng tiền hàng ngày.

Phạm vi: - Quản lý nguồn tiền/tài khoản. - Số dư đầu kỳ. - Ghi nhận thu
nhập. - Ghi nhận chi tiêu. - Chuyển tiền nội bộ. - Danh mục thu/chi. -
Lịch sử giao dịch và bộ lọc thời gian. - Dashboard cơ bản: tổng tiền,
thu, chi, chênh lệch. - Quick Entry hướng tới tối đa ba chạm. - PIN/khóa
ứng dụng ở mức MVP.

Deliverables: - Luồng tạo/sửa theo quy tắc/reversal giao dịch. - Màn
hình tài khoản, giao dịch, nhập nhanh và dashboard. - Dữ liệu hiển thị
được truy xuất từ các nguồn chuẩn trong domain/ledger.

Exit criteria: - Có thể tạo và xem lại thu, chi, chuyển tiền. - Số dư
tài khoản khớp với ledger. - Chuyển khoản không bị cộng vào thu/chi. -
Các thao tác nhập nhanh không yêu cầu người dùng hiểu Debit/Credit. -
Kiểm thử hồi quy không làm sai dữ liệu đã ghi nhận.

### Phase 3 --- MVP 2: Asset & Interest Management

**Ước tính:** 3--4 tuần\
**Mục tiêu:** quản lý tài sản và phần lợi tức phát sinh.

Phạm vi: - Danh mục loại tài sản. - Khai báo tài sản và số lượng nắm
giữ. - Mua/bán tài sản theo hướng ghi nhận, không thực hiện giao dịch
thật. - Asset lot, phí giao dịch và giá vốn. - Phương pháp tính giá vốn
được chọn và công bố rõ (ví dụ weighted average hoặc FIFO). - Tính
realized/unrealized P&L. - Interest plan và interest accrual. - Lãi
đơn/lãi kép và các phương thức được hỗ trợ. - Giá thị trường qua
`PriceProvider` abstraction. - Lưu lịch sử giá, thời điểm cập nhật và
trạng thái stale. - Tài sản số offline chỉ lưu số lượng và nơi lưu trữ,
không lưu seed/private key.

Deliverables: - Asset Engine và Interest Engine. - Giao diện danh mục
tài sản, chi tiết tài sản, lot và lợi tức. - Price provider adapter đầu
tiên sau khi xác minh điều khoản, giới hạn và độ tin cậy nguồn dữ liệu.

Exit criteria: - Không thể bán vượt số lượng nắm giữ. - Giá vốn và P&L
đúng theo phương pháp đã chọn. - Phí được đưa vào giá vốn/chi phí theo
quy tắc đã định. - Interest accrual chạy lại không ghi trùng. - Giá cũ
được đánh dấu; mất mạng không làm mất khả năng xem dữ liệu đã lưu.

### Phase 4 --- MVP 3: Liability, Recurring & Budget

**Ước tính:** khoảng 3 tuần\
**Mục tiêu:** quản lý nghĩa vụ tài chính và các khoản định kỳ.

Phạm vi: - Khai báo khoản vay/nợ. - Lịch trả nợ. - Các phương thức: dư
nợ giảm dần, gốc đều, niên kim và chỉ trả lãi. - Thanh toán kỳ, trả một
phần và trả trước hạn. - Theo dõi quá hạn. - Chi phí/giao dịch định
kỳ. - Ngân sách theo danh mục và kỳ. - Nhắc lịch trả nợ, chi phí định kỳ
và đáo hạn.

Deliverables: - Liability Engine và Repayment Calculator. - Recurring
transaction processor. - Budget module và notification scheduling.

Exit criteria: - Lịch trả nợ khớp với công thức/phương thức đã cấu
hình. - Thanh toán làm giảm tiền và dư nợ đúng cách. - Không ghi nhận
trùng kỳ khi app chạy catch-up. - Các trường hợp trả một phần/trước hạn
có quy tắc và test riêng. - Ngân sách phản ánh đúng giao dịch thuộc kỳ.

### Phase 5 --- V1.0: Financial Intelligence & Data Safety

**Ước tính:** 3--4 tuần\
**Mục tiêu:** hoàn thiện bức tranh tài chính và khả năng bảo vệ dữ liệu.

Phạm vi: - Đa tiền tệ và tỷ giá. - Báo cáo thu nhập/chi phí. - Báo cáo
dòng tiền. - Báo cáo tài sản, nợ và tài sản ròng. - Snapshot tài sản
ròng theo ngày. - Đối soát số dư và bút toán điều chỉnh. - Mục tiêu tiết
kiệm. - Staking/lợi tức và các nhắc nhở liên quan trong phạm vi đã đặc
tả. - PIN, sinh trắc học, ẩn số dư và bảo vệ khi chuyển nền. - Sao
lưu/khôi phục mã hóa. - Xuất CSV/PDF. - Hoàn thiện tiếng Việt/tiếng Anh,
dark mode và accessibility cơ bản.

Deliverables: - Bộ báo cáo V1.0. - Quy trình backup/restore và export. -
Kiểm thử khôi phục trên thiết bị/cài đặt sạch. - Release candidate cho
Android; chuẩn bị kiểm thử iOS.

Exit criteria: - Tổng tài sản, tổng nợ và tài sản ròng reconcile được. -
Báo cáo dùng cùng quy tắc tính với domain, không tự tính nghiệp vụ riêng
ở UI. - Backup được mã hóa và restore thành công trong test. - Không lộ
dữ liệu nhạy cảm qua log hoặc request bên ngoài. - Các chức năng cốt lõi
hoạt động offline. - Hoàn tất kiểm thử hồi quy và checklist phát hành.

### Phase 6 --- Post-V1

**Ưu tiên sau khi V1.0 ổn định; chưa cam kết thời gian.**

Các hướng có thể xem xét: - Theo dõi cổ phiếu Việt Nam/quốc tế. - Widget
màn hình chính. - Nhập dữ liệu từ CSV. - Đồng bộ đa thiết bị mã hóa đầu
cuối (E2EE). - Mở rộng nguồn giá và proxy cache. - Tối ưu hiệu năng với
dữ liệu lớn.

Không đưa đồng bộ đa thiết bị vào MVP chỉ vì đã có backup. E2EE sync cần
thiết kế riêng cho identity, key management, conflict resolution, merge
và recovery.

## 8. Ưu tiên triển khai

### P0 --- Không thể trì hoãn

-   Database integrity.
-   Accounting invariants.
-   Transaction atomicity.
-   Money precision.
-   Offline core.
-   Backup/restore an toàn trước phát hành công khai.
-   Không rò rỉ dữ liệu tài chính.

### P1 --- Cần có trong V1.0

-   Asset lots và cost basis.
-   Interest và liability calculation.
-   Recurring transactions.
-   Multi-currency.
-   Reports và reconciliation.
-   PIN/biometric và encrypted export.

### P2 --- Sau V1

-   Stock market expansion.
-   Home-screen widgets.
-   CSV import nâng cao.
-   E2EE multi-device sync.
-   Các tích hợp và phân tích mở rộng.

## 9. Quy ước quản lý task

### 9.1 Cấu trúc thư mục

``` text
/
├── plan.md
├── README.md
├── tasks/
│   ├── task-00-project-foundation.md
│   ├── task-01-database-architecture.md
│   ├── task-02-accounting-engine.md
│   ├── task-03-core-finance.md
│   ├── task-04-asset-management.md
│   ├── task-05-interest-engine.md
│   ├── task-06-liability-management.md
│   ├── task-07-recurring-budget.md
│   ├── task-08-reports-reconciliation.md
│   ├── task-09-security-backup.md
│   └── task-10-release-polish.md
└── docs/
    ├── architecture.md
    ├── database-schema.md
    ├── accounting-rules.md
    ├── business-rules.md
    └── external-data-providers.md
```

Tên và thứ tự task có thể được điều chỉnh sau khi phân rã chi tiết;
không coi danh sách trên là schema bất biến.

### 9.2 Nội dung bắt buộc của mỗi task

Mỗi `task.md` cần có:

1.  Task ID, title, phase, priority và status.
2.  Objective --- kết quả cần đạt.
3.  Scope --- in scope và out of scope.
4.  Dependencies --- task phải hoàn thành trước.
5.  Current architecture/context --- phần code và tài liệu cần đọc.
6.  Proposed changes --- file/module dự kiến tạo hoặc sửa.
7.  Business rules --- quy tắc bắt buộc.
8.  Data changes --- schema/migration nếu có.
9.  Implementation plan --- các bước thực hiện.
10. Test plan --- unit, integration, regression và edge cases.
11. Acceptance criteria --- điều kiện nghiệm thu.
12. Progress log --- Done, Doing, Next, Issues, Decisions.

### 9.3 Trạng thái task

-   `NOT STARTED`
-   `ANALYSIS`
-   `PLANNED`
-   `IN PROGRESS`
-   `BLOCKED`
-   `IN REVIEW`
-   `COMPLETED`

Chỉ chuyển sang `COMPLETED` khi acceptance criteria và test plan đã được
xác minh. Việc code đã được tạo không đồng nghĩa task hoàn thành.

## 10. Quy trình làm việc với AI Agent

Áp dụng quy trình cố định:

### Step 1 --- Analyze

Agent đọc `plan.md`, các tài liệu liên quan và code hiện tại. Phải xác
định dependency, phần đã tồn tại, rủi ro và xung đột với kiến trúc.

### Step 2 --- Propose

Agent đưa phương án triển khai trước khi sửa code:

-   Các module/file sẽ tạo hoặc sửa.
-   Data flow và dependency.
-   Schema/migration.
-   Business rules.
-   Test cases.
-   Rủi ro và phương án xử lý.

Chờ người phụ trách duyệt khi task có thay đổi kiến trúc, schema cốt lõi
hoặc quy tắc kế toán.

### Step 3 --- Implement

Chỉ triển khai phạm vi được duyệt. Không tự ý mở rộng sang task khác,
thay đổi public contract hoặc bỏ qua business rules.

### Step 4 --- Verify

Chạy các kiểm tra phù hợp:

-   Type-check.
-   Lint/format.
-   Unit tests.
-   Integration tests.
-   Migration tests.
-   Regression tests.
-   Kiểm tra offline và lỗi dữ liệu khi phù hợp.

Báo cáo rõ lệnh đã chạy, kết quả và phần chưa kiểm chứng. Không tuyên bố
test pass nếu chưa chạy.

### Step 5 --- Update

Cập nhật task với: - Done: phần đã hoàn thành. - Doing: phần còn đang
làm. - Next: bước tiếp theo. - Issues: lỗi/rủi ro còn tồn tại. -
Decisions: quyết định mới cần ghi vào docs/plan. - Verification: test đã
chạy và kết quả.

Nếu phát sinh quyết định ảnh hưởng roadmap hoặc kiến trúc, cập nhật tài
liệu nguồn trước khi tiếp tục các task phụ thuộc.

## 11. Definition of Done cấp dự án

V1.0 chỉ được xem là sẵn sàng phát hành khi:

-   [ ] Các luồng thu, chi, chuyển tiền, tài sản, lãi và nợ có test
    nghiệp vụ.
-   [ ] Ledger không thể ghi nhận bút toán mất cân bằng.
-   [ ] Các thao tác ghi sổ có tính atomic.
-   [ ] Có kiểm thử precision, rounding và đa tiền tệ.
-   [ ] Có kiểm thử idempotency cho recurring và interest accrual.
-   [ ] Số dư, tài sản, công nợ và báo cáo reconcile được.
-   [ ] Chức năng cốt lõi hoạt động khi offline.
-   [ ] Dữ liệu nhạy cảm được mã hóa và không xuất hiện trong
    log/request không cần thiết.
-   [ ] Backup/restore được kiểm thử thực tế.
-   [ ] Có xử lý giá stale và lỗi provider.
-   [ ] Có kiểm thử hiệu năng với mục tiêu 10.000 giao dịch; mục tiêu mở
    app dưới 2 giây cần được đo trên thiết bị tham chiếu.
-   [ ] Hoàn tất kiểm thử trên Android; iOS được kiểm tra trước khi công
    bố hỗ trợ chính thức.
-   [ ] Có disclaimer rõ ràng: ứng dụng phục vụ theo dõi, không phải tư
    vấn đầu tư hoặc tư vấn thuế.

## 12. Rủi ro và cách kiểm soát

  -----------------------------------------------------------------------
  Rủi ro                              Cách kiểm soát
  ----------------------------------- -----------------------------------
  Sai lệch số học tài chính           Money value object, decimal/integer
                                      precision, property-based tests

  Ghi trùng lãi/giao dịch định kỳ     Idempotency key, unique
                                      constraints, catch-up tests

  Tính trùng tài sản                  Quy tắc ownership và mapping ledger
                                      rõ ràng; reconciliation

  API giá không ổn định               PriceProvider abstraction, cache,
                                      stale timestamp, fallback

  Giới hạn/điều khoản API             Xác minh license, rate limit và chi
                                      phí trước khi chọn provider

  Mất dữ liệu khi đổi máy             Encrypted backup, restore test và
                                      hướng dẫn recovery

  Native module không tương thích     Spike kỹ thuật trong Phase 0, xác
  Expo                                nhận development build

  Background task không chạy đúng     Thiết kế catch-up khi app mở; không
                                      phụ thuộc hoàn toàn vào background
                                      execution

  Scope creep                         Giữ P2 sau V1; mọi thay đổi phạm vi
                                      phải cập nhật plan/task

  Lộ dữ liệu riêng tư                 Không gửi dữ liệu tài chính lên
                                      server; log redaction; review
                                      network calls
  -----------------------------------------------------------------------

## 13. Quyết định còn phải xác minh

Các nội dung sau chưa được coi là đã khóa:

-   Phiên bản Expo SDK/React Native và tương thích SQLCipher/Drizzle.
-   Thư viện biểu đồ, notification và test runner cuối cùng.
-   Phương pháp cost basis mặc định: weighted average hay FIFO.
-   Quy tắc precision/rounding cho từng loại currency và asset.
-   Provider giá cho crypto, vàng trong nước/quốc tế và FX.
-   Quy tắc định giá tài sản không có market price đáng tin cậy.
-   Cơ chế quản lý khóa mã hóa và recovery của backup.
-   Công thức, day-count convention và rounding cho từng loại lãi/lịch
    trả nợ.
-   Thiết bị tham chiếu để đo hiệu năng.

Mỗi quyết định phải có ghi chú trong tài liệu phù hợp và test chứng minh
khi đó là quy tắc nghiệp vụ.

## 14. Immediate next steps

Không triển khai đồng loạt mọi phân hệ. Khởi động theo thứ tự:

1.  Duyệt `plan.md` và khóa phạm vi V1.0.
2.  Tạo `task-00-project-foundation.md`.
3.  Tạo `task-01-database-architecture.md`.
4.  Thực hiện một technical spike xác nhận Expo Development Build +
    SQLite/SQLCipher + Drizzle.
5.  Duyệt ERD và `docs/accounting-rules.md`.
6.  Chỉ sau đó mới triển khai Accounting Engine.

**Nguyên tắc điều hành:** kiến trúc và quy tắc dữ liệu được thống nhất
trước; task được phân rã vừa đủ nhỏ để kiểm thử; mỗi task chỉ hoàn thành
khi có bằng chứng nghiệm thu.
