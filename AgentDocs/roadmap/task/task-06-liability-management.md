# TASK-06 — Quản lý khoản nợ

- Giai đoạn: 4 — MVP 3: Khoản nợ, định kỳ và ngân sách
- Ưu tiên: P1
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-02, TASK-03, TASK-05

## 1. Mục tiêu
Quản lý các khoản vay và nghĩa vụ nợ do người dùng khai báo, tính lịch trả nợ, ghi nhận thanh toán và đối soát dư nợ với ledger.

## 2. Phạm vi
- Tạo và cấu hình khoản nợ.
- Tính lịch theo dư nợ giảm dần, gốc đều, trả góp đều (annuity) và chỉ trả lãi.
- Sinh lịch thanh toán, theo dõi kỳ đến hạn/quá hạn.
- Thanh toán toàn bộ, một phần hoặc trước hạn.
- Tách phần gốc/lãi và chọn tài khoản chi trả.
- Đối soát dư nợ, lịch trả và journal entry.

Không bao gồm đăng ký vay, kết nối bên cho vay hoặc tự động chuyển tiền qua ngân hàng.

## 3. Bối cảnh
Đọc phần khoản nợ, lịch trả nợ, ERD và ví dụ bút toán trong đặc tả; Giai đoạn 4 roadmap. Đồng bộ quy ước công thức với TASK-05.

## 4. Quy tắc nghiệp vụ
- Dư nợ phải đối soát được với các biến động gốc đã ghi sổ.
- Trả gốc làm giảm khoản nợ; trả lãi được ghi nhận là chi phí.
- Một khoản thanh toán không được áp dụng hai lần.
- Trả một phần/trước hạn phải cập nhật các kỳ tương lai theo chính sách đã duyệt.
- Ngày đến hạn, day-count và làm tròn phải được xác định rõ.
- Trạng thái lịch trả phải nhất quán với thanh toán và ngày hiện tại.

## 5. Thay đổi dự kiến
Domain model khoản nợ; bộ tính lịch trả; use case tạo/trả nợ; ánh xạ ledger; màn hình khoản nợ và lịch trả; truy vấn đối soát.

## 6. Thay đổi dữ liệu
Triển khai schema khoản nợ và lịch trả đã duyệt, liên kết thanh toán với journal entry và cơ chế chống xử lý trùng.

## 7. Kế hoạch triển khai
1. Xác định đầu vào và quy ước trả nợ.
2. Xây bộ tính thuần cho các phương pháp được hỗ trợ.
3. Sinh và lưu lịch trả.
4. Triển khai lệnh thanh toán toàn bộ/một phần/trước hạn.
5. Ánh xạ phần gốc và lãi vào ledger.
6. Tính lại lịch tương lai theo chính sách đã duyệt.
7. Bổ sung màn hình quá hạn và đối soát.

## 8. Kế hoạch kiểm thử
Ví dụ tham chiếu cho từng phương pháp; lãi suất và ranh giới ngày; làm tròn; trả một phần/trước hạn; chuyển trạng thái quá hạn; retry/idempotency; đối soát dư nợ với ledger.

## 9. Tiêu chí nghiệm thu
- [ ] Mỗi phương pháp có công thức và kiểm thử tham chiếu.
- [ ] Tổng lịch trả khớp giả định gốc/lãi.
- [ ] Thanh toán cập nhật tiền và dư nợ chính xác.
- [ ] Trả một phần/trước hạn tuân theo chính sách đã duyệt.
- [ ] Không xử lý một khoản thanh toán trùng.
- [ ] Dư nợ đối soát được với lịch sử journal.

## 10. Nhật ký tiến độ
- Đã làm: Tạo task theo Giai đoạn 4.
- Đang làm: Chờ quy ước ledger và tính lãi.
- Tiếp theo: Duyệt chính sách trả nợ và triển khai bộ tính.
- Vấn đề: Cách xử lý trả trước hạn và thay đổi lãi suất cần quy tắc rõ.
- Kiểm chứng: Chưa chạy.