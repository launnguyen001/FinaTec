# TASK-06 — Quản lý khoản nợ

- Giai đoạn: 4 — MVP 3: Khoản nợ, định kỳ và ngân sách
- Ưu tiên: P1
- Trạng thái: COMPLETE — DEVICE_ACCEPTED; diagnostic SQLCipher trên Development Build PASS toàn bộ, kiểm tra cục bộ PASS; xem biên bản nghiệm thu lượt 2 bên dưới
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
- [x] Mỗi phương pháp có công thức và kiểm thử tham chiếu.
- [x] Tổng lịch trả khớp giả định gốc/lãi.
- [x] Thanh toán cập nhật tiền và dư nợ chính xác.
- [x] Trả một phần/trước hạn tuân theo chính sách đã duyệt.
- [x] Không xử lý một khoản thanh toán trùng.
- [x] Dư nợ đối soát được với lịch sử journal.
- [x] Archive chỉ được phép khi dư nợ và nghĩa vụ chưa thanh toán đều bằng 0.

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
- Diagnostic thiết bị và regression cục bộ đã PASS ở biên bản nghiệm thu lượt 2. Trạng thái CI của commit sửa thứ tự ghi và assertion nghiệm thu chưa được xác minh độc lập.

## 12. Biên bản nghiệm thu độc lập trên thiết bị (lượt 1 — lịch sử)

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

## 13. Biên bản nghiệm thu độc lập trên thiết bị (lượt 2)

- Kết luận: **PASS — DEVICE ACCEPTED**.
- Mã nguồn nền: `cfc95c22deeea40f82c877ca59fc7d2a16923890`. Commit này sửa thứ tự transaction để ghi installment mới trước schedule-change audit rows tham chiếu installment đó; `PRAGMA foreign_key_check` không còn lỗi.
- Diagnostic assertion được sửa để đối chiếu ID của ba installment đang hiệu lực sau APR reset. Sau trả gốc, diagnostic xác nhận chính các kỳ đó được giữ làm lịch sử `CANCELLED` và lịch mới được tạo cho dư nợ còn lại; không đếm nhầm ba kỳ đã bị hủy từ lần đổi APR trước đó.
- Thiết bị: Huawei LYA-L29, Android 10 / API 29; Development Build `com.anonymous.fintech`, version 1.0.0 (versionCode 1). Chạy route `Task06 acceptance (DEV)` trên database SQLCipher cô lập `task06-liability-acceptance-f1fb14582e9f.db`.
- Kết quả diagnostic: PASS migration; origination journal; phân bổ lãi trước gốc; idempotent retry; reversal; replacement linkage; archive guard; APR history; trả gốc trước hạn và tính lại schedule; tất toán; archive sau tất toán; tách phí EXPENSE; reconciliation ledger/schedule/payment; SQLCipher `4.17.0 community`. Mọi chênh lệch đối soát bằng 0.
- Diagnostic báo đã xóa database cô lập và SecureStore key tạm trong `finally`.
- Xác minh cục bộ trên working tree sau cập nhật assertion: typecheck PASS, lint PASS, format check PASS, unit tests PASS (17 suites / 116 tests); Android build và cài đặt Development Build PASS.
- Giới hạn báo cáo: CI từ xa cho source assertion vừa sửa chưa được xác minh; GitHub CLI không có trong môi trường. Nghiệm thu thiết bị và các lệnh kiểm tra cục bộ đều PASS.



## 14. Bổ sung regression tự động sau audit (2026-11-05)

