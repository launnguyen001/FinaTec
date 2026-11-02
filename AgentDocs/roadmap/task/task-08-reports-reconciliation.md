# TASK-08 — Báo cáo và đối soát

- Giai đoạn: 5 — V1.0: Phân tích tài chính và an toàn dữ liệu
- Ưu tiên: P1
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-02 đến TASK-07

## 1. Mục tiêu
Cung cấp báo cáo tài chính đáng tin cậy và chức năng đối chiếu số dư, sử dụng cùng quy tắc domain và ledger với các phân hệ nghiệp vụ.

## 2. Phạm vi
- Báo cáo thu/chi theo danh mục và khoảng thời gian.
- Báo cáo dòng tiền, loại trừ chuyển tiền nội bộ khỏi thu/chi.
- Số dư tài khoản và góc nhìn bảng cân đối.
- Tổng hợp tài sản, khoản nợ và tài sản ròng.
- Ảnh chụp tài sản ròng theo thời gian và biểu đồ xu hướng.
- So sánh số dư ghi nhận với số dư thực tế do người dùng nhập.
- Bút toán điều chỉnh có lưu vết.
- Xuất CSV/PDF nếu thuộc phạm vi V1 đã duyệt.

## 3. Bối cảnh
Đọc yêu cầu dashboard/báo cáo, ví dụ kế toán trong đặc tả; Giai đoạn 5 và Definition of Done trong roadmap.

## 4. Quy tắc nghiệp vụ
- Báo cáo phải tái sử dụng quy tắc domain/ledger, không tự tính một cách khác trong UI.
- Tài sản ròng = tổng tài sản − tổng khoản nợ tại ngày và tiền tệ báo cáo được chọn.
- Chuyển tiền không được tính là thu nhập hoặc chi phí.
- Định giá thị trường phải phân biệt với lãi/lỗ đã thực hiện.
- Chênh lệch đối soát phải hiển thị rõ; mọi điều chỉnh phải là journal posting có thể truy vết.
- Tạo snapshot phải xác định và an toàn khi chạy lại.

## 5. Thay đổi dự kiến
Dịch vụ truy vấn báo cáo; use case đối soát; bộ tạo snapshot; màn hình/biểu đồ; luồng điều chỉnh; adapter xuất dữ liệu nếu nằm trong phạm vi.

## 6. Thay đổi dữ liệu
Bổ sung snapshot và bản ghi đối soát đã duyệt, liên kết với journal entry điều chỉnh nếu có.

## 7. Kế hoạch triển khai
1. Chốt chiều phân tích, ranh giới kỳ và chính sách quy đổi tiền tệ.
2. Xây truy vấn thu/chi và dòng tiền.
3. Xây phép tính bảng cân đối và tài sản ròng.
4. Xây snapshot hằng ngày và chống tạo trùng.
5. Xây so sánh số dư thực tế với số đã ghi nhận.
6. Đưa điều chỉnh qua Accounting Engine.
7. Xây màn hình báo cáo và biểu đồ xu hướng.
8. Kiểm tra tính nhất quán file xuất nếu thuộc phạm vi.

## 8. Kế hoạch kiểm thử
Bộ dữ liệu ledger mẫu; loại chuyển tiền; công thức tài sản ròng; quy đổi tiền tệ; snapshot lịch sử; retry snapshot; chênh lệch đối soát; dấu vết điều chỉnh; tổng báo cáo khớp truy vấn nguồn.

## 9. Tiêu chí nghiệm thu
- [ ] Tổng báo cáo đối soát với ledger/domain.
- [ ] Chuyển tiền bị loại khỏi thu/chi.
- [ ] Tài sản ròng nhất quán theo ngày/tiền tệ được chọn.
- [ ] Snapshot có thể tái lập và idempotent.
- [ ] Chênh lệch và điều chỉnh truy vết được.
- [ ] Biểu đồ/file xuất khớp kết quả truy vấn báo cáo.
- [ ] Kiểm thử bao phủ ranh giới thời gian và quy đổi tiền tệ.

## 10. Nhật ký tiến độ
- Đã làm: Tạo task theo Giai đoạn 5.
- Đang làm: Chờ các phân hệ nghiệp vụ trước đó.
- Tiếp theo: Chốt chính sách báo cáo và snapshot.
- Vấn đề: Quy đổi đa tiền tệ và tỷ giá lịch sử cần được duyệt.
- Kiểm chứng: Chưa chạy.