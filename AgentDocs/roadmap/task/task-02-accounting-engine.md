# TASK-02 — Bộ máy kế toán (Accounting Engine)

- **Giai đoạn:** 1 — Kiến trúc cơ sở dữ liệu & Accounting Engine
- **Ưu tiên:** P0 / đường găng
- **Trạng thái:** BLOCKED
- **Phụ thuộc:** TASK-00, TASK-01

## 1. Mục tiêu
Xây dựng domain kế toán độc lập với UI, có khả năng kiểm tra, ghi sổ và đảo bút toán kép một cách nguyên tử và xác định.

## 2. Phạm vi
- Các value object Money, Currency, Amount và tỷ giá.
- Quy tắc ghi Nợ/Có và kiểm tra journal entry.
- Vòng đời draft → posted, ranh giới transaction khi ghi sổ và tính số dư.
- Các thao tác nền tảng cho số dư đầu kỳ và chuyển tiền nội bộ.
- Liên kết reversal/adjustment và metadata kiểm toán.
- Chống ghi trùng khi command được gửi lại.
- Domain service thuần và Application use case.

**Không bao gồm:** màn hình giao dịch, cost basis tài sản, tính lãi và khoản vay.

## 3. Phụ thuộc
- TASK-01 cung cấp schema ledger và repository contract đã duyệt.
- TASK-00 xác nhận khả năng tính toán số chính xác và transaction của database.

## 4. Bối cảnh
Đọc mục kế toán 6.1–6.2 trong đặc tả và Giai đoạn 1 của roadmap. Sử dụng schema và quyết định đã duyệt; không tự suy diễn quy tắc đa tiền tệ còn thiếu.

## 5. Thay đổi dự kiến
- Domain: Money, Currency, JournalEntry, JournalLine và bộ kiểm tra posting.
- Application: use case ghi sổ, đảo bút toán, tạo số dư đầu kỳ và chuyển tiền.
- Infrastructure: repository triển khai transaction nguyên tử.
- Kiểm thử unit, integration và các bất biến kế toán.

## 6. Quy tắc nghiệp vụ
- Bút toán đã ghi sổ phải có các dòng Nợ/Có hợp lệ và cân bằng theo chính sách tiền tệ đã duyệt.
- Ghi sổ nguyên tử: tất cả dữ liệu liên quan được lưu hoặc không có dữ liệu nào được lưu.
- Bút toán đã ghi sổ là bất biến; sửa sai bằng bút toán đảo/điều chỉnh có liên kết.
- Chuyển tiền nội bộ không tạo thu nhập hoặc chi phí.
- Số dư đầu kỳ phải có tài khoản đối ứng vốn chủ sở hữu rõ ràng.
- Số học và làm tròn tuân theo precision đã duyệt.
- Gửi lại command không được tạo bút toán trùng.

## 7. Thay đổi dữ liệu
Sử dụng schema từ TASK-01. Chỉ đề xuất mở rộng schema khi có bất biến cụ thể cần bảo vệ và phải được review trước migration.

## 8. Kế hoạch triển khai
1. Xác định normal balance cho từng loại tài khoản.
2. Xây dựng số học chính xác và kiểm tra theo tiền tệ.
3. Triển khai kiểm tra draft và chuyển trạng thái ghi sổ.
4. Triển khai ranh giới persistence nguyên tử.
5. Triển khai số dư đầu kỳ và chuyển tiền nội bộ.
6. Triển khai reversal và liên kết truy vết điều chỉnh.
7. Bổ sung idempotency/chống ghi trùng.
8. Truy vấn số dư tài khoản từ các dòng ledger đã ghi sổ.

## 9. Kế hoạch kiểm thử
- Bút toán cân bằng và không cân bằng.
- Thiếu dòng, dòng không hợp lệ, giá trị zero/âm, tài khoản hoặc tiền tệ không tương thích.
- Rollback nguyên tử khi lỗi tại từng bước ghi dữ liệu.
- Reversal triệt tiêu đúng bút toán gốc và giữ lịch sử kiểm toán.
- Từ chối sửa/xóa bút toán đã ghi sổ.
- Chuyển tiền không làm thay đổi tổng tài sản ròng và không tính vào thu/chi.
- Số dư đầu kỳ có tài khoản đối ứng chính xác.
- Precision, rounding, overflow và retry/idempotency.

## 10. Tiêu chí nghiệm thu
- [ ] Domain không phụ thuộc React Native hoặc SQLite.
- [ ] Không thể ghi sổ bút toán không hợp lệ hoặc không cân bằng.
- [ ] Ghi sổ và reversal có tính nguyên tử.
- [ ] Lịch sử đã ghi sổ bất biến và truy vết được.
- [ ] Các thao tác số dư đầu kỳ và chuyển tiền vượt qua kiểm thử.
- [ ] Số dư tài khoản được tính từ ledger.
- [ ] Bộ kiểm thử bất biến kế toán thành công.

## 11. Nhật ký tiến độ
- **Đã làm:** Tạo task theo Giai đoạn 1.
- **Đang làm:** Chờ TASK-00 và TASK-01.
- **Tiếp theo:** Triển khai primitive ghi sổ sau khi schema được duyệt.
- **Vấn đề:** Chính sách cân bằng đa tiền tệ cần quyết định rõ.
- **Kiểm chứng:** Chưa chạy.