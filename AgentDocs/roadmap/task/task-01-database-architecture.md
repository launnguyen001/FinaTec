# TASK-01 — Kiến trúc cơ sở dữ liệu

- **Giai đoạn:** 1 — Kiến trúc cơ sở dữ liệu & Accounting Engine
- **Ưu tiên:** P0
- **Trạng thái:** IN PROGRESS
- **Phụ thuộc:** TASK-00 (merged into `main`)
- **Nhánh thực hiện:** `task/01-database-architecture`

## 1. Mục tiêu
Chuyển ERD khái niệm trong đặc tả thành schema quan hệ đủ chi tiết; xây dựng database cục bộ production đầu tiên, migration có phiên bản và ranh giới repository.

## 2. Phạm vi
- Rà soát code database/schema hiện có sau TASK-00; giữ technical spike tách biệt.
- Xác định khóa chính/ngoại, quyền sở hữu dữ liệu, nullable, unique, index, precision, vòng đời và chính sách xóa/lưu trữ.
- Thiết kế nền tảng ledger tối thiểu: currency, ledger settings, account, journal entry và journal line.
- Triển khai Drizzle schema, SQLite migration, khởi tạo DB và repository adapter.
- Tài liệu hóa ERD và data dictionary.

**Không bao gồm:** schema đầy đủ cho tài sản, nợ, lãi, giao dịch định kỳ; UI; lưu trữ cloud; use case ghi sổ/đảo bút toán hoàn chỉnh (TASK-02).

## 3. Quyết định đã chốt trong phạm vi TASK-01
1. Người dùng chọn base currency trong first-run setup; không hard-code VND làm base currency.
2. Mỗi account có một currency cố định. Journal line lưu native currency trùng currency của account.
3. Tiền lưu theo integer minor units; Domain dùng `bigint`, adapter chỉ ghi SQLite INTEGER khi nằm trong JavaScript safe-integer range.
4. FX snapshot được lưu trên từng journal line bằng rational numerator/denominator dạng chuỗi số nguyên; quote convention là base major units trên một native major unit.
5. Mỗi journal entry snapshot base currency tại thời điểm phát sinh; mỗi line lưu native amount, FX snapshot và base amount đã quy đổi.
6. Tổng DEBIT và CREDIT được kiểm tra trên base minor units trong TASK-02; rounding half-up đúng precision của base currency tại thời điểm ghi nhận line. Không dùng floating point.
7. Currency metadata lưu số chữ số minor unit; VND=0, USD=2. Currency mới phải khai báo precision rõ ràng.
8. Posted entry/lines bất biến; sửa sai bằng reversal/adjustment, không hard-delete.
9. Chỉ seed currency VND và USD ban đầu; base currency setting chỉ được tạo khi người dùng hoàn tất thiết lập ban đầu.

## 4. Thay đổi dữ liệu
Xem `AgentDocs/database-schema.md` và `AgentDocs/data-dictionary.md`. Không tạo bảng FX quote history hoặc asset/liability submodules trong task này.

## 5. Kế hoạch triển khai
1. [x] Đối chiếu đặc tả, roadmap, Task00 spike và package stack.
2. [x] Chốt data model/precision/FX snapshot và ghi lại quyết định.
3. [x] Xây Drizzle schema và migration SQL version 0000.
4. [x] Xây SQLCipher-aware database initialization, key preflight và migration bootstrap.
5. [x] Xây Domain value objects và repository port/SQLite adapter.
6. [ ] Bổ sung unit/integration tests cho migration, constraints, persistence, immutable posted history.
7. [ ] Chạy lint, format check, typecheck, Jest và kiểm tra Expo config.
8. [ ] Review schema/migration, cập nhật kết quả kiểm chứng và chuyển trạng thái.

## 6. Kiểm thử
- Migration trên database mới và khởi tạo lặp lại.
- Vi phạm foreign key, unique, check và nullability.
- Round-trip persistence cho currency/account/journal entry/lines.
- Rollback khi migration lỗi.
- Precision, FX conversion, serialization và safe-integer boundaries.
- Repository không làm rò rỉ kiểu SQLite/Drizzle vào Domain.
- SQLCipher key missing/invalid phải fail closed; không fallback plaintext.

## 7. Tiêu chí nghiệm thu
- [x] ERD và data dictionary được tạo, đối chiếu với quy tắc kế toán.
- [x] Constraint, index, precision, ownership và chính sách xóa được tài liệu hóa.
- [x] Drizzle schema và migration ban đầu được triển khai.
- [x] Database bootstrap có kiểm tra SQLCipher/key và migration.
- [x] Repository interface/adapter tách khỏi Domain.
- [ ] Kiểm thử integrity, migration và repository thành công.
- [ ] Lint, typecheck, format và Jest pass.
- [ ] Không còn quyết định P0 chưa chốt bị âm thầm đưa vào schema.

## 8. Nhật ký tiến độ
- **Done:** TASK-00 đã merge vào `main` qua PR #1; nhánh TASK-01 được fast-forward từ merge commit.
- **Done:** schema, migration, Domain values, repository adapter và tài liệu nền đã được commit.
- **Doing:** kiểm thử thực thi và review schema.
- **Next:** kiểm chứng trên môi trường npm/Expo, sửa lỗi phát sinh, hoàn tất acceptance criteria.
- **Known limitation:** chưa chạy được test/build từ phiên làm việc GitHub API; không đánh dấu TASK-01 DONE trước khi có log kiểm chứng.
