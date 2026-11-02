# TASK-04 — Quản lý tài sản

- Giai đoạn: 3 — MVP 2: Tài sản và lãi
- Ưu tiên: P1
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-02, TASK-03

## 1. Mục tiêu
Theo dõi tài sản, số lượng đang nắm giữ, lịch sử mua/bán, các lô tài sản, phí, giá vốn và lãi/lỗ đã thực hiện hoặc chưa thực hiện. Ứng dụng chỉ ghi nhận tài sản, không thực hiện giao dịch mua bán thực tế.

## 2. Phạm vi
- Danh mục loại tài sản và hồ sơ tài sản.
- Theo dõi số lượng và thông tin nơi lưu trữ.
- Ghi nhận mua/bán tài sản, liên kết tài khoản thanh toán và ledger.
- Quản lý lô tài sản, phí và phương pháp tính giá vốn được duyệt (bình quân gia quyền hoặc FIFO).
- Định giá thủ công hoặc theo dữ liệu thị trường.
- Lịch sử giá và trạng thái dữ liệu giá đã cũ.
- Theo dõi tài sản số offline nhưng không lưu thông tin bí mật.

Không bao gồm thực hiện lệnh giao dịch, lưu private key/seed phrase hoặc tích hợp nhà cung cấp khi chưa đánh giá điều khoản và độ tin cậy.

## 3. Bối cảnh
Đọc mục 5, 6.3 và mô tả màn hình tài sản trong đặc tả; Giai đoạn 3 của roadmap.

## 4. Quy tắc nghiệp vụ
- Không được bán số lượng lớn hơn số đang nắm giữ.
- Giá vốn mua vào bao gồm phí theo chính sách đã duyệt.
- Lãi/lỗ thực hiện được tính khi bán theo phương pháp giá vốn đã chọn.
- Biến động giá thị trường chỉ ảnh hưởng giá trị ước tính và lãi/lỗ chưa thực hiện; không tự tạo thu nhập đã thực hiện.
- Không tính trùng tiền mặt và giá trị tài sản.
- Giá đã cũ phải hiển thị thời điểm cập nhật và cảnh báo.
- Không lưu seed phrase hoặc private key.

## 5. Thay đổi dự kiến
Domain model tài sản/lô; dịch vụ tính giá vốn; use case mua/bán; ánh xạ ledger; giao diện PriceProvider và bộ nhớ đệm lịch sử giá; màn hình danh sách/chi tiết/lô; truy vấn định giá và lãi/lỗ.

## 6. Thay đổi dữ liệu
Chỉ triển khai schema tài sản, lô, nguồn giá và lịch sử giá đã được duyệt; bảo đảm truy vết đến bút toán ledger.

## 7. Kế hoạch triển khai
1. Chốt phân loại tài sản, precision số lượng và phương pháp giá vốn.
2. Thiết kế vòng đời tài sản và lô.
3. Triển khai use case mua và bán.
4. Triển khai bộ tính giá vốn theo phương pháp đã duyệt.
5. Xác định hợp đồng provider, cache và chính sách giá cũ.
6. Xây màn hình tài sản và tổng hợp lãi/lỗ.
7. Đối soát số lượng tài sản với ledger.

## 8. Kế hoạch kiểm thử
Nhiều lần mua với giá/phí khác nhau; bán một phần/toàn bộ; bán vượt số lượng; tính giá vốn và làm tròn; phân biệt lãi/lỗ đã và chưa thực hiện; provider lỗi, cache cũ, offline; kiểm tra không tính trùng.

## 9. Tiêu chí nghiệm thu
- [ ] Tài sản và các lô truy vết được.
- [ ] Mua/bán đối soát được với tài khoản và ledger.
- [ ] Từ chối bán vượt số lượng.
- [ ] Giá vốn và lãi/lỗ khớp phương pháp đã duyệt.
- [ ] Giá cũ được đánh dấu; dữ liệu cache vẫn xem được offline.
- [ ] Không lưu hoặc truyền thông tin bí mật của ví.
- [ ] Số lượng tài sản và số liệu ledger đối soát được.

## 10. Nhật ký tiến độ
- Đã làm: Tạo task theo Giai đoạn 3.
- Đang làm: Chờ các phân hệ kế toán và tài chính cốt lõi.
- Tiếp theo: Duyệt mô hình tài sản và chính sách giá vốn.
- Vấn đề: Nhà cung cấp dữ liệu giá và precision còn mở.
- Kiểm chứng: Chưa chạy.