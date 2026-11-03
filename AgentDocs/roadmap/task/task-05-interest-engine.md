# TASK-05 — Bộ máy tính lãi

- Giai đoạn: 3 — MVP 2
- Ưu tiên: P1
- Trạng thái: IMPLEMENTATION IN PROGRESS — domain, migration, atomic repository, application service and UI implemented; CI/device acceptance pending
- Phụ thuộc: TASK-02, TASK-04
- Branch triển khai: `task/05-interest-engine`
- Base: `main` tại `14db998`; branch đã được đồng bộ với toàn bộ baseline Task04 và closeout docs

## 1. Mục tiêu

Tính toán và ghi nhận lãi phát sinh cho tài sản hoặc khoản nợ có lãi theo quy tắc lãi suất, kỳ hạn, quy ước số ngày và ghép lãi được xác định rõ. Đây là Interest Engine dùng chung; TASK-04 không được tự xây một engine lãi riêng.

## 2. Phạm vi

- Cấu hình kế hoạch tính lãi cho tài sản stable-value và khoản nợ có lãi.
- Diễn giải APR/APY và quy ước số ngày được hỗ trợ.
- Tính lãi đơn và lãi kép.
- Lịch phát sinh lãi và vòng đời accrued/posted/paid.
- Nhập lãi vào gốc hoặc thanh toán về tài khoản chỉ định.
- Staking reward quantity records: DEFERRED; requires a separate token/chain reward-source contract and is outside the approved MVP.
- Xử lý bù các kỳ bị bỏ lỡ theo cách idempotent.

Không bao gồm cam kết lợi suất từ nhà cung cấp, tự động thao tác on-chain hoặc sản phẩm chưa được hỗ trợ.

## 3. Ranh giới với TASK-04

- TASK-04 sở hữu asset catalog/profile, stable-value vs market-valued classification, asset lots, valuation, quote history và asset transaction.
- TASK-05 sở hữu toàn bộ quy tắc InterestPlan, InterestAccrual, lịch tính lãi, catch-up, rounding, trạng thái accrued/posted/paid và journal posting của lãi.
- Không cần TASK-04 lưu interest-specific metadata hoặc gọi Interest Engine từ Asset domain. Task05 quản lý plan và accrual độc lập, dùng Ledger Account làm nguồn principal.
- Term deposit được biểu diễn bằng một ASSET Account riêng trong Core Ledger (không lưu principal lần thứ hai trong Asset domain). InterestPlan của TASK-05 tham chiếu accountId; principal và currency được đọc từ Ledger balance/account, còn start date, maturity date, rate convention, accrual/posting schedule và capitalization/payout policy thuộc InterestPlan. Account có thể được đánh dấu INVESTMENT để không bị tính vào tiền khả dụng.
- Lãi nhập gốc làm tăng principal/giá trị tiền gửi sau khi kỳ được POSTED; lãi trả về tài khoản tạo journal posting vào ACCOUNT được chỉ định. Không hiển thị accrued chưa đến hạn như số dư đã xác nhận.
- TASK-05 phụ thuộc TASK-02 về journal posting và TASK-04 về phân loại Account INVESTMENT. TASK-04 không phụ thuộc việc hoàn thành TASK-05; acceptance về tính và ghi nhận lãi thuộc TASK-05. Accrued chưa POSTED không được tính vào Ledger balance.

## 4. Bối cảnh và nguyên tắc

Owner approved the MVP conventions in section 5.1 on 2026-11-04. Only the listed conventions are implemented; APY conversion, alternative day-count conventions and penalty rules remain unsupported until separately approved.

- Cùng đầu vào và cùng phiên bản quy tắc phải cho kết quả xác định.
- Chỉ làm tròn tại thời điểm ghi nhận đã được duyệt.
- Chạy lại một kỳ không được tạo lãi hoặc bút toán trùng.
- Lãi tài sản và lãi khoản nợ phải ánh xạ đúng tài khoản Ledger.
- Nếu ứng dụng không chạy nền, việc tính bù phải được thực hiện an toàn khi mở ứng dụng lần tiếp theo.
- Accrued, posted và paid là các trạng thái khác nhau; không được coi accrued là đã tăng Ledger balance trước khi posting.
- Dữ liệu lãi phải truy vết được về plan, kỳ tính, nguồn principal/rate và Journal Entry.

## 4.1. Kết quả audit contract hiện hữu

### TASK-02 — Ledger / Accounting

- `LedgerRepository` đã có `commitPostedEntry(PostingCommitInput)` với contract atomic cho Journal Entry và Journal Lines; repository enforce idempotency key, balancing, account currency và posted-history invariants.
- `AccountingService.postEntry()` validate posting context rồi gọi `commitPostedEntry()`; nếu InterestAccrual được ghi sau lời gọi này bằng một repository command khác thì hai write không atomic. Không được dùng hai lệnh độc lập cho một accrual.
- TASK-05 cần một atomic repository command duy nhất để persist InterestAccrual + Journal Entry + Journal Lines, cùng transaction SQLite; idempotency key phải unique theo plan + period + accrual kind. Có thể tái sử dụng domain posting validator/plan builder, nhưng không được bypass validation.
- Balance là derived từ POSTED journal lines; không thêm principal/balance column vào Account. Mọi InterestPlan phải tham chiếu Account ASSET hoặc LIABILITY phù hợp và dùng native currency của Account.

### TASK-04 — Asset / Account

- TASK-04 đã merge. Cờ `isInvestment` chỉ áp dụng cho ASSET Account và Dashboard loại các account này khỏi available cash.
- Term deposit dùng một ASSET Account riêng, có thể đánh dấu INVESTMENT; InterestPlan giữ điều khoản/kỳ hạn và tham chiếu accountId. Principal/currency lấy từ Ledger, không lưu số dư principal trùng lặp.
- TASK-05 không cần thay đổi Asset schema, không phụ thuộc market-price provider và không ghi lãi vào Asset lot/cost basis.
- Branch `task/05-interest-engine` đã được đồng bộ với `main`; `main` là baseline duy nhất kể từ merge Task04.

### Hạch toán dự kiến — cần xác nhận theo use case

- Lãi tài sản khi capitalization: Debit deposit ASSET / Credit interest INCOME.
- Lãi tài sản khi payout: Debit receiving ASSET / Credit interest INCOME; không thay đổi principal deposit account.
- Liability interest accounting is documented as a future mapping only; implementation is DEFERRED to the debt contract in TASK-06.
- Accrued chưa POSTED là record theo dõi, không làm thay đổi Ledger. Capitalization/payout phải commit cùng InterestAccrual state transition để không double-count.

## 5. Decision log and approved MVP conventions

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

Implementation may proceed only within the owner-approved baseline below. New conventions require a new decision and reference vectors.

### 5.1. Baseline MVP — OWNER APPROVED (2026-11-04)

| Quyết định | Đề xuất | Lý do / giới hạn |
|---|---|---|
| Rate input | Hỗ trợ nominal APR trước; APY chỉ bổ sung sau khi có conversion tests | Tránh nhập nhằng APR/APY trong MVP |
| Day-count | ACT/365 Fixed | Dễ giải thích, kiểm thử được; không giả định 30/360 |
| Accrual | Daily accrual, giữ precision nội bộ | Tính bù theo ngày rõ ràng |
| Posting | Monthly và at-maturity; không post daily | Giảm số Journal Entry, accrued tách khỏi posted |
| Compounding | Simple interest mặc định; compound chỉ khi plan bật và chỉ sau capitalization | Không nhập lãi vào principal trước ngày được duyệt |
| Period boundary | Calendar-day theo app timezone; timestamp lưu UTC; start inclusive/end exclusive | Tránh đếm trùng ngày ở ranh giới kỳ |
| Rounding | Chỉ round khi posting về currency minor unit, HALF_UP; giữ fractional carry ở accrual chưa post | Tránh drift do round từng ngày |
| Principal changes | Không tự suy luận; mọi nạp/rút principal phải có effective timestamp và chia kỳ tính tại thời điểm biến động | Không tính lãi trên principal sai |
| Early withdrawal | Dừng accrual tại effective close date; penalty/forfeiture chỉ hỗ trợ khi owner định nghĩa riêng | Không tự đặt mức phạt |
| Liability | Engine/calculator dùng chung; MVP triển khai asset-interest trước, liability posting sau khi TASK-06 chốt debt contract | Tránh trùng phạm vi với TASK-06 |
| Catch-up | Tính từng kỳ còn thiếu theo plan version; giới hạn batch, unique plan-period key | Retry an toàn và có thể audit |

Các quy tắc trên đã được owner duyệt ngày 2026-11-04 và là business rules cho MVP. APY conversion, liability posting, early-withdrawal penalty và variable-principal scheduling vẫn nằm ngoài MVP cho đến khi có đặc tả riêng.

