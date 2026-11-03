# Quyết định ranh giới TASK-04 / TASK-05 — 2026-11-04

## Quyết định

Chuyển toàn bộ trách nhiệm tính và ghi nhận lãi từ acceptance của TASK-04 sang TASK-05. TASK-05 là Interest Engine dùng chung cho tài sản có lãi và khoản nợ có lãi. TASK-04 không được triển khai calculator, lịch accrual hoặc journal posting lãi riêng.

## Phân chia ownership

- TASK-04: asset catalog/profile; phân loại stable-value/market-valued; asset lots, DCA, valuation, quote history và investment-account classification. Không tạo interest-specific metadata hoặc principal mirror.
- TASK-05: InterestPlan tham chiếu một ASSET Account chuyên biệt làm principal source; đọc principal/currency từ Ledger, lưu start/maturity, APR/APY, day-count, compounding, period boundary, rounding; lifecycle accrued/posted/paid; catch-up/idempotency; atomic Journal Entry; capitalization và payout.
- TASK-02: tiếp tục là nguồn chuẩn cho journal posting, transaction boundary, account và balance invariants.

## Dependency

TASK-05 phụ thuộc TASK-02 và TASK-04. TASK-04 không phụ thuộc việc hoàn thành toàn bộ TASK-05; hai task liên kết bằng application contract. Vì vậy TASK-04 có thể được nghiệm thu và merge sau khi asset contract/metadata được xác minh, trong khi interest accrual được nghiệm thu riêng ở TASK-05.

## Tác động acceptance

- Acceptance về accrual/capitalization/payout của tiền gửi có kỳ hạn thuộc TASK-05. TASK-04 chỉ cung cấp phân loại account INVESTMENT; số dư vẫn lấy từ Core Ledger và không được cộng thêm lần hai.
- TASK-05 phải kiểm thử capitalization tăng principal đúng một lần; payout tăng đúng ACCOUNT; accrued chưa posted không làm thay đổi Ledger; catch-up idempotent.
- Không tự chọn APR/APY, day-count, compounding frequency, kỳ tính hoặc rounding. Các convention phải được owner duyệt bằng ví dụ tham chiếu trước implementation.

## Metals, iOS và background

- Không tích hợp metals provider vào TASK-04 khi chưa có provider/budget/terms được duyệt. Manual valuation vẫn là đường sử dụng được; provider metals là follow-up riêng, không phải blocker của asset core.
- Android arm64 SQLCipher acceptance của TASK-04 đã PASS 15/15 theo report ngày 2026-11-04. iOS runtime được ghi NOT VERIFIED, không suy diễn PASS; không block TASK-04 nếu không có yêu cầu owner khác.
- Background execution là best-effort theo OS. Acceptance xác minh đăng ký/configuration và safe refresh state; không cam kết thời điểm chạy chính xác khi app bị suspend/terminated.

## Điều kiện close TASK-04

1. 15/15 Android SQLCipher acceptance giữ PASS trên đúng commit cuối của TASK-04.
2. TypeScript, lint, format, unit tests và CI PASS trên PR head cuối.
3. TASK-04 không có interest calculator/accrual/journal posting riêng; stable-value balances không được mirror ngoài Core Ledger.
4. Migration chain từ Core Finance đã merge tới migration mới nhất chạy fresh và upgrade; rollback atomic.
5. Archive chỉ cho phép khi remaining quantity bằng 0; archive asset type chỉ sau khi mọi profile đã archived.
6. iOS runtime ghi NOT VERIFIED; metals provider ghi DEFERRED; background scheduling ghi BEST-EFFORT, không giả định đã kiểm thử trên mọi OS.

Không được đổi trạng thái TASK-04 thành DONE nếu bất kỳ điều kiện 1–5 chưa có bằng chứng trên cùng commit. Điều kiện 6 là các giới hạn/phạm vi được công khai, không phải PASS giả.
