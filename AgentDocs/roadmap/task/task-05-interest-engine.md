# TASK-05 — Bộ máy tính lãi

- Giai đoạn: 3 — MVP 2
- Ưu tiên: P1
- Trạng thái: IN PROGRESS — specification and cross-task audit
- Phụ thuộc: TASK-02, TASK-04
- Branch triển khai: `task/05-interest-engine`
- Base: `task/04-asset-management` (phải đồng bộ/rebase sau khi TASK-04 được merge vào main)

## 1. Mục tiêu

Tính toán và ghi nhận lãi phát sinh cho tài sản hoặc khoản nợ có lãi theo quy tắc lãi suất, kỳ hạn, quy ước số ngày và ghép lãi được xác định rõ. Đây là Interest Engine dùng chung; TASK-04 không được tự xây một engine lãi riêng.

## 2. Phạm vi

- Cấu hình kế hoạch tính lãi cho tài sản stable-value và khoản nợ có lãi.
- Diễn giải APR/APY và quy ước số ngày được hỗ trợ.
- Tính lãi đơn và lãi kép.
- Lịch phát sinh lãi và vòng đời accrued/posted/paid.
- Nhập lãi vào gốc hoặc thanh toán về tài khoản chỉ định.
- Ghi nhận phần thưởng staking dưới dạng số lượng khi được đặc tả cho phép.
- Xử lý bù các kỳ bị bỏ lỡ theo cách idempotent.

Không bao gồm cam kết lợi suất từ nhà cung cấp, tự động thao tác on-chain hoặc sản phẩm chưa được hỗ trợ.

## 3. Ranh giới với TASK-04

- TASK-04 sở hữu asset catalog/profile, stable-value vs market-valued classification, asset lots, valuation, quote history và asset transaction.
- TASK-05 sở hữu toàn bộ quy tắc InterestPlan, InterestAccrual, lịch tính lãi, catch-up, rounding, trạng thái accrued/posted/paid và journal posting của lãi.
- TASK-04 chỉ tiêu thụ Interest Engine qua application contract; không tự tính lãi, không tạo accrual record hoặc journal entry lãi bằng logic riêng.
- Term deposit được biểu diễn bằng một ASSET Account riêng trong Core Ledger (không lưu principal lần thứ hai trong Asset domain). InterestPlan của TASK-05 tham chiếu accountId; principal và currency được đọc từ Ledger balance/account, còn start date, maturity date, rate convention, accrual/posting schedule và capitalization/payout policy thuộc InterestPlan. Account có thể được đánh dấu INVESTMENT để không bị tính vào tiền khả dụng.
- Lãi nhập gốc làm tăng principal/giá trị tiền gửi sau khi kỳ được POSTED; lãi trả về tài khoản tạo journal posting vào ACCOUNT được chỉ định. Không hiển thị accrued chưa đến hạn như số dư đã xác nhận.
- TASK-05 phụ thuộc TASK-04 về asset contract và TASK-02 về journal posting. TASK-04 không phụ thuộc việc hoàn thành toàn bộ TASK-05; acceptance về tính và ghi nhận lãi được chuyển giao cho TASK-05. TASK-04 chỉ phải lưu/đọc metadata và không được hiển thị lãi dự kiến như lãi đã ghi nhận.

## 4. Bối cảnh và nguyên tắc

Phải chốt công thức và quy tắc làm tròn trước khi lập trình. Không tự suy diễn APR/APY, day-count, compounding frequency, kỳ ghi nhận, xử lý ngày đáo hạn hoặc rounding mode từ tên trường hay ví dụ đơn lẻ.

- Cùng đầu vào và cùng phiên bản quy tắc phải cho kết quả xác định.
- Chỉ làm tròn tại thời điểm ghi nhận đã được duyệt.
- Chạy lại một kỳ không được tạo lãi hoặc bút toán trùng.
- Lãi tài sản và lãi khoản nợ phải ánh xạ đúng tài khoản Ledger.
- Nếu ứng dụng không chạy nền, việc tính bù phải được thực hiện an toàn khi mở ứng dụng lần tiếp theo.
- Accrued, posted và paid là các trạng thái khác nhau; không được coi accrued là đã tăng Ledger balance trước khi posting.
- Dữ liệu lãi phải truy vết được về plan, kỳ tính, nguồn principal/rate và Journal Entry.

## 5. Các quyết định cần khóa trước implementation

1. APR/APY: semantics, conversion rules và có hỗ trợ cả hai hay chỉ một số convention.
2. Day-count: danh sách convention được hỗ trợ (ví dụ ACT/365, ACT/360, 30/360) và quy tắc năm nhuận.
3. Accrual frequency / posting frequency: daily, monthly, at maturity hoặc cấu hình giới hạn.
4. Compounding: simple/compound, compounding frequency và thời điểm nhập lãi vào principal.
5. Period boundary: timezone, ngày bắt đầu/kết thúc, partial period và maturity date.
6. Rounding: precision, rounding mode, thời điểm rounding và xử lý phần dư.
7. Early withdrawal / principal changes: xử lý khi principal thay đổi giữa kỳ, rút trước hạn, gia hạn hoặc đóng plan.
8. Liability interest: phân biệt interest expense phải trả với khoản lãi tài sản được hưởng; xác định có triển khai chung trong cùng release hay tách use case.
9. Catch-up: tính các kỳ bị bỏ lỡ, xử lý kỳ trùng/thiếu và giới hạn batch.
10. Posting: tài khoản đối ứng, category và trạng thái khi accrue, post, capitalize hoặc payout.

