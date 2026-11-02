# TASK-03 — Tài chính cốt lõi

- Giai đoạn: 2 — MVP 1
- Ưu tiên: P0
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-02

## 1. Mục tiêu
Hoàn thiện các nghiệp vụ quản lý tiền hằng ngày gồm tài khoản, số dư đầu kỳ, thu, chi, chuyển tiền, danh mục, lịch sử giao dịch và dashboard dòng tiền.

## 2. Phạm vi
- Tạo, sửa và ngừng sử dụng tài khoản theo quy tắc đã duyệt.
- Quản lý danh mục thu và chi.
- Ghi nhận thu, chi, chuyển tiền qua Application use case.
- Lịch sử giao dịch, lọc theo ngày, danh mục, tài khoản và xem chi tiết.
- Luồng nhập nhanh (Quick Entry), tối đa ba thao tác cho khoản chi thông thường.
- Dashboard tổng hợp tiền khả dụng, thu, chi và dòng tiền ròng.

Không bao gồm quản lý tài sản, khoản vay, ngân sách, báo cáo nâng cao, tích hợp ngân hàng.

## 3. Bối cảnh và phụ thuộc
TASK-02 phải cung cấp nghiệp vụ ghi sổ và truy vấn số dư đã kiểm thử. Đọc mô tả màn hình và ví dụ bút toán trong đặc tả; kiểm tra route, component và design token hiện có trước khi triển khai.

## 4. Quy tắc nghiệp vụ
- Người dùng không nhập Nợ/Có thủ công.
- Chuyển tiền không phải thu nhập hoặc chi phí.
- Số dư được tính từ ledger đã ghi sổ.
- Giao dịch đã ghi sổ không được sửa trực tiếp; mọi điều chỉnh phải giữ lịch sử.
- Phân biệt thời điểm phát sinh và thời điểm hệ thống ghi nhận.
- Tài khoản ngừng hoạt động vẫn xem được trong lịch sử nhưng không nhận giao dịch mới, trừ khi chính sách cho phép.

## 5. Thay đổi dự kiến
- Repository và use case cho tài khoản, danh mục.
- Use case thu, chi và chuyển tiền.
- Màn hình tài khoản, nhập nhanh, lịch sử/chi tiết giao dịch và dashboard.
- View model/hook gọi Application interface.
- Validation và ánh xạ lỗi thành thông báo dễ hiểu.

## 6. Kế hoạch triển khai
1. Xác định vòng đời tài khoản và danh mục.
2. Xây repository và use case.
3. Ánh xạ giao dịch thành journal entry.
4. Xây màn hình tài khoản.
5. Xây form nhập nhanh.
6. Xây lịch sử, bộ lọc và chi tiết.
7. Xây dashboard từ truy vấn Application.
8. Kiểm tra hoạt động offline và đa nền tảng.

## 7. Kế hoạch kiểm thử
Kiểm thử use case thu/chi/chuyển tiền; đối soát số dư với journal line; loại chuyển tiền khỏi tổng thu/chi; điều chỉnh có lưu vết; bộ lọc ngày/múi giờ; trạng thái rỗng, tải, lỗi; hồi quy offline.

## 8. Tiêu chí nghiệm thu
- [ ] Quản lý tài khoản và danh mục hoạt động offline.
- [ ] Tạo và xem được giao dịch thu, chi, chuyển tiền.
- [ ] Mọi thay đổi tài chính đi qua Application/Accounting Engine.
- [ ] Số dư khớp ledger, chuyển tiền không bị tính trùng.
- [ ] Nhập khoản chi thông thường hướng tới tối đa ba thao tác.
- [ ] Bộ lọc lịch sử chính xác.
- [ ] Màn hình có trạng thái rỗng, tải và lỗi.
- [ ] Kiểm thử không làm sai lệch lịch sử đã ghi sổ.

## 9. Nhật ký tiến độ
- Đã làm: Tạo task theo Giai đoạn 2.
- Đang làm: Chờ TASK-02.
- Tiếp theo: Xây luồng tài khoản, danh mục và giao dịch.
- Vấn đề: Cần chốt vòng đời tài khoản và quy tắc chỉnh sửa danh mục.
- Kiểm chứng: Chưa chạy.