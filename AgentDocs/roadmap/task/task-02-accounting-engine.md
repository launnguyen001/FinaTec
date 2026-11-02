# TASK-02 — Bộ máy kế toán (Accounting Engine)

- **Giai đoạn:** 1 — Kiến trúc cơ sở dữ liệu & Accounting Engine
- **Ưu tiên:** P0 / đường găng
- **Trạng thái:** IN PROGRESS
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
3. [ ] Thêm Application use cases và repository contract cho post/reversal.
4. [ ] Triển khai transaction nguyên tử và idempotency.
5. [ ] Triển khai opening balance và internal transfer.
6. [ ] Triển khai reversal/adjustment và truy vết.
7. [ ] Bổ sung unit/integration tests cho invariant kế toán.
8. [ ] Chạy lint, format, typecheck, Jest và Android acceptance.

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
- [ ] Domain không phụ thuộc React Native hoặc SQLite.
- [ ] Không thể ghi sổ bút toán không hợp lệ hoặc không cân bằng.
- [ ] Ghi sổ và reversal có tính nguyên tử.
- [ ] Lịch sử đã ghi sổ bất biến và truy vết được.
- [ ] Các thao tác số dư đầu kỳ và chuyển tiền vượt qua kiểm thử.
- [ ] Số dư tài khoản được tính từ ledger.
- [ ] Bộ kiểm thử bất biến kế toán thành công.

## 9. Nhật ký tiến độ
- **Done:** TASK-01 merged to `main` at `f542c42` (PR #3).
- **Done:** pure posting validator, FX snapshot verification, normal-balance rules and native-currency balance calculation added on this branch.
- **Doing:** Application use cases and atomic repository posting.
- **Next:** implement post transaction and idempotent command handling.
- **Known risks:** SQLite INTEGER persistence is bounded by JavaScript safe-integer range; FX conversion is rounded per line before base-currency balancing.
- **Verification:** unit tests authored; execution pending.