Không implement formula cho đến khi các quyết định liên quan được ghi thành bảng ví dụ tham chiếu và được owner duyệt.

## 6. Thay đổi dự kiến

- Domain: InterestPlan, InterestAccrual, rate/day-count/compounding value objects và pure calculator.
- Application: create/update plan, preview accrual, accrue due periods, post/capitalize/payout, catch-up.
- Infrastructure: repository ports, SQLite adapter, migration và unique idempotency key cho plan + period + accrual type.
- Ledger integration: atomic journal posting thông qua Accounting Engine hiện có.
- Scheduling: foreground/resume catch-up; background chỉ best-effort, không phụ thuộc OS chạy đúng thời điểm.
- Presentation: kế hoạch lãi, lịch sử kỳ tính, accrued vs posted vs paid và chi tiết truy vết.

## 7. Kế hoạch triển khai

1. Đối chiếu TASK-02 Ledger contract và TASK-04 stable-value asset contract; ghi rõ interface cần dùng.
2. Chốt business decisions tại mục 5 và tạo bảng ví dụ tham chiếu.
3. Thiết kế schema/migration và unique constraints trước khi code calculator.
4. Viết pure calculator cho từng convention đã duyệt.
5. Triển khai kỳ tính và lifecycle accrued/posted/paid.
6. Tích hợp posting nguyên tử với Ledger; capitalization/payout không được double-count.
7. Bổ sung catch-up/idempotency và xử lý retry/rollback.
8. Xây UI và acceptance diagnostics.
9. Chạy unit, repository integration, migration upgrade, SQLCipher device acceptance và đối soát Ledger.

## 8. Kế hoạch kiểm thử

- APR/APY conversion và các convention được duyệt.
- Năm nhuận, cuối tháng, qua năm, timezone và maturity boundary.
- Simple/compound interest; principal/rate changes giữa kỳ.
- Zero rate, zero/negative/invalid principal, invalid date range.
- Rounding mode/precision và tích lũy phần dư.
- Accrued chưa posted không làm thay đổi Ledger.
- Capitalization tăng principal đúng một lần.
- Payout tăng đúng ACCOUNT nhận tiền và không ghi nhận hai lần.
- Liability interest được ghi đúng chiều và đúng category/account.
- Catch-up nhiều kỳ, retry sau rollback, chạy lặp idempotent.
- Migration fresh/upgrade, SQLCipher persistence và reconciliation với Journal Entry.

## 9. Tiêu chí nghiệm thu

- [ ] Công thức và convention được hỗ trợ có tài liệu và ví dụ tham chiếu đã duyệt.
- [ ] Kết quả bộ tính khớp toàn bộ ví dụ tham chiếu.
- [ ] Accrued / posted / paid tách biệt và truy vết được.
- [ ] Lãi phát sinh truy vết được tới Journal Entry.
- [ ] Xử lý lại không tạo trùng kỳ hoặc trùng bút toán.
- [ ] Lãi tài sản và lãi khoản nợ được hạch toán đúng.
- [ ] Capitalization/payout đúng và không double-count.
- [ ] Kiểm thử bao phủ ranh giới ngày, timezone, năm nhuận và rounding.
- [ ] Catch-up hoạt động khi app mở lại sau thời gian offline.
- [ ] Migration và SQLCipher repository acceptance PASS.

## 10. Nhật ký tiến độ

- 2026-11-04: Khởi động TASK-05 trên branch `task/05-interest-engine`, tạo từ `task/04-asset-management` để giữ đúng dependency và đối chiếu chéo với implementation Asset.
- 2026-11-04: Chốt ranh giới kiến trúc: term deposit dùng ASSET Account riêng làm nguồn principal; TASK-05 sở hữu InterestPlan và toàn bộ calculation/accrual/posting. TASK-04 không cần schema interest-specific và không được tự xây interest engine thứ hai.
- Đã audit TASK-02 LedgerRepository/AccountingService: atomic commitPostedEntry, balance validation, native currency, idempotency và posted journal immutability là contract nền. TASK-05 phải mở rộng repository atomic command để commit accrual + Journal Entry cùng transaction, không gọi AccountingService rồi ghi accrual độc lập.
- Đã audit TASK-04: Account ASSET và cờ INVESTMENT là nguồn phân loại sẵn có; term deposit sẽ dùng dedicated ASSET Account, InterestPlan giữ lịch/điều khoản và tham chiếu accountId; không duplicate principal.
- Đang làm: chốt các business conventions APR/APY, day-count, posting frequency, compounding và rounding trước khi triển khai calculator.
- Chưa làm: chưa có công thức APR/APY, day-count, frequency và rounding được owner duyệt; chưa implement calculator/schema/UI.
- Lưu ý branch: sau khi TASK-04 được merge vào main, phải đồng bộ/rebase TASK-05 trên main mới nhất trước khi mở PR merge; không force-push và không bỏ commit của TASK-04.