- Đã bổ sung `src/tests/liability-repository.integration.test.ts`, chạy `SqliteLiabilityRepository` và `LiabilityService` trên SQLite thật (`node:sqlite`) với toàn bộ migration production; không mock `commitPayment`.
- Regression early-principal xác nhận replacement installments được persist trước các schedule-change audit rows tham chiếu chúng; kiểm tra payment, posted journal, principal outstanding, schedule principal và cả ba reconciliation differences.
- Probe tái hiện invariant FK immediate: thao tác ghi schedule-change row trước khi installment được insert phải bị SQLite từ chối bằng `FOREIGN KEY constraint failed`.
- Rollback regression chủ động gây lỗi ở bước cập nhật liability sau khi các payment/journal/installment/audit writes đã chạy; xác nhận toàn bộ transaction rollback, không để lại journal, payment, allocation hoặc schedule-change rows và `PRAGMA foreign_key_check` rỗng.
- Harness `src/tests/helpers/real-sqlite.ts` dùng `node:sqlite` và cùng migration bundle Drizzle với production. Môi trường Node 22 là điều kiện chạy test.
- Báo cáo remediation ghi nhận local verification PASS: typecheck, lint, format:check và Jest **21 suites / 123 tests**. Tuy nhiên CI run #715 trên SHA `848ad77c76d30878e80791efb487d49752dcc550` FAIL tại typecheck do hai stale import path sau khi chuyển key lifecycle; hai import hiện đã được sửa thành `../key-lifecycle` trên branch.
- **Trạng thái tại thời điểm ghi:** regression implementation đã có trên branch; cần một CI run mới trên đúng HEAD chứa các import fixes và test mới trước khi chuyển CLI sang nghiệm thu cuối. Device acceptance lượt 2 trên Huawei LYA-L29 đã PASS theo biên bản §13; không cần chạy lại TASK-06 diagnostic chỉ vì bổ sung test harness Node-side, trừ khi CI hoặc rà soát source phát hiện thay đổi ảnh hưởng native path.

## 15. Final Acceptance — TASK-06 (2026-11-05)

### 15.1. Phạm vi và nguyên tắc thực hiện

- Đối tượng nghiệm thu: TASK-06 (Quản lý khoản nợ) trên branch `remediation/audit-00-06`.
- Commit được nghiệm thu: `5052e0437c5a7712840385f5ed458d9d645a0d30` (`docs(task-06): record real SQLite payment regression coverage`).
- Không commit, amend, rebase, reset, merge, push; không tạo branch mới; không sửa source, test, schema hay migration. Tài liệu này là tệp duy nhất được thay đổi.
- Mọi thao tác database phá hủy chỉ chạy trên database tạm trong bộ nhớ hoặc tệp tạm dưới `/tmp/opencode`; không có tệp `.db` nào trong repository và không truy cập database production.
- Trạng thái cuối cùng của TASK-06 được tách biệt khỏi các phát hiện cross-task F-01–F-06.

### 15.2. CI và môi trường

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| CI run | **PASS** | Run `#717`, run ID `42022859173`, event `pull_request`, PR #9 |
| Head SHA của CI | **KHỚP** | `5052e0437c5a7712840385f5ed458d9d645a0d30` |
| Branch của CI | **KHỚP** | `remediation/audit-00-06` |
| Kết luận CI | **success** | Toàn bộ 8 bước CI success (xác minh qua GitHub API) |
| Log chi tiết của CI | **KHÔNG LẤY ĐƯỢC** | Tải log trả HTTP 403 khi không có auth; số test trong CI không đọc được từ log |

Số lượng test dưới đây là kết quả chạy lại cục bộ trên đúng HEAD, không phải số liệu trích từ log CI.

