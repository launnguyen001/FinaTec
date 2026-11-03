# TASK-06 — Quản lý khoản nợ

- Giai đoạn: 4 — MVP 3: Khoản nợ, định kỳ và ngân sách
- Ưu tiên: P1
- Trạng thái: IN_PROGRESS — core implementation đang được hoàn thiện; chưa nghiệm thu/merge
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
- SQLCipher acceptance diagnostic đã mở rộng để kiểm tra APR reset, reversal và replacement payment trên database cô lập.
- CI trước các thay đổi mới nhất đã phát hiện lỗi typecheck trong fixture/import và đã sửa; CI trên HEAD mới nhất đang chạy, chưa xác nhận PASS.
- Còn lại trước bàn giao CLI: xác nhận CI xanh trên HEAD, review migration/schema + luồng rollback, và chạy diagnostic trên Development Build. Chưa tuyên bố thiết bị pass, chưa merge PR #8.
