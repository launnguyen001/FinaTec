# FinaTec

## Phát triển

- Cài dependency: `npm ci`.
- Chạy app: `npx expo start`.
- Lint: `npx expo lint`.
- Format check: `npm run format:check`.
- Type-check: `npx tsc --noEmit`.
- Unit/integration test: `npm test`.
- Android Development Build (cần Android SDK/JDK cục bộ): `npx expo run:android`.
- Build Android trên EAS: `npx eas-cli@latest build --platform android --profile development`.
- Trên Development Build Android, mở liên kết kiểm tra database ở màn hình gốc để chạy spike. Expo Go không chứa SQLCipher nên không dùng để nghiệm thu mã hóa.
- Kiểm tra riêng tình huống mất key bằng liên kết **Chẩn đoán mất key test**; luồng này chỉ xóa key `kets0.task00.key-loss-probe-v2` và dùng file `task00-key-loss-probe-v2.db`. Không dùng test này với production key.
- Để thử plaintext bằng SQLite độc lập: chạy `python3 scripts/task00/receive-sqlcipher-probe.py`, chạy diagnostic trên thiết bị với `adb reverse tcp:8099 tcp:8099`, rồi kiểm tra bản sao tại `/tmp/task00-sqlcipher-independent.sqlite` bằng Python `sqlite3` ở chế độ `mode=ro`. Diagnostic chỉ gửi ciphertext của DB probe chứa dữ liệu giả; truy vấn `SELECT name FROM sqlite_master` phải thất bại `file is not a database` (lệnh đầy đủ và kết quả ở TASK-00).

## Ranh giới mã nguồn và logging

- `src/app/`: Expo Router routes và composition root.
- `src/presentation/`: màn hình và UI; không truy cập SQLite/Drizzle.
- `src/application/`: use cases và hợp đồng; không phụ thuộc nền tảng.
- `src/domain/`: quy tắc thuần TypeScript; không phụ thuộc React Native, Expo hoặc persistence.
- `src/infrastructure/`: adapter nền tảng và persistence.
- `src/shared/`: token và tiện ích dùng chung.
- `src/tests/`: unit và smoke tests.

Logger chỉ nhận event name trong danh sách cho phép. Không truyền payload, Error, khóa, PIN hay dữ liệu tài chính vào log.