### 5.2. Reference vectors — ACT/365 Fixed

| Principal | Nominal APR | Period | Exact interest | HALF_UP posting |
|---:|---:|---:|---:|---:|
| 1,000.00 | 5.5% | 2026-01-01 → 2027-01-01 (365 days) | 55.0000 | 55.00 |
| 1,000.00 | 10% | 2024-01-01 → 2025-01-01 (366 days, ACT/365 Fixed) | 100.27397… | 100.27 |
| 0.01 | 100% | 365 × one-day accruals | 0.0100 total | 0.01 |

Rates are represented as parts per million: 5.5% = 55,000 ppm; 100% = 1,000,000 ppm; 1000% = 10,000,000 ppm. The calculator stores exact rational numerator/denominator values in minor units and rounds HALF_UP only when a posting is committed.



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

- 2026-11-04: Khởi động TASK-05 trên branch `task/05-interest-engine`, ban đầu tạo từ `task/04-asset-management` để giữ đúng dependency và đối chiếu chéo với implementation Asset.
- 2026-11-04: TASK-04 đã merge vào `main` tại `38b6453`; Task04 closeout documentation được cập nhật trên `main` tại `8b2e44f` và ranh giới kiến trúc được finalized tại `14db998`. TASK-05 branch đã được sync bằng merge commit `90a8617`, không force-push và không bỏ commit.
- 2026-11-04: Chốt ranh giới kiến trúc: term deposit dùng ASSET Account riêng làm nguồn principal; TASK-05 sở hữu InterestPlan và toàn bộ calculation/accrual/posting. TASK-04 không cần schema interest-specific và không được tự xây interest engine thứ hai.
- Đã audit TASK-02 LedgerRepository/AccountingService: atomic commitPostedEntry, balance validation, native currency, idempotency và posted journal immutability là contract nền. TASK-05 phải mở rộng repository atomic command để commit accrual + Journal Entry cùng transaction, không gọi AccountingService rồi ghi accrual độc lập.
- Đã audit TASK-04: Account ASSET và cờ INVESTMENT là nguồn phân loại sẵn có; term deposit sẽ dùng dedicated ASSET Account, InterestPlan giữ lịch/điều khoản và tham chiếu accountId; không duplicate principal.
- 2026-11-04: Owner APPROVED baseline MVP tại mục 5.1. Implementation bắt đầu bằng pure ACT/365 Fixed calculator dùng BigInt rational arithmetic và reference-vector tests.
- Đã implement pure calculator: nominal APR (ppm), ACT/365 Fixed, start-inclusive/end-exclusive, HALF_UP và exact BigInt rational arithmetic; reference-vector unit tests đã thêm.
- Đã implement migration `0005_interest_engine`, Drizzle schema, InterestPlan/InterestAccrual persistence, immutable plan terms và accrual history constraints.
- Đã implement SQLite atomic commit: Journal Entry + Journal Lines + accrual state trong một transaction; duplicate Journal Line failure phải rollback cả transaction.
- Đã implement InterestService: funded INVESTMENT ASSET validation, timezone-aware principal movement guard, APR preview, accrued record, capitalization/payout, monthly/at-maturity catch-up, fractional carry across sub-minor periods, idempotent accrual/posting và plan pause/resume/close lifecycle.
- Đã implement foreground catch-up khi app khởi chạy/resume; UI route `/interest` (create/list/preview/accrue/post/catch-up/pause/resume/close); development SQLCipher acceptance route `/task05-interest-acceptance`.
- MVP limitation: posting chỉ hỗ trợ account cùng Ledger base currency; liability interest (TASK-06), staking rewards, APY, early-withdrawal penalty và variable-principal schedules chưa hỗ trợ. Principal phải được funding trước ngày bắt đầu theo timezone của plan; mọi external movement từ ngày bắt đầu trở đi khiến preview/accrual/catch-up bị từ chối để không tính sai lịch sử.
- CI đã PASS trên baseline trước các bổ sung acceptance gần nhất; phải chạy lại CI trên latest head. SQLCipher device acceptance và Ledger reconciliation acceptance vẫn PENDING.
- Branch sync: `task/05-interest-engine` hiện ahead 9 / behind 0 so với `main`; baseline Task04 đã được merge vào branch bằng merge commit `90a8617`, không force-push và không bỏ commit.