### 15.3. Quality gate chạy lại cục bộ

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run format:check` | **PASS** |
| `npm test` | **PASS — 21 suites / 123 tests** |

### 15.4. Kiểm thử SQLite thật (không mock repository)

Chạy trực tiếp 5 suite trọng tâm trên `node:sqlite` với toàn bộ migration production: **PASS — 5 suites / 11 tests**.

- `src/tests/liability-repository.integration.test.ts`
- `src/tests/finance-runtime.integration.test.ts`
- `src/tests/finance-history-repository.integration.test.ts`
- `src/tests/currency-migration.integration.test.ts`
- `src/tests/key-lifecycle.test.ts`

### 15.5. Kiểm tra persistence trên tệp SQLite

Kịch bản tạo khoản nợ, ghi một payment trả gốc trước hạn, đóng database rồi mở lại đúng tệp:

- Khoản nợ, payment và journal đọc lại được sau khi mở lại database: **PASS**.
- `outstandingPrincipalMinor` = `80000`; principal của payment = `20000`: **PASS**.
- Journal ở trạng thái `POSTED`: **PASS**.
- Cả ba chênh lệch reconciliation (`difference`, `schedule`, `payment`) đều bằng `0`: **PASS**.
- `PRAGMA foreign_key_check` trả `[]`: **PASS**.
- Trigger bất biến tiền tệ tồn tại trên database mới: **PASS**.

### 15.6. Vòng đời nghiệp vụ TASK-06 trên SQLite thật

Các kịch bản tuần tự sau đều **PASS**:

- Phân bổ lãi trước, gốc sau cho payment một phần.
- Retry cùng `idempotencyKey` trả lại payment cũ, không nhân đôi payment/journal.
- Từ chối overpayment.
- Từ chối tài khoản nguồn không hợp lệ và tài khoản phí không hợp lệ.
- Cả hai chính sách trả trước hạn (`KEEP_INSTALLMENT_SHORTEN_TERM` và chính sách còn lại).
- Tất toán toàn bộ (full payoff).
- Archive khoản nợ.
- Reversal payment.
- Payment thay thế có liên kết (linked replacement).
- `PRAGMA foreign_key_check` rỗng sau toàn bộ chuỗi thao tác.

Kết luận: luồng tuần tự / đơn người dùng của TASK-06 đạt yêu cầu về nghiệp vụ, ledger và toàn vẹn khóa ngoại.

### 15.7. Phát hiện lỗi TASK-06 — ghi đồng thời hai payment khác idempotency key

**Mức độ: nghiêm trọng (integrity defect). Trạng thái: FAIL.**

Kịch bản trên SQLite thật, khoản nợ `INTEREST_ONLY` gốc `100000`, lãi kỳ đầu `1000`, hai payment `1000` được gọi đồng thời bằng `Promise.allSettled` với hai key khác nhau (`race-a`, `race-b`):

| Chỉ số | Kết quả thực tế | Kỳ vọng |
|---|---|---|
| Hai payment | Cả hai `fulfilled` | Một thành công, một bị chặn hoặc phân bổ tuần tự |
| Tổng lãi đã trả trong payment history | `2000` | `1000` |
| Lãi kỳ đầu due / paid | `1000` / `1000` | `1000` / `1000` |
| Trạng thái kỳ đầu | `PAID` | `PAID` |
| Dư nợ gốc | `100000` | `99000` |
| Reconciliation `difference` / `schedule` / `payment` | `0` / `0` / `0` | `0` / `0` / `0` |

Đối chứng tuần tự trên cùng cấu hình (hai payment lần lượt): payment thứ hai phân bổ `0` vào lãi và giảm gốc, dư nợ còn `99000`, tổng lãi đã trả `1000`. Như vậy sai lệch chỉ xuất hiện khi hai payment được xử lý đồng thời.

Nguyên nhân: bước đọc allocation và tính toán nằm ngoài transaction ghi của repository, nên hai transaction cùng đọc trạng thái lãi chưa trả trước khi bên kia commit (read-modify-write race). Reconciliation hiện chỉ đối chiếu gốc nên vẫn báo `0`, không phát hiện lãi bị trả vượt.

Đề xuất khắc phục (không thực hiện trong lần nghiệm thu này):

1. Đưa thao tác đọc allocation và tính toán vào cùng transaction ghi trong `SqliteLiabilityRepository`, hoặc dùng optimistic concurrency (version/compare-and-swap) trên khoản nợ/installment.
2. Bổ sung đối soát lãi (interest reconciliation), không chỉ gốc.
3. Thêm test SQLite thật cho hai payment đồng thời khác key, khẳng định không có double allocation.
4. Cân nhắc ràng buộc uniqueness/khóa theo `(liabilityId, installmentId)` cho allocation đang hiệu lực.

Lưu ý: retry cùng một `idempotencyKey` vẫn an toàn; lỗi chỉ xảy ra với hai key khác nhau.

### 15.8. Ma trận xác minh cross-task F-01–F-06

| Mã | Nội dung kiểm tra | Kết quả | Bằng chứng chính |
|---|---|---|---|
| F-01 | `finance-runtime` inject `categories` đầy đủ | **PASS** | Composition-root test `finance-runtime.integration.test.ts` chạy SQLite thật |
| F-02 | Migration tiền tệ áp dụng được cho database đã migrate cũ | **FAIL** | Database đã chạy `0004` cũ vẫn không có trigger sau khi migrator hiện tại chạy lại (xem §15.9) |
| F-03 | Regression SQLite thật cho payment/early principal | **PASS** | `liability-repository.integration.test.ts` (5 suite / 11 test) |
| F-04 | Tích hợp composition root | **PASS** | `finance-runtime.integration.test.ts` |
| F-05 | Truy vấn lịch sử dùng `EXISTS` tương quan | **PASS** | `finance-history-repository.integration.test.ts` |
| F-06 | Dùng chung key lifecycle resolver | **PASS** | `key-lifecycle.test.ts`; `database.ts` dùng resolver chung |

F-02 là lỗi cross-task, không quy trực tiếp cho logic TASK-06, nhưng ảnh hưởng đường nâng cấp database của ứng dụng.

### 15.9. Chi tiết lỗi F-02 — sửa migration hồi tố

- `0004_usdt_currency_code.ts` được sửa trực tiếp thay vì thêm migration tiến (forward migration). Database đã từng chạy phiên bản `0004` cũ được đánh dấu đã áp dụng, nên nội dung sửa không bao giờ chạy lại.
- Tái hiện: database mô phỏng đã migrate bằng `0004` cũ có **11 migration đã áp dụng** và **0 trigger tiền tệ**. Chạy migrator hiện tại trên cùng database vẫn **11 migration** và **0 trigger**.
- Database mới (fresh) có đủ trigger: **PASS**.
- Đề xuất khắc phục: thêm migration `0011` tạo lại `currencies_code_immutable` và `currencies_no_precision_change_when_referenced`, đăng ký trong `migrations/index.ts`, kèm test nâng cấp thật từ database `0004` cũ. Không sửa hồi tố `0004`.

### 15.10. Nghiệm thu thiết bị

- Biên bản gần nhất: **PASS** trên Huawei LYA-L29, Android 10 / API 29, SQLCipher `4.17.0 community`, tại source `cfc95c22deeea40f82c877ca59fc7d2a16923890` (§13).
- Từ SHA đó đến HEAD hiện tại có thay đổi key lifecycle dùng chung và chỉnh sửa migration/trigger, tức đường khởi tạo database, migration và quản lý khóa native đã thay đổi.
- Vì vậy **không thể tuyên bố nghiệm thu thiết bị cho HEAD hiện tại**. Trạng thái: **NOT VERIFIED** cho `5052e043...`. Cần một lượt chạy diagnostic `Task06 acceptance (DEV)` trên Development Build có SQLCipher trước khi chốt phát hành.
- Không có kết quả thiết bị nào được suy diễn hoặc tạo mới trong lần nghiệm thu này.

### 15.11. Kết luận

- **TASK-06 (luồng tuần tự): PASS** — nghiệp vụ, ledger, persistence, reversal/replacement, archive, tất toán, phí và FK đều đạt trên SQLite thật.
- **TASK-06 (toàn bộ): FAIL** — lỗi ghi đồng thời hai payment khác key làm trả vượt lãi và không giảm gốc, trong khi reconciliation vẫn báo khớp. Đây là lỗi toàn vẹn dữ liệu tài chính, phải sửa trước khi chấp nhận.
- **Cross-task F-02: FAIL** — đường nâng cấp database từ `0004` cũ không nhận trigger tiền tệ; F-01, F-03, F-04, F-05, F-06 PASS.
- **Thiết bị trên HEAD hiện tại: NOT VERIFIED**.
- **Trạng thái nghiệm thu cuối: FAIL**. Không có thay đổi source/test/migration nào được thực hiện; chỉ tài liệu này được cập nhật.
