# TASK-05 — Bộ máy tính lãi

- Giai đoạn: 3 — MVP 2
- Ưu tiên: P1
- Trạng thái: BLOCKED
- Phụ thuộc: TASK-02, TASK-04

## 1. Mục tiêu
Tính toán và ghi nhận lãi phát sinh cho tài sản hoặc khoản nợ có lãi theo quy tắc lãi suất, kỳ hạn, quy ước số ngày và ghép lãi được xác định rõ.

## 2. Phạm vi
- Cấu hình kế hoạch tính lãi cho tài sản và khoản nợ.
- Diễn giải APR/APY và quy ước số ngày được hỗ trợ.
- Tính lãi đơn và lãi kép.
- Lịch phát sinh lãi và vòng đời accrued/posted/paid.
- Nhập lãi vào gốc hoặc thanh toán về tài khoản chỉ định.
- Ghi nhận phần thưởng staking dưới dạng số lượng khi được đặc tả cho phép.
- Xử lý bù các kỳ bị bỏ lỡ theo cách idempotent.

Không bao gồm cam kết lợi suất từ nhà cung cấp, tự động thao tác on-chain hoặc sản phẩm chưa được hỗ trợ.

## 3. Bối cảnh
Đọc phần lãi/staking trong đặc tả và Giai đoạn 3, 5 của roadmap. Phải chốt công thức và quy tắc làm tròn trước khi lập trình.

## 4. Quy tắc nghiệp vụ
- Cơ sở lãi suất (APR/APY), kỳ tính và quy ước ngày phải rõ ràng.
- Cùng đầu vào phải cho kết quả xác định.
- Chỉ làm tròn tại thời điểm ghi nhận đã được duyệt.
- Chạy lại một kỳ không được tạo lãi hoặc bút toán trùng.
- Lãi tài sản và lãi khoản nợ phải ánh xạ đúng tài khoản ledger.
- Nếu ứng dụng không chạy nền, việc tính bù phải được thực hiện an toàn khi mở ứng dụng lần tiếp theo.

## 5. Thay đổi dự kiến
InterestPlan và InterestAccrual; bộ tính thuần; use case phát sinh và thanh toán lãi; persistence adapter; bộ xử lý lịch/bù kỳ; màn hình chi tiết lãi.

## 6. Thay đổi dữ liệu
Triển khai bản ghi kế hoạch và kỳ tính lãi đã duyệt; có unique constraint/idempotency cho từng kỳ.

## 7. Kế hoạch triển khai
1. Chốt cơ sở lãi suất, tần suất, day-count và làm tròn.
2. Viết ví dụ công thức cùng kết quả tham chiếu.
3. Xây bộ tính lãi đơn/lãi kép thuần.
4. Triển khai sinh kỳ và vòng đời ghi nhận lãi.
5. Ánh xạ lãi được ghi nhận vào journal entry.
6. Bổ sung xử lý bù kỳ có idempotency.
7. Xây màn hình kế hoạch và lịch sử.

## 8. Kế hoạch kiểm thử
Chuyển đổi APR/APY; năm nhuận và ranh giới tháng; lịch lãi đơn/lãi kép; lãi suất 0; thanh toán đáo hạn; làm tròn; chạy bù nhiều lần; retry sau lỗi; đối soát ledger.

## 9. Tiêu chí nghiệm thu
- [ ] Công thức và quy ước được hỗ trợ có tài liệu.
- [ ] Kết quả bộ tính khớp ví dụ tham chiếu đã duyệt.
- [ ] Lãi phát sinh truy vết được tới journal entry.
- [ ] Xử lý lại không tạo trùng kỳ.
- [ ] Lãi tài sản và lãi khoản nợ được hạch toán đúng.
- [ ] Kiểm thử bao phủ ranh giới ngày và làm tròn.

## 10. Nhật ký tiến độ
- Đã làm: Tạo task theo roadmap.
- Đang làm: Chờ mô hình tài sản và quyết định về lãi.
- Tiếp theo: Chốt quy ước tính và triển khai bộ tính thuần.
- Vấn đề: Day-count và quy tắc thanh toán chưa được quyết định.
- Kiểm chứng: Chưa chạy.