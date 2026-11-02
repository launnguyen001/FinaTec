# TASK-01 — Kiến trúc cơ sở dữ liệu

- **Giai đoạn:** 1 — Kiến trúc cơ sở dữ liệu & Accounting Engine
- **Ưu tiên:** P0
- **Trạng thái:** BLOCKED
- **Phụ thuộc:** TASK-00

## 1. Mục tiêu
Chuyển ERD khái niệm trong đặc tả thành schema quan hệ đủ chi tiết để triển khai; xây dựng database cục bộ production đầu tiên, migration có phiên bản và ranh giới repository.

## 2. Phạm vi
- Rà soát code database/schema hiện có sau TASK-00.
- Xác định khóa chính/ngoại, quyền sở hữu dữ liệu, nullable, unique, index, precision, vòng đời và chính sách xóa/lưu trữ.
- Thiết kế nền tảng ledger tối thiểu: currency, account, journal entry và journal line.
- Triển khai Drizzle schema, SQLite migration, khởi tạo DB và repository adapter.
- Tài liệu hóa ERD và data dictionary theo quy ước AgentDocs hiện tại.

**Không bao gồm:** schema đầy đủ cho tài sản, nợ, lãi, giao dịch định kỳ ngoài nhu cầu nền tảng đã duyệt; UI; lưu trữ cloud.

## 3. Phụ thuộc
- TASK-00 phải chứng minh được stack SQLite/mã hóa/ORM đã chọn.
- Các quyết định ảnh hưởng schema và quy tắc kế toán phải được duyệt trước migration production.

## 4. Bối cảnh
Đọc ERD và phần quy tắc kế toán trong đặc tả, các mục 5–6 và 13 của roadmap, cùng kết quả technical spike TASK-00. ERD hiện tại là mô hình khái niệm, không mặc định là schema đã được duyệt.

## 5. Thay đổi dự kiến
- Domain model/value type cho định danh, tiền tệ và số tiền theo quyết định đã duyệt.
- SQLite schema và Drizzle definitions.
- Migration có version, khởi tạo database.
- Repository interface tại ranh giới Domain/Application và SQLite implementation trong Infrastructure.
- Tài liệu schema và bộ dữ liệu test.

## 6. Quy tắc nghiệp vụ
- Dữ liệu tài chính được lưu cục bộ và mã hóa theo thiết kế đã duyệt.
- Journal entry đã ghi sổ phải có các dòng hợp lệ và cân bằng theo chính sách tiền tệ được duyệt.
- Foreign key và unique constraint phải bảo vệ tính toàn vẹn tham chiếu.
- Lịch sử tài chính đã ghi sổ không được hard-delete.
- Không ghi nhận trùng một giá trị kinh tế giữa số dư tài khoản và tài sản được theo dõi riêng.
- Precision và rounding phải được xác định rõ theo tiền tệ/tài sản; không dùng floating point thiếu chính xác để lưu tiền.

## 7. Thay đổi dữ liệu
Xây schema ban đầu cho nền tảng ledger: currency, account, journal entry, journal line và metadata tối thiểu phục vụ audit/reversal. Không tạo bảng suy đoán chỉ vì có trong ERD khái niệm.

## 8. Kế hoạch triển khai
1. Rà soát các quyết định schema còn mở và lập danh sách cần chốt.
2. Xây ERD chuẩn hóa và data dictionary.
3. Xác định constraint, index, precision và quy tắc vòng đời.
4. Đối chiếu schema với các tình huống số dư đầu kỳ, thu, chi, chuyển tiền và đảo bút toán.
5. Triển khai Drizzle schema và migration đầu tiên.
6. Triển khai khởi tạo DB và repository adapter.
7. Bổ sung fixture và kiểm thử tính toàn vẹn.
8. Cập nhật tài liệu schema sau khi được review.

## 9. Kế hoạch kiểm thử
- Migration trên database mới và khởi tạo lặp lại.
- Vi phạm foreign key, unique và nullability.
- Round-trip persistence cho từng entity.
- Rollback khi migration lỗi và nâng cấp từ schema được hỗ trợ trước đó.
- Kiểm thử biên precision số nguyên/thập phân và serialization.
- Xác nhận Repository không làm rò rỉ kiểu dữ liệu SQLite vào Domain.

## 10. Tiêu chí nghiệm thu
- [ ] ERD và data dictionary được review, nhất quán với quy tắc kế toán đã duyệt.
- [ ] Constraint, index, ownership, precision và chính sách xóa được tài liệu hóa.
- [ ] Migration chạy thành công trên database mới.
- [ ] Khởi tạo database an toàn khi chạy lặp lại.
- [ ] Repository interface/adapter tuân thủ ranh giới kiến trúc.
- [ ] Kiểm thử integrity và migration thành công.
- [ ] Không có quyết định P0 chưa chốt bị âm thầm đưa vào schema.

## 11. Nhật ký tiến độ
- **Đã làm:** Tạo task theo Giai đoạn 1.
- **Đang làm:** Chờ TASK-00.
- **Tiếp theo:** Duyệt ERD/schema rồi triển khai migration.
- **Vấn đề:** Chính sách cân bằng đa tiền tệ và precision cần được quyết định rõ.
- **Kiểm chứng:** Chưa chạy.