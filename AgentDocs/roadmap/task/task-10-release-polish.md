# TASK-10 — Hoàn thiện và kiểm chứng phát hành

- Giai đoạn: 5 — V1.0
- Ưu tiên: P0 trước phát hành
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-00 đến TASK-09

## 1. Mục tiêu
Chuẩn bị bản phát hành V1.0 ổn định thông qua kiểm thử hồi quy liên phân hệ, hiệu năng, khả năng tiếp cận, bản địa hóa và xác minh quy trình build/store.

## 2. Phạm vi
- Hoàn thiện bản địa hóa tiếng Việt/Anh và dark mode.
- Rà soát accessibility cho màn hình và luồng nhập liệu cốt lõi.
- Kiểm thử hiệu năng với 10.000 bản ghi tài chính; đo thời gian khởi động trên thiết bị tham chiếu cụ thể.
- Build Android release và xác minh cài đặt.
- Kiểm chứng iOS trên môi trường build phù hợp trước khi tuyên bố hỗ trợ iOS.
- Hồi quy offline, migration, báo cáo và backup/restore.
- Release note, giới hạn đã biết và tuyên bố miễn trừ trách nhiệm tài chính.

Không bao gồm tính năng sau V1 như đồng bộ nhiều thiết bị, mở rộng dữ liệu thị trường và widget màn hình chính.

## 3. Bối cảnh
Đọc Definition of Done, Giai đoạn 5/6 trong roadmap và báo cáo các task đã hoàn thành. Rà soát tương thích dependency và yêu cầu phát hành ứng dụng.

## 4. Quy tắc nghiệp vụ
- Không tính năng mới nào được bỏ qua bất biến kế toán hoặc yêu cầu quyền riêng tư.
- Không đưa tính năng P2 sau V1 vào phạm vi phát hành nếu chưa được duyệt.
- Mọi tuyên bố hiệu năng phải ghi rõ thiết bị, bộ dữ liệu và cách đo.
- Không tuyên bố hỗ trợ iOS nếu chưa chạy kiểm chứng thực tế.
- Thông điệp ứng dụng phải nêu rõ đây là công cụ theo dõi, không phải tư vấn đầu tư hoặc thuế.

## 5. Thay đổi dự kiến
Tài nguyên bản địa hóa; sửa lỗi accessibility/hiệu năng; cấu hình release; bộ kiểm thử hồi quy tự động; checklist và tài liệu phát hành.

## 6. Thay đổi dữ liệu
Không dự kiến thay schema. Nếu phát hiện lỗi migration chặn phát hành, xử lý qua một migration được review riêng.

## 7. Kế hoạch triển khai
1. Đóng băng phạm vi tính năng V1 và phiên bản dependency.
2. Hoàn thiện bản địa hóa, dark mode và accessibility.
3. Đo hiệu năng với 10.000 bản ghi.
4. Chạy toàn bộ unit, integration và regression test.
5. Kiểm chứng luồng offline và backup/restore trên cài đặt sạch.
6. Build và cài đặt Android release candidate.
7. Kiểm chứng build và luồng cốt lõi iOS trong môi trường phù hợp.
8. Chuẩn bị release note, known issues và checklist store.

## 8. Kế hoạch kiểm thử
Toàn bộ test suite; cài mới và nâng cấp migration; luồng cốt lõi offline; hồi quy bất biến tài chính; backup/restore; accessibility; hiệu năng khởi động/truy vấn; cài đặt Android release; kiểm chứng iOS.

## 9. Tiêu chí nghiệm thu
- [ ] Tất cả yêu cầu V1 P0/P1 được triển khai hoặc loại khỏi phạm vi với phê duyệt rõ ràng.
- [ ] Toàn bộ kiểm thử bất biến tài chính và hồi quy thành công.
- [ ] Luồng cốt lõi hoạt động offline.
- [ ] Backup/restore có mã hóa vượt qua kiểm thử trên cài đặt sạch.
- [ ] Kết quả hiệu năng với 10.000 bản ghi được ghi lại.
- [ ] Android release candidate cài đặt và chạy được.
- [ ] Chỉ quảng bá hỗ trợ iOS khi đã kiểm chứng.
- [ ] Bản địa hóa, dark mode và accessibility cơ bản đã được rà soát.
- [ ] Release note, giới hạn đã biết và disclaimer đã sẵn sàng.

## 10. Nhật ký tiến độ
- Đã làm: Tạo task theo Giai đoạn 5.
- Đang làm: Chờ các task trước hoàn thành.
- Tiếp theo: Chạy kiểm chứng cuối sau khi đóng băng tính năng.
- Vấn đề: Cần chọn thiết bị tham chiếu và môi trường build iOS.
- Kiểm chứng: Chưa chạy.