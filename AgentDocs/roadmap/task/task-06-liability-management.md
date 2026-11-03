# TASK-06 — Quản lý khoản nợ

- Giai đoạn: 4 — MVP 3: Khoản nợ, định kỳ và ngân sách
- Ưu tiên: P1
- Trạng thái: BLOCKED_DEVICE_ACCEPTANCE — diagnostic trên Development Build gặp lỗi FOREIGN KEY khi ghi nhận trả gốc trước hạn; xem biên bản nghiệm thu bên dưới
- Phụ thuộc: TASK-02, TASK-03, TASK-05

## 1. Mục tiêu
Quản lý các khoản vay và nghĩa vụ nợ do người dùng khai báo, tính lịch trả nợ, ghi nhận thanh toán và đối soát dư nợ với ledger.

## 2. Phạm vi
- Tạo và cấu hình khoản nợ.
- Tính lịch theo dư nợ giảm dần (DECLINING), gốc đều (EQUAL_PRINCIPAL), trả góp đều (ANNUITY) và chỉ trả lãi (INTEREST_ONLY).
- Sinh lịch thanh toán, theo dõi kỳ đến hạn/quá hạn.
- Thanh toán toàn bộ, một phần hoặc trước hạn.
- Tách phần gốc/lãi và chọn tài khoản chi trả.
- Đối soát dư nợ, lịch trả và journal entry.

Không bao gồm đăng ký vay, kết nối bên cho vay hoặc tự động chuyển tiền qua ngân hàng.

## 3. Quy ước tính lãi và tiền
- Lãi suất đầu vào là nominal APR, lưu dạng integer ppm (1% = 10,000 ppm); không dùng floating-point để tính tiền.
- EQUAL_PRINCIPAL, ANNUITY, INTEREST_ONLY: lãi kỳ = dư nợ đầu kỳ × APR / 12.
- DECLINING: người dùng nhập gốc dự kiến trả từng kỳ; lãi = dư nợ đầu kỳ × APR × số ngày thực tế / 365 (ACT/365 Fixed).
- Các phép tính trung gian dùng số nguyên/rational BigInt; làm tròn HALF_UP đúng một lần tại ranh giới ghi sổ theo minor unit của tiền tệ.
- Gốc kỳ cuối được giới hạn bằng dư nợ còn lại để không phát sinh âm dư nợ; tổng gốc lịch phải bằng gốc ban đầu.
- Với ANNUITY, tính khoản trả định kỳ từ công thức PMT; dùng độ chính xác số nguyên/rational và chốt sai số làm tròn ở kỳ cuối để tổng gốc trả đúng bằng gốc ban đầu.
- Mỗi kỳ lưu snapshot APR, dư nợ đầu kỳ, ngày tính lãi và thành phần gốc/lãi; thay đổi APR chỉ áp dụng từ kỳ chưa đến hạn tiếp theo, không sửa lịch sử đã ghi nhận.

## 4. Quy tắc trả nợ và trả trước hạn (đã duyệt)
- Hỗ trợ thanh toán thiếu, đủ, thừa; thanh toán thừa sau khi hoàn tất nghĩa vụ kỳ hiện tại được phân bổ vào gốc.
- Mỗi payment có idempotency key duy nhất; journal entry, payment record, cập nhật dư nợ và lịch kỳ phải nằm trong cùng một transaction nguyên tử.
- Khi trả gốc trước hạn, người dùng chọn một trong hai chính sách:
  1. KEEP_MATURITY_REDUCE_INSTALLMENT: giữ ngày đáo hạn/kỳ còn lại, tính lại số tiền phải trả các kỳ tương lai.
  2. KEEP_INSTALLMENT_SHORTEN_TERM: giữ mức trả định kỳ hiện tại, rút ngắn số kỳ/thời hạn; kỳ cuối được điều chỉnh để tất toán chính xác.
- Thanh toán trước hạn chỉ áp dụng vào principal sau khi phân bổ nghĩa vụ lãi/gốc đến thời điểm thanh toán; không tự tạo phí phạt. Phí phạt (nếu có) là expense riêng do người dùng nhập.
- Không sửa/xóa journal đã POSTED; điều chỉnh bằng reversal và payment thay thế có liên kết.

## 5. Trạng thái
- Liability: ACTIVE, PAID_OFF, ARCHIVED.
- Repayment schedule: UPCOMING, DUE, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED.
- Kỳ quá hạn được xác định theo ngày địa phương của khoản nợ và số dư nghĩa vụ còn phải trả > 0.
- Chỉ archive khi dư nợ gốc bằng 0, không còn khoản lãi/kỳ chưa thanh toán và đã đối soát ledger. Archive không xóa dữ liệu lịch sử.

## 6. Hạch toán Ledger
- Nhận khoản vay: Nợ ASSET (tài khoản nhận tiền), Có LIABILITY (tài khoản khoản vay).
- Trả gốc: Nợ LIABILITY.
- Trả lãi: Nợ EXPENSE (Interest Expense).
- Nguồn thanh toán: Có ASSET.
- Một payment tạo một journal entry cân bằng với các dòng cho gốc, lãi và nguồn tiền; bỏ dòng có giá trị 0.
- Số dư LIABILITY phải khớp dư nợ gốc còn lại theo các journal đã POSTED. Không cập nhật trực tiếp account balance.

## 7. Thay đổi dữ liệu dự kiến
Liability, RepaymentSchedule, LiabilityPayment (hoặc tên tương ứng theo naming convention hiện hữu); liên kết payment với journal entry; lưu idempotency key và snapshot điều khoản/lãi suất. Migration phải tương thích dữ liệu hiện có và được đăng ký trong migration index.

## 8. Kế hoạch triển khai
1. Domain model và pure calculator cho bốn phương pháp.
2. Schema/migration và repository có transaction nguyên tử.
3. Use case tạo khoản nợ, sinh lịch, ghi nhận thanh toán và tính lại lịch.
4. Ledger posting, idempotency, reversal và reconciliation.
5. Catch-up trạng thái đến hạn/quá hạn theo timezone.
6. UI danh sách, chi tiết, lịch trả, thanh toán và archive.
7. Bộ kiểm thử tham chiếu, edge cases, regression và acceptance diagnostic.

## 9. Kế hoạch kiểm thử
- Bộ ví dụ tính tay cho cả bốn phương pháp, gồm APR 0%, rate boundary và kỳ cuối.
- Leap year, tháng 28/29/30/31 ngày, ngày trả cuối tháng, timezone và DST.
- Làm tròn HALF_UP, số tiền nhỏ, PMT và sai số phân bổ kỳ cuối.
- Thanh toán thiếu/đủ/thừa, trả gốc trước hạn theo cả hai chính sách.
- Retry cùng idempotency key, concurrent duplicate, lỗi giữa transaction phải rollback toàn bộ.
- Quá hạn, pause/resume nếu hỗ trợ, tất toán, archive guard.
- Reconciliation giữa principal balance, schedule, payment records và posted journal lines.

## 10. Tiêu chí nghiệm thu
- [ ] Mỗi phương pháp có công thức và kiểm thử tham chiếu.
- [ ] Tổng lịch trả khớp giả định gốc/lãi.
- [ ] Thanh toán cập nhật tiền và dư nợ chính xác.
- [ ] Trả một phần/trước hạn tuân theo chính sách đã duyệt.
- [ ] Không xử lý một khoản thanh toán trùng.
- [ ] Dư nợ đối soát được với lịch sử journal.
- [ ] Archive chỉ được phép khi dư nợ và nghĩa vụ chưa thanh toán đều bằng 0.

## 11. Nhật ký tiến độ
- Đã làm: TASK-05 PR #7 đã merge vào main tại fe91858; branch TASK-06 được tạo từ đúng merge commit này.
- Đã duyệt: hai chính sách trả gốc trước hạn KEEP_MATURITY_REDUCE_INSTALLMENT và KEEP_INSTALLMENT_SHORTEN_TERM.
- Đã triển khai trên branch TASK-06: domain records, pure calculator, migration 0006, Drizzle schema, SQLite repository, loan origination posting, partial/full/early payment posting, idempotency, schedule status catch-up, archive guard, reconciliation, UI và SQLCipher acceptance diagnostic cô lập.
- Đã bổ sung unit tests cho origination, phân bổ lãi trước gốc, idempotency, hai chính sách trả trước hạn và tất toán.
- Đã xác nhận TypeScript typecheck và ESLint pass trên snapshot trước lần format cuối; cần chờ CI chạy lại trên commit đã format để xác nhận toàn bộ pipeline.
- Đã bổ sung migration 0007 APR history bất biến; `changeApr` thay thế các kỳ chưa đến hạn bằng snapshot APR mới và giữ nguyên kỳ đã thanh toán/quá hạn. APR mới được áp dụng từ kỳ kế tiếp chưa đến hạn; không sửa journal hoặc installment history cũ.
- Đã bổ sung migration 0008 FX snapshots cho khoản vay và payment. Khoản nợ có thể dùng currency khác Ledger base currency khi cung cấp tỷ giá rational numerator/denominator; các line lưu FX snapshot và base amount. Payment bị từ chối nếu làm phát sinh lệch rounding ở base currency thay vì tự tạo bút toán mất cân bằng.
- Đã bổ sung migration 0009 allocation audit, schedule-change audit, payment reversal records và liên kết `replacesPaymentId`. Reversal tạo Journal Entry REVERSAL mới, kiểm tra đảo chính xác mọi line gốc, khôi phục counter/schedule trong cùng transaction; không sửa/xóa payment hay journal POSTED. Chỉ cho đảo theo thứ tự ngược thời gian để tránh phá vỡ các phân bổ sau đó.
- UI đã có APR history/change, nhập gốc riêng từng kỳ DECLINING, tỷ giá tại origination/payment, đảo payment và liên kết payment thay thế.
- Rà soát sau triển khai: đã sửa regex tỷ giá bị escape thừa (trước đó từ chối cả giá trị `1`), tách danh sách gốc DECLINING đúng theo newline/semicolon và mặc định kỳ đầu sau một tháng bằng `addMonthsClamped`.
- Đã siết idempotency: retry cùng key nhưng khác số tiền, phí, nguồn, kỳ, liên kết thay thế, note hoặc FX snapshot bị từ chối; bổ sung unit test cho payload amount khác và parser FX/DECLINING.
- SQLCipher acceptance diagnostic đã mở rộng để kiểm tra APR reset, reversal và replacement payment trên database cô lập.
- CI PASS trên HEAD `671b731d4d88f6b6f59da763949733e8b03f649e`: npm ci, typecheck, lint, format:check và unit tests đều PASS.
- Đã mở rộng `reconcile()` để đối chiếu độc lập: (1) posted LIABILITY balance với outstanding principal, (2) tổng principal còn lại trên các installment không CANCELLED với outstanding principal, (3) original principal trừ tổng principal payment chưa bị reversal với outstanding principal. Reversal được loại khỏi payment history; payment thay thế vẫn được tính. Archive yêu cầu cả ba chênh lệch bằng 0. Cần CI và CLI xác nhận trên commit mới.
- CLI từng gặp `FOREIGN KEY constraint failed` trên SHA cũ; chưa có báo cáo acceptance mới trên HEAD hiện tại. Chỉ bàn giao CLI sau khi chốt reconciliation và CI mới nhất PASS.
- Bàn giao CLI: chạy route `Task06 acceptance (DEV)` trên Development Build có SQLCipher. Diagnostic tạo database và SecureStore key ngẫu nhiên riêng, không đọc/ghi database tài chính production; phải trả đủ PASS cho migration 0007–0010, origination, partial allocation/idempotency, payment reversal/replacement, APR reset, early principal, full payoff, archive, fee posting, reconciliation và SQLCipher.
- Giới hạn đã chủ động bảo vệ: với foreign-currency posting, nếu FX snapshot khiến các line sau HALF_UP không cân bằng base currency thì payment bị reject, không tự sinh journal mất cân bằng. Cần CLI xác nhận luồng FX trên thiết bị.
- Chưa tuyên bố device acceptance; PR #8 vẫn Draft và chưa merge cho đến khi CLI trả báo cáo diagnostic và regression pass.

## 12. Biên bản nghiệm thu độc lập trên thiết bị

- Kết luận: **BLOCKED**. Không chạy tiếp regression sau lỗi đầu tiên ảnh hưởng tính toàn vẹn dữ liệu.
- Commit bắt buộc: `eb4e9b7034d08a08d69b8fd270fccfb72cd638da`; detached worktree tại `android/.task06-acceptance-eb4e9b7`, `git rev-parse HEAD` khớp SHA và working tree sạch trước khi build. Checkout chính giữ nguyên branch `task/06-liability-management`, SHA `86adf4a735ad385c5d9e49816974cdfc3f1c5a94`; không đổi branch.
- CI trên SHA bắt buộc: PASS (2 checks completed/success).
- Thiết bị/build: Huawei LYA-L29, Android 10 / API 29; `com.anonymous.fintech`, version 1.0.0 (versionCode 1). `npm ci`, typecheck, lint, format check, unit tests (17 suites/116 tests), Android build và install đều PASS.
- Diagnostic chạy đúng một lần trên route `Task06 acceptance (DEV)`. PASS trước lỗi: Task06 migration; loan origination journal; partial payment interest-first allocation; payment idempotent retry; payment reversal; replacement payment linkage; archive guard; APR history and forward-only recalculation.
- **FAIL** tại stage `record early principal repayment and recalculate schedule`: `Error code 19: FOREIGN KEY constraint failed`; `PRAGMA foreign_key_check: []`. Stack đi qua `commitPayment` → `recordPayment`. Kỳ vọng ghi nhận payment trả gốc trước hạn và tính lại schedule; thực tế transaction không hoàn tất.
- Chưa chạy/được xác minh sau stage lỗi: chính sách `KEEP_INSTALLMENT_SHORTEN_TERM`, full payoff, archive sau tất toán, fee EXPENSE, các đối soát schedule/payment/ledger còn lại, SQLCipher version check cuối diagnostic và regression Task05. SQLCipher runtime version không được diagnostic trả ra trước khi dừng.
- Cleanup: diagnostic đi qua `finally` theo mã nguồn, nơi đóng database, xóa file database cô lập và SecureStore key. Việc cleanup thành công không được xác minh độc lập trên thiết bị; không khẳng định đã xóa.
- Bằng chứng lưu tại `/tmp/task06-eb4e9b7-diagnostic.png`, `/tmp/task06-eb4e9b7-ui.xml`, `/tmp/task06-eb4e9b7-logcat.txt` và `/tmp/task06-eb4e9b7-screen.png`.
- Không sửa source/test/schema/migration/business logic; không commit, push hoặc merge. Cần Implementation Owner điều tra lỗi FOREIGN KEY tại thao tác commit payment trả gốc trước hạn.

