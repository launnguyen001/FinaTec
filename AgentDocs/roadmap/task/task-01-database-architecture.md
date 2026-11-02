# TASK-01 — Database Architecture

- **Giai đoạn:** 1 — Kiến trúc cơ sở dữ liệu & Accounting Engine
- **Ưu tiên:** P0
- **Trạng thái:** DONE
- **Phụ thuộc:** TASK-00 (merged into `main`)
- **Nhánh thực hiện:** `task/01-database-architecture`
- **Merge:** PR #3, commit `f542c42`

## 1. Mục tiêu
Chuyển ERD khái niệm thành schema quan hệ đủ chi tiết; xây dựng database cục bộ, migration có phiên bản và repository adapter.

## 2. Kết quả
- Hoàn thành 5 bảng nền tảng: currencies, ledger_settings, accounts, journal_entries, journal_lines.
- Hoàn thành Drizzle schema, migration 0000, SQLCipher-aware initialization và SecureStore key preflight.
- Hoàn thành Domain value objects cho Money, Currency, FxRate và SQLite repository adapter.
- Hoàn thành Data Dictionary, ERD, constraints, indexes và migration-owned triggers.

## 3. Kiểm chứng
- TypeScript, Expo lint, format check, Jest (3 suites / 9 tests), Expo Doctor (20/20), dependency check và Android export: PASS theo log trên nhánh.
- Android acceptance trên Huawei LYA-L29 / Android 10, SQLCipher 4.17.0: PASS.
- Đã kiểm tra migration/re-run, repository round-trip, rollback, constraints, posted-history immutability và close/reopen persistence.
- iOS runtime chưa được kiểm thử do môi trường hiện tại không có Xcode; không thuộc điều kiện chặn nghiệm thu Android.

## 4. Vấn đề cần theo dõi
- `npm ci` báo 48 dependency advisories (1 low, 47 moderate); chưa tự động nâng cấp dependency.
- Task02 phải xác minh lại FX snapshot và base amount trước posting; không tin giá trị caller truyền vào.

## 5. Trạng thái
TASK-01 được nghiệm thu kỹ thuật và merge vào `main` qua PR #3.
