# Application

Chứa use case và hợp đồng repository, điều phối Domain với các adapter. Không phụ thuộc component giao diện, Expo, React Native hay SQLite.

`ledger/accounting-service.ts` triển khai TASK-02:

- Tạo draft và post draft sau khi xác minh lại toàn bộ snapshot.
- Ghi trực tiếp một posting đã cân bằng.
- Số dư đầu kỳ với tài khoản đối ứng EQUITY.
- Chuyển tiền nội bộ giữa hai tài khoản ASSET, không đi qua INCOME/EXPENSE.
- Reversal liên kết `reversal_of_id`, giữ nguyên snapshot của entry gốc.
- Idempotency theo `idempotency_key` cho mọi command ghi sổ.
- Tính số dư native currency chỉ từ các dòng đã POSTED.

Dependency của service chỉ là `LedgerRepository`; ID generator và clock được inject để kiểm thử xác định.
