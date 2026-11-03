# Domain

Chứa các quy tắc và kiểu nghiệp vụ thuần TypeScript. Không phụ thuộc React Native, Expo hoặc SQLite.

TASK-02 bổ sung:

- `ledger/posting.ts`: normal balance, validate journal entry/draft, tính số dư native currency.
- `ledger/posting-plan.ts`: dựng posting từ line spec, tự tính `base_amount_minor`, resolve FX snapshot.
- `ledger/repository.ts`: persistence port cho post/reversal, idempotency và truy vấn dòng đã posted.

Accounting invariant không tin `base_amount_minor` do caller truyền vào: mỗi line được quy đổi lại từ cặp tiền tệ, amount native và FX rational trước khi ghi sổ.
