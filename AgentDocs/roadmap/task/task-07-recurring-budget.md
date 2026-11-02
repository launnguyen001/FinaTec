# TASK-07 — Giao dịch định kỳ và ngân sách

- Giai đoạn: 4 — MVP 3
- Ưu tiên: P1
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-02, TASK-03

## 1. Mục tiêu
Hỗ trợ các giao dịch được lên lịch định kỳ và ngân sách theo danh mục, có cơ chế xử lý bù an toàn và nhắc nhở người dùng.

## 2. Phạm vi
- Cấu hình quy tắc định kỳ: tần suất, ngày đến hạn tiếp theo, số tiền, danh mục và tài khoản nguồn.
- Chế độ chỉ nhắc nhở hoặc yêu cầu xác nhận/tự động ghi sổ theo chính sách đã duyệt.
- Xử lý bù các kỳ đến hạn khi người dùng mở ứng dụng sau thời gian không sử dụng.
- Ngân sách theo danh mục và kỳ tháng.
- Thông báo giao dịch sắp đến hạn và ngưỡng ngân sách.

Không bao gồm bộ lập lịch cloud, tự động hóa phía server hoặc thanh toán tự động.

## 3. Bối cảnh
Đọc phần quy tắc định kỳ, ngân sách và thông báo trong đặc tả; Giai đoạn 4 roadmap. Tái sử dụng use case giao dịch của TASK-03.

## 4. Quy tắc nghiệp vụ
- Việc sinh giao dịch định kỳ phải idempotent qua các lần mở ứng dụng và xử lý bù.
- Chế độ tự động ghi sổ phải được cấu hình rõ; mặc định không tự ý dịch chuyển tiền.
- Giao dịch sinh tự động phải qua cùng kiểm tra kế toán như giao dịch thủ công.
- Mức sử dụng ngân sách được tính từ chi phí đã ghi sổ đủ điều kiện, không duy trì một tổng độc lập dễ sai lệch.
- Chuyển tiền không được tính vào ngân sách chi tiêu.
- Thông báo chỉ mang tính hỗ trợ; dữ liệu cốt lõi không phụ thuộc việc chạy nền.

## 5. Thay đổi dự kiến
RecurringRule và bộ xử lý; khóa idempotency/unique constraint theo kỳ; use case và truy vấn ngân sách; notification adapter; màn hình quản lý định kỳ và ngân sách.

## 6. Thay đổi dữ liệu
Bổ sung bản ghi quy tắc định kỳ, lần phát sinh và ngân sách đã duyệt. Có unique constraint để ngăn tạo trùng một lần phát sinh.

## 7. Kế hoạch triển khai
1. Chốt tần suất, cách xử lý cuối tháng và chính sách bù kỳ.
2. Chốt chế độ xác nhận hay tự động ghi sổ.
3. Xây bộ tính lần phát sinh đến hạn và idempotency.
4. Đưa giao dịch sinh ra qua use case giao dịch thông thường.
5. Triển khai hạn mức và mức sử dụng ngân sách được tính từ dữ liệu gốc.
6. Lập lịch thông báo và xử lý trường hợp người dùng từ chối quyền.
7. Xây màn hình quản lý và tổng quan.

## 8. Kế hoạch kiểm thử
Cuối tháng/năm nhuận; ứng dụng offline nhiều kỳ; chạy bù lặp lại; retry sau lỗi một phần; chế độ tự động và chỉ nhắc; ranh giới kỳ ngân sách; loại chuyển tiền; từ chối quyền thông báo.

## 9. Tiêu chí nghiệm thu
- [ ] Quy tắc định kỳ sinh giao dịch hoặc nhắc nhở đúng cấu hình.
- [ ] Xử lý lại không tạo lần phát sinh trùng.
- [ ] Giao dịch sinh ra vượt qua kiểm tra kế toán thông thường.
- [ ] Mức sử dụng ngân sách được tính từ chi phí đủ điều kiện đã ghi sổ.
- [ ] Chuyển tiền không làm tiêu hao ngân sách chi phí.
- [ ] Các kỳ bị bỏ lỡ được xử lý khi mở ứng dụng lần tiếp theo.
- [ ] Kiểm thử bao phủ ranh giới ngày và retry.

## 10. Nhật ký tiến độ
- Đã làm: Tạo task theo Giai đoạn 4.
- Đang làm: Chờ TASK-03 và quyết định về quy tắc định kỳ.
- Tiếp theo: Chốt ngữ nghĩa lịch và triển khai bộ xử lý idempotent.
- Vấn đề: Cách xử lý cuối tháng và bù kỳ cần xác nhận.
- Kiểm chứng: Chưa chạy.