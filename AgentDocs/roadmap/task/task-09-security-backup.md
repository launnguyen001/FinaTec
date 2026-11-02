# TASK-09 — Bảo mật, sao lưu và an toàn dữ liệu

- Giai đoạn: 5 — V1.0
- Ưu tiên: P0 trước khi phát hành công khai
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-00, TASK-01; tích hợp với các phân hệ dữ liệu

## 1. Mục tiêu
Bảo vệ dữ liệu tài chính lưu trên thiết bị và cung cấp quy trình sao lưu/khôi phục có mã hóa do người dùng kiểm soát.

## 2. Phạm vi
- Khóa ứng dụng bằng PIN và mở khóa sinh trắc học.
- Quản lý vòng đời khóa bằng secure storage của nền tảng.
- Tự khóa và bảo vệ dữ liệu khi ứng dụng chuyển nền.
- Xuất và khôi phục bản sao lưu có mã hóa.
- Kiểm soát chức năng xuất CSV/PDF nếu được yêu cầu.
- Luồng xóa/đặt lại dữ liệu có xác nhận rõ ràng.
- Rà soát log, network request và file cục bộ về quyền riêng tư.

Không bao gồm tài khoản người dùng, lưu dữ liệu tài chính trên server và đồng bộ nhiều thiết bị.

## 3. Bối cảnh
Đọc phần bảo mật và backup trong đặc tả, nguyên tắc quyền riêng tư, Giai đoạn 5 và bảng rủi ro trong roadmap. Xem kết quả SQLCipher/quản lý khóa của TASK-00.

## 4. Quy tắc nghiệp vụ
- Dữ liệu tài chính ở trên thiết bị; request bên ngoài không được chứa số dư, danh mục tài sản hoặc lịch sử giao dịch.
- PIN/sinh trắc học là lớp kiểm soát truy cập, không thay thế mã hóa dữ liệu.
- Không hard-code hoặc ghi khóa mã hóa vào log.
- Backup phải được mã hóa và giải thích rõ cách khôi phục.
- Restore phải xác thực tính toàn vẹn trước khi thay dữ liệu hiện tại.
- Nếu restore lỗi, database hiện tại không được ở trạng thái ghi đè dở dang.
- Khi ứng dụng chuyển nền, thực hiện chính sách tự khóa đã duyệt.

## 5. Thay đổi dự kiến
Security service; secure key adapter; màn hình khóa; định dạng/version backup; mã hóa/giải mã và kiểm tra integrity; quy trình restore qua vùng tạm; log an toàn và rà soát network.

## 6. Thay đổi dữ liệu
Không có schema server. Xác định manifest/version của backup và metadata cục bộ cần thiết cho restore an toàn.

## 7. Kế hoạch triển khai
1. Duyệt threat model, chính sách PIN, fallback sinh trắc học và khôi phục khóa.
2. Xác định định dạng backup, mã hóa và kiểm tra integrity.
3. Triển khai secure key storage và vòng đời mở khóa database.
4. Triển khai tạo backup có mã hóa.
5. Triển khai restore qua vùng tạm và thay thế có rollback an toàn.
6. Triển khai tự khóa và bảo vệ khi ứng dụng chuyển nền.
7. Rà soát log, file và request mạng để loại dữ liệu nhạy cảm.
8. Tài liệu hóa giới hạn khôi phục và trách nhiệm của người dùng.

## 8. Kế hoạch kiểm thử
PIN sai/hủy sinh trắc học; khóa/mở khóa thiết bị; chuyển nền; backup hỏng; sai mật khẩu/khóa; gián đoạn export/restore; restore trên cài đặt sạch; tương thích phiên bản backup; không rò rỉ dữ liệu nhạy cảm qua log/network.

## 9. Tiêu chí nghiệm thu
- [ ] Threat model và vòng đời khóa được tài liệu hóa.
- [ ] Mã hóa database tài chính được kiểm chứng trên build hỗ trợ.
- [ ] PIN/sinh trắc học và tự khóa hoạt động theo đặc tả.
- [ ] Backup được mã hóa và kiểm tra toàn vẹn.
- [ ] Restore thành công trên cài đặt sạch và từ chối an toàn file hỏng.
- [ ] Dữ liệu hiện tại được giữ nguyên nếu restore thất bại.
- [ ] Log và request đi ra không chứa dữ liệu tài chính không cần thiết.
- [ ] Có hướng dẫn khôi phục cho người dùng.

## 10. Nhật ký tiến độ
- Đã làm: Tạo task theo Giai đoạn 5.
- Đang làm: Chờ quyết định bảo mật và nền tảng database.
- Tiếp theo: Duyệt vòng đời khóa và threat model backup.
- Vấn đề: UX khôi phục và xử lý mất khóa cần quyết định rõ.
- Kiểm chứng: Chưa chạy.