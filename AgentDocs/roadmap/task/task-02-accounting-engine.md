# TASK-02 — Bộ máy kế toán (Accounting Engine)

- **Giai đoạn:** 1 — Kiến trúc cơ sở dữ liệu & Accounting Engine
- **Ưu tiên:** P0 / đường găng
- **Trạng thái:** DONE — local verification and Android acceptance passed
- **Phụ thuộc:** TASK-00, TASK-01 (TASK-01 merged into `main`)
- **Nhánh thực hiện:** `task/02-accounting-engine`

## 1. Mục tiêu
Xây dựng domain kế toán độc lập với UI, có khả năng kiểm tra, ghi sổ và đảo bút toán kép một cách nguyên tử và xác định.

## 2. Phạm vi
- Quy tắc normal balance và tính số dư native currency theo tài khoản.
- Quy tắc ghi Nợ/Có và kiểm tra journal entry.
- Xác minh lại FX snapshot và base amount ở thời điểm posting.
- Vòng đời draft → posted, ranh giới transaction khi ghi sổ và tính số dư.
- Các thao tác nền tảng cho số dư đầu kỳ và chuyển tiền nội bộ.
- Liên kết reversal/adjustment và metadata kiểm toán.
- Chống ghi trùng khi command được gửi lại.
- Domain service thuần và Application use case.

**Không bao gồm:** màn hình giao dịch, cost basis tài sản, tính lãi và khoản vay.

## 3. Phụ thuộc
- TASK-01 đã merge vào `main` qua PR #3; cung cấp schema ledger và repository contract.
- TASK-00 xác nhận khả năng tính toán số chính xác và transaction của database.

## 4. Chính sách kế toán dùng trong task
- Mỗi posting phải có tối thiểu hai line, ít nhất một DEBIT và một CREDIT.
- So sánh tổng `baseAmountMinor` sau khi tự tính lại FX snapshot của từng line; không tin giá trị quy đổi do caller truyền vào.
- Làm tròn half-up đúng một lần trên từng line theo precision của base currency; không tự tạo rounding line.
- Normal balance: ASSET/EXPENSE là DEBIT; LIABILITY/EQUITY/INCOME là CREDIT. Số dư được biểu diễn dương theo normal side.
- Account archived và currency inactive không nhận posting mới.
- Chuyển tiền giữa hai tài khoản cùng chủ sở hữu không tạo INCOME/EXPENSE; hai đầu chuyển phải cân bằng theo base currency.
- Reversal là một journal entry mới, đảo side từng line và giữ nguyên snapshot tiền tệ/tỷ giá của giao dịch gốc; entry gốc chỉ được reversal một lần.
- Opening balance ghi Nợ tài khoản tài sản và Có tài khoản vốn chủ sở hữu opening balance (hoặc chiều ngược lại nếu cần ghi nhận số dư âm theo policy được duyệt); không dùng số dư khởi tạo trực tiếp trên account.
- Idempotency key duy nhất cho mỗi command; retry phải trả về kết quả đã tạo, không tạo thêm journal entry.

## 5. Thay đổi dữ liệu
Ưu tiên sử dụng schema TASK-01. Chỉ đề xuất migration nếu cần lưu metadata bắt buộc cho invariant mà schema hiện tại không thể bảo vệ.

## 6. Kế hoạch triển khai
1. [x] Định nghĩa normal balance và pure validator cho draft posting.
2. [x] Tính số dư account từ posted lines theo native currency.
3. [x] Thêm Application use cases và repository contract cho post/reversal.
4. [x] Triển khai transaction nguyên tử và idempotency.
5. [x] Triển khai opening balance và internal transfer.
6. [x] Triển khai reversal/adjustment và truy vết.
7. [x] Bổ sung unit/integration tests cho invariant kế toán.
8. [x] Chạy lint, format, typecheck, Jest và Android acceptance.
   - [x] Lint, format, typecheck, Jest.
   - [x] Android acceptance trên Huawei LYA-L29 / Android 10, SQLCipher 4.17.0 community.

## 7. Kế hoạch kiểm thử
- Bút toán cân bằng và không cân bằng.
- Thiếu dòng, dòng không hợp lệ, giá trị zero/âm, tài khoản hoặc tiền tệ không tương thích.
- Sai FX snapshot/base amount và rounding/overflow.
- Rollback nguyên tử khi lỗi tại từng bước ghi dữ liệu.
- Reversal triệt tiêu đúng bút toán gốc và giữ lịch sử kiểm toán.
- Chuyển tiền không làm thay đổi tổng tài sản ròng và không tính vào thu/chi.
- Số dư đầu kỳ có tài khoản đối ứng chính xác.
- Retry/idempotency và race khi gửi cùng command.

## 8. Tiêu chí nghiệm thu
- [x] Domain không phụ thuộc React Native hoặc SQLite.
- [x] Không thể ghi sổ bút toán không hợp lệ hoặc không cân bằng.
- [x] Ghi sổ và reversal có tính nguyên tử.
- [x] Lịch sử đã ghi sổ bất biến và truy vết được.
- [x] Các thao tác số dư đầu kỳ và chuyển tiền vượt qua kiểm thử.
- [x] Số dư tài khoản được tính từ ledger.
- [x] Bộ kiểm thử bất biến kế toán thành công.

## 9. Nhật ký tiến độ
- **Done:** TASK-01 merged to `main` at `f542c42` (PR #3).
- **Done:** pure posting validator, FX snapshot verification, normal-balance rules and native-currency balance calculation added on this branch.
- **Done:** repository contract for idempotency, posted-lines query, atomic draft posting and atomic posted-entry commit.
- **Done:** `AccountingService` use cases for draft/post, opening balance, internal transfer, reversal and balance lookup.
- **Done:** SQLite adapter revalidates inside the write transaction; posted-history triggers remain the final immutability boundary.
- **Done:** 31 Jest tests pass across posting, values, draft lifecycle, opening balance, transfers, reversal, idempotency, rollback and router checks.
- **Done:** Android acceptance passed on Huawei LYA-L29 / Android 10, SQLCipher 4.17.0 community via `src/app/task02-accounting-acceptance.tsx`. All 9 diagnostic checks passed: fixture, opening balance, idempotent retry, internal transfer, reversal, single-reversal guard, draft lifecycle, unbalanced rejection and cross-currency transfer.
- **Verification:** Expo lint, Prettier, TypeScript and Expo Doctor (20/20) pass. Android export succeeds.
- **Decision:** no schema migration. TASK-01 already provides idempotency, reversal uniqueness and posted-history triggers.
- **Decision:** cross-currency transfers require an explicit destination amount; an implicit rounding policy between two sides was rejected.
- **Known risks:** SQLite INTEGER persistence is bounded by JavaScript safe-integer range; FX conversion is rounded per line before base-currency balancing.
- **Docs:** `AgentDocs/accounting-rules.md`.
