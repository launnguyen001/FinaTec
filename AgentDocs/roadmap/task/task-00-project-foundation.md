# TASK-00 — Nền tảng dự án

- **Giai đoạn:** 0 — Nền tảng dự án
- **Ưu tiên:** P0
- **Trạng thái:** DONE
- **Ước lượng:** 1–2 tuần (ước lượng lập kế hoạch)
- **Nhánh thực hiện:** `task/00-project-foundation`
- **Roadmap nguồn:** `AgentDocs/roadmap/plan.md`
- **Đặc tả nguồn:** `AgentDocs/core/Đặc tả ứng dụng Quản lý Tài chính Cá nhân – Két Số.md`

## 1. Mục tiêu
Thiết lập nền tảng phát triển Android/iOS có thể tái lập và kiểm chứng. Nâng cấp dự án Expo hiện có, không khởi tạo lại dự án; xác minh khả năng tích hợp SQLite + SQLCipher + Drizzle trước khi triển khai nghiệp vụ tài chính.

## 2. Phạm vi
**Bao gồm**
- Kiểm kê cấu trúc repo, Expo SDK, React Native, package manager, entry point, cấu hình và trạng thái build.
- Chuyển dần JavaScript sang TypeScript strict mode; giữ nguyên luồng đang hoạt động cho đến khi có thay thế được kiểm chứng.
- Thiết lập Expo Router và cấu trúc mã nguồn theo kiến trúc trong roadmap.
- Thiết lập lint, format, type-check, unit test và hướng dẫn phát triển.
- Technical spike cho SQLite + SQLCipher + Drizzle trên Expo Development Build.
- Xác minh khả năng kiểm tra SQLCipher thực sự có trong binary; không chỉ dựa vào việc câu lệnh PRAGMA không báo lỗi.
- Xác minh mở/đóng DB, cấp khóa từ secure storage, migration thử nghiệm và khả năng khởi động lại.
- Xây design token, typography, spacing và UI primitive tối thiểu.
- Thiết lập logging an toàn và quy trình build Android; ghi nhận lộ trình xác minh iOS.

**Không bao gồm**
- Nghiệp vụ tài chính, schema ledger production hoặc migration dữ liệu tài chính.
- Tích hợp nhà cung cấp giá/tỷ giá.
- Backup/restore production.
- Backend, tài khoản người dùng hoặc đồng bộ cloud.
- Thiết kế UI hoàn chỉnh cho các phân hệ.

## 3. Phụ thuộc
- Không có task phụ thuộc trước đó.
- Tuân thủ đặc tả Két Số và roadmap hiện tại.
- Không tự ý thay đổi business rules, ERD hoặc phạm vi sản phẩm trong task nền tảng.

## 4. Hiện trạng repo đã kiểm tra
Dữ liệu được đọc trực tiếp từ nhánh `main` trước khi bắt đầu:

| Thành phần | Hiện trạng |
|---|---|
| Expo | `~58.0.22` |
| React Native | `0.88.1` |
| React | `19.3.0` |
| Package manager | npm; có `package-lock.json` |
| Ngôn ngữ | JavaScript |
| Entry point | `index.js` đăng ký `App.js` |
| UI hiện tại | Màn hình mặc định trong `App.js` |
| Điều hướng | Chưa có Expo Router |
| TypeScript | Chưa có `tsconfig.json` |
| Database/ORM | Chưa tích hợp |
| Kiểm thử/lint | Chưa có script trong `package.json` |
| Native folders | Chưa thấy `android/` và `ios/`; repo đang theo hướng Expo CNG |
| Cấu hình app | `app.json` đang dùng tên/slug viết hoa `FInTech`; cần chuẩn hóa slug trước khi cấu hình route/build nếu Expo yêu cầu |
| Agent rules | `AGENTS.md` yêu cầu dùng tài liệu Expo đúng major version, `npx expo install`, Expo Router và kiểm tra lint/type-check |

### Nhận định ban đầu
1. Đây là dự án Expo hiện hữu rất tối giản, không phải repo cần tái tạo bằng template mới.
2. Giữ npm và lockfile hiện tại; không chuyển package manager trong TASK-00.
3. Giữ Expo SDK 58 và React Native hiện tại ở vòng đầu; chỉ thay version nếu kiểm tra tương thích chính thức cho thấy có blocker cụ thể.
4. Expo Router chưa được cài; cần chuyển entry point và route có kiểm soát, bảo đảm app vẫn khởi động.
5. Không thể xác nhận SQLCipher từ Expo Go. Cần Development Build có cấu hình native và kiểm tra `PRAGMA cipher_version`.
6. Không được coi SQLCipher đã mã hóa chỉ vì `PRAGMA key` không ném lỗi; SQLite thường bỏ qua PRAGMA không hỗ trợ.
7. Drizzle có driver chính thức cho Expo SQLite; cần kiểm chứng đúng phiên bản dependency tương thích với SDK 58 thay vì cài tag `next`/RC theo ví dụ không cùng phiên bản.
8. Repo chưa có test baseline. Chưa có bằng chứng build, lint hoặc type-check nào được chạy trong môi trường thiết bị.

## 5. Tài liệu kỹ thuật cần tuân thủ
- Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/
- Expo SQLite SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
- Expo Router SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/router/
- Drizzle Expo SQLite: https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite
- Expo SecureStore SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/securestore/

Lưu ý SQLCipher theo tài liệu Expo: không chạy trên Expo Go; phải bật `useSQLCipher` trong config plugin, tạo native build mới và kiểm tra `PRAGMA cipher_version`. Khóa DB phải lấy từ luồng quản lý khóa an toàn, không hard-code hoặc ghi log.

## 6. Thay đổi dự kiến
- `package.json`, `package-lock.json`: dependencies và scripts được cài bằng Expo-compatible installer.
- `app.json`: cấu hình Expo Router/SQLite plugin và slug hợp lệ sau khi xác minh.
- `tsconfig.json`, `expo-env.d.ts`: TypeScript strict mode.
- `src/app/`: route/layout của Expo Router.
- `src/presentation/`, `src/application/`, `src/domain/`, `src/infrastructure/`, `src/shared/`: ranh giới kiến trúc.
- `src/tests/` hoặc cấu trúc test tương ứng: unit/smoke test.
- `src/infrastructure/database/spike/` (hoặc vị trí được duyệt): thử nghiệm database tách khỏi schema production.
- Cấu hình lint/format/test và hướng dẫn chạy.
- Tài liệu kết quả spike, quyết định và rủi ro trong `AgentDocs/`.

Không tạo các entity tài chính hoặc schema ledger trong task này.

## 7. Quy tắc nghiệp vụ và kỹ thuật
- Dữ liệu tài chính cốt lõi được lưu cục bộ; không gửi dữ liệu tài chính người dùng lên server.
- Không dùng Expo Go làm bằng chứng SQLCipher hoạt động.
- Phải xác minh cipher runtime bằng `PRAGMA cipher_version` trước khi cấp khóa hoặc truy cập schema.
- Khóa DB không được hard-code, commit, in ra log hoặc lưu trong AsyncStorage/plain preferences.
- Không mở database nghiệp vụ trước khi key/cipher được xác minh thành công.
- Không dùng số thực dấu phẩy động thông thường để tính toán tiền.
- Log không chứa số dư, mô tả giao dịch, PIN, khóa mã hóa hoặc dữ liệu tài chính nhạy cảm.
- UI không truy cập trực tiếp SQLite; tuân thủ Presentation → Application → Domain → Repository Interface → Infrastructure.
- Dùng `npx expo install` cho package Expo/native để chọn phiên bản tương thích SDK; npm là package manager hiện tại.

## 8. Thay đổi dữ liệu
Chưa tạo schema production. Spike chỉ dùng database thử nghiệm có thể xóa và một migration kiểm chứng. Không đưa dữ liệu tài chính người dùng vào spike.

## 9. Kế hoạch triển khai
### Chặng A — Baseline và cấu hình
1. Ghi nhận trạng thái hiện tại của package/config/entry point.
2. Kiểm tra Expo SDK 58 docs và tương thích package.
3. Xác định cách chuyển TypeScript và Expo Router với thay đổi nhỏ nhất.
4. Thiết lập lint, format, type-check và test baseline.
5. Đưa ứng dụng từ `App.js` sang route gốc mà không thay đổi hành vi ngoài phạm vi.

### Chặng B — Kiến trúc nền
6. Tạo cấu trúc thư mục theo roadmap.
7. Thiết lập quy tắc import/dependency để Domain không phụ thuộc React Native/SQLite.
8. Tạo design token và UI primitive tối thiểu.
9. Thêm smoke test khởi động/route.

### Chặng C — Technical spike database
10. Cài `expo-sqlite` đúng phiên bản SDK 58 và Drizzle/Drizzle Kit tương thích.
11. Cấu hình SQLCipher qua Expo config plugin.
12. Tạo Development Build mới; không dùng Expo Go để xác minh mã hóa.
13. Kiểm tra cipher version, cấp key, tạo bảng thử nghiệm, chạy migration và đọc/ghi.
14. Đóng/mở lại database; thử key sai/thiếu và xác nhận database không bị mở như SQLite plaintext.
15. Ghi rõ các giới hạn native, Android/iOS và phương án nếu có blocker.

### Chặng D — Nghiệm thu
16. Chạy lint, format check, type-check, unit test và Expo diagnostics.
17. Build/cài đặt Android Development Build và chạy smoke test.
18. Ghi riêng trạng thái kiểm chứng iOS; không tuyên bố pass khi chưa có build/test iOS.
19. Cập nhật tài liệu, nhật ký tiến độ và đề xuất chuyển TASK-00 sang IN REVIEW.

## 10. Kế hoạch kiểm thử
- Cài đặt dependency sạch bằng npm từ lockfile.
- Expo config/doctor và khởi động route gốc.
- Type-check strict mode; lint/format; unit test nền.
- Android Development Build khởi động được.
- Database spike: tạo/mở/đóng/mở lại, tạo bảng, insert/select, migration.
- SQLCipher: `PRAGMA cipher_version` phải trả về version hợp lệ trước khi thao tác dữ liệu.
- Khóa sai/thiếu phải thất bại đóng (fail closed), không được fallback âm thầm sang SQLite plaintext.
- Kiểm tra dữ liệu DB thử nghiệm không đọc được bằng SQLite plaintext thông thường nếu có thể kiểm chứng trong môi trường build.
- Kiểm tra log không lộ khóa hoặc dữ liệu nhạy cảm.
- Ghi rõ thiết bị, OS, build profile và lệnh thực tế đã chạy.

## 11. Tiêu chí nghiệm thu
- [x] Đã rà soát và ghi nhận baseline repo.
- [x] TypeScript strict mode được cấu hình.
- [x] Expo Router chạy được với route gốc.
- [x] Cấu trúc source tuân thủ kiến trúc phân lớp.
- [x] Có script lint, format, type-check và unit test.
- [x] Các kiểm tra code nền chạy thành công.
- [x] Android Development Build đã được cài và chạy trên thiết bị theo quy trình có thể tái lập.
- [x] Đã chứng minh SQLCipher có mặt trong native binary bằng cipher runtime check.
- [x] Mở/đóng DB, Drizzle migration, insert/select và persistence sau reopen thành công trên database spike riêng.
- [x] Key lifecycle chỉ tạo key khi DB chưa tồn tại; trường hợp mất key trên database test riêng đã được xác minh trên Android thật và bằng unit test.
- [x] Bản sao database SQLCipher test bị SQLite độc lập không có SQLCipher từ chối đọc schema.
- [x] Thử key `.v6` trên bản sao file cũ; hai file có bằng chứng candidate match, các file khác bị ghi nhận đúng theo kết quả thử candidate.
- [x] Đã ghi rõ tương thích iOS chưa được kiểm chứng.
- [x] iOS runtime được ghi là **NOT VERIFIED** và không thuộc điều kiện nghiệm thu TASK-00 theo quyết định owner ngày 2026-11-02.
- [x] Rủi ro và quyết định còn mở được ghi nhận.

## 12. Nhật ký tiến độ
- **2026-11-02 — DONE:** Owner xác nhận TASK-00 hoàn thành; chấp nhận iOS native runtime ở trạng thái NOT VERIFIED và không dùng đây làm điều kiện chặn TASK-01. TASK-00 được merge vào `main` qua PR #1 (merge commit `7e9cfc113c61115ea9da16ee1c153c86acaa6f6b`).
- **Done:** Đã đọc đặc tả, roadmap, task, `AGENTS.md`; xác nhận nhánh `task/00-project-foundation` và baseline hiện tại trước khi sửa.
- **Done:** Giữ Expo SDK 58 / React Native 0.88.1 / React 19.3.0 và npm; cài các module theo `npx expo install` và tài liệu SDK 58.
- **Done:** Chuyển entry point sang Expo Router tại `src/app`, bật TypeScript strict, thêm scripts lint/format/type-check/test và test route gốc.
- **Done:** Tạo cấu trúc `presentation`, `application`, `domain`, `infrastructure`, `shared`, `tests`; thêm import boundaries, tokens/UI tối thiểu và logger chỉ nhận event allowlist.
- **Done:** Thêm spike riêng không chứa schema tài chính: migration thử nghiệm, Drizzle read/write, khóa ngẫu nhiên từ Expo Crypto lưu trong SecureStore, thử khóa sai và mở lại DB.
- **Done:** Cấu hình SQLCipher qua plugin `expo-sqlite` với `useSQLCipher: true`; tạo cấu hình EAS Development Build và hướng dẫn phát triển.
- **Done:** `npx expo prebuild --platform android --clean` hoàn tất. `./android/gradlew -p android assembleDebug --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a` build thành công; APK debug arm64 được tạo. Chuỗi SQLCipher có trong `libexpo-sqlite.so` của APK.
- **Done:** `npx expo export --platform android` thành công; `npx expo install --check` báo dependency up to date; `npx expo-doctor` đạt 20/20.
- **Done:** `npx expo lint`, `npx tsc --noEmit`, `npm run format:check`, `npm test` đều pass; Jest: 1 suite / 1 test pass.
- **Doing:** Diagnostic cô lập chạy thành công trên Huawei LYA-L29 (Android 10 / API 29) với filename duy nhất, một connection tại một thời điểm, cùng SecureStore key `.v6`; các thao tác tạo file, mở lại và đọc bảng đều pass.
- **Next:** Xác định tình trạng file của spike cũ mà không xoá/sửa file; sau khi có phương án an toàn, chạy đầy đủ migration, Drizzle read/write, reopen và wrong-key trên spike chính. iOS chưa kiểm thử.
- **Issues:** Diagnostic fresh-file thành công, còn spike chính trước đó thất bại tại schema read trên tên file cố định. Giả thuyết hiện tại là file cố định đã có trạng thái hoặc nội dung không khớp với SecureStore key sau các lượt điều tra/đổi định dạng khóa; chưa xác minh trực tiếp vì không đọc/sửa file cũ. Chưa có bằng chứng Drizzle read/write hoặc migration chính pass. iOS chưa kiểm thử.
- **Issues:** Một lần build đa ABI hết dung lượng tại bước merge native libs; sau khi cài NDK/SDK 37, build lại thành công với ABI arm64. APK debug không thay thế việc cài/chạy trên thiết bị.
- **Decisions:** Chuẩn hóa slug thành `fintech`, thêm scheme `ketso`, dùng Router root `src/app`; bật SQLCipher trong app config; giữ schema spike tách biệt, không tạo schema ledger/production.
- **Verification:** Type/lint/format/Jest, Expo Doctor, Expo config, Expo Android export, Expo prebuild và Android arm64 Gradle build đã chạy. SQLCipher runtime và open/create/close/reopen trên fresh-file diagnostic đã pass; migration/Drizzle của spike chính và iOS chưa được kiểm chứng.
- **Device verification:** `adb devices -l` nhận `LHS7N18A23002591` (`LYA-L29`, Android 10 / API 29). APK arm64 cài thành công; Metro được nối bằng `adb reverse tcp:8081 tcp:8081`; app Két Số và route database spike hiển thị trên thiết bị. `PRAGMA cipher_version` thành công (nếu không, spike dừng trước migration); bước `PRAGMA user_version` báo `file is not a database`. Mã lỗi an toàn hiển thị trong UI: `migration-read-version (encrypted-database-open-failed)`. Không ghi khóa hay thông điệp SQLite tùy ý ra log.
- **Điều tra runtime (lịch sử, đã được fresh-file diagnostic bổ sung):** Các lượt thử trước trên tên DB tăng phiên bản từng lần từng báo `file is not a database`; passphrase hex và raw key đều đã thử. Fresh-file diagnostic sau đó chạy thành công trên đúng thiết bị với raw key.
- **Điều tra bổ sung (lịch sử):** Key probe trên `:memory:` tạo/đọc bảng được; một lượt thử trên file mới từng thất bại tại schema. Kết quả fresh-file diagnostic độc lập sau đó mâu thuẫn với giả thuyết blocker native tổng quát; chẩn đoán hiện tại nghiêng về trạng thái file cũ, cần giữ nguyên để kiểm tra chỉ đọc.
- **Diagnostic cô lập:** Đã thêm runner/route development riêng `src/infrastructure/database/spike/sqlcipher-file-diagnostic.ts` và `/database-file-diagnostic`; không sửa migration hay Drizzle hiện có, không gọi API xóa DB. Build arm64 mới có expo-file-system `~58.0.13`; cài bằng `adb install -r` giữ app data hiện có. Filename lần chạy cuối: `task00-sqlcipher-filediag-303962770ab632dcb4c6095cccd0a471.db`; preflight xác nhận file chưa tồn tại trước khi mở. Kích thước sau connection 1: **8192 bytes**; cuối bài: **8192 bytes**. Khóa chỉ ghi metadata: **32 bytes**, mã hóa hex chữ thường, SQLCipher raw-key syntax; không hiển thị/lưu khóa vào report.
- **Kết quả diagnostic trên Huawei LYA-L29 / Android 10 API 29:** connection 1 open PASS; `PRAGMA cipher_version` PASS = **4.17.0 community**; raw-key PRAGMA thực thi PASS (không dùng kết quả này làm bằng chứng giải mã); đọc ngay `PRAGMA user_version` PASS = **0**; tạo bảng probe PASS; đóng PASS. Connection 2 mở lại đúng file PASS; áp dụng lại cùng raw key PASS; đọc probe table PASS (không có hàng); đóng PASS. Connection 3 dùng khóa sai riêng: open PASS; PRAGMA thực thi PASS (không coi là chấp nhận khóa); schema read FAIL đúng tại `connection 3 incorrect-key schema read`, **SQLite error code 26**, thông điệp `Error code 26: file is not a database`; đóng PASS. Kích thước cuối vẫn **8192 bytes**. Kết quả chứng minh fresh file DB được giải mã bằng khóa đúng và khóa sai bị từ chối trên thiết bị.
- **Giả thuyết root cause:** vì cùng runtime, cùng SQLCipher 4.17.0, cùng SecureStore key `.v6` và cùng raw-key syntax thành công trên filename mới, lỗi trước đó không giống blocker Android 10/SQLCipher nói chung. Khả năng cao file spike cố định cũ đã được tạo/để lại ở trạng thái không khớp khóa trong các lần thử trước. Đây là giả thuyết; file cũ chưa bị đọc/xóa/sửa. Không thực hiện thay đổi production implementation.
- **Kiểm tra sau diagnostic:** `npx tsc --noEmit`, `npx expo lint`, `npm run format:check`, `npm test -- --runInBand` đều pass; Jest 1 suite / 1 test. Android arm64 Gradle build thành công sau khi thêm FileSystem.

### 12.2 Kiểm thử bổ sung và điều kiện review (2026-11-02)

**A — Mất SecureStore key trên Android thật**

- Thêm route phát triển độc lập `/database-key-loss-diagnostic`, file `task00-key-loss-probe-v2.db`, SecureStore alias `kets0.task00.key-loss-probe-v2`. Không sử dụng alias production hoặc alias spike lịch sử.
- Trên Huawei LYA-L29 / Android 10 API 29: tạo DB probe fresh bằng SQLCipher **4.17.0 community**, ghi một giá trị giả, đóng connection; key metadata **32 bytes lowercase hexadecimal**. Xóa đúng alias test nói trên bằng `SecureStore.deleteItemAsync`.
- Lần mở lại chạy qua cùng chuỗi key lifecycle trước khi SQLite open. Kết quả `MISSING_KEY_FOR_EXISTING_DATABASE`; bộ đếm generation **0**, SecureStore writes **0**, SQLite open **0**. Không gọi SQLite sau khi thiếu key, để tránh schema access không có khóa.
- So sánh toàn bộ bytes và kích thước file trước/sau thất bại: giống hệt, **8192 bytes**. Alias vẫn vắng mặt. PASS trên thiết bị thật. DB v1/v2 của riêng test key-loss vẫn được giữ lại; không xóa DB test.

**B — Plaintext SQLite độc lập**

- Không có `sqlite3` CLI cài trên host. Dùng Python `sqlite3` đi kèm SQLite **3.46.1**; `PRAGMA cipher_version` trả `None`, xác nhận build này không có SQLCipher.
- Receiver chỉ bind `127.0.0.1:8099`, nhận hex của ciphertext synthetic DB qua ADB reverse, lưu bản sao `/tmp/task00-sqlcipher-independent.sqlite`. Lệnh thực tế:

  ```sh
  python3 scripts/task00/receive-sqlcipher-probe.py
  adb reverse tcp:8099 tcp:8099
  python3 -c 'import sqlite3; p="file:/tmp/task00-sqlcipher-independent.sqlite?mode=ro"; c=sqlite3.connect(p, uri=True); print("SQLite",sqlite3.sqlite_version,"cipher_version",c.execute("PRAGMA cipher_version").fetchone()); print(c.execute("SELECT name FROM sqlite_master").fetchall())'
  ```

- Kết quả cuối: `SQLite 3.46.1 cipher_version None`, sau đó `sqlite3.DatabaseError: file is not a database` khi đọc `sqlite_master` (exit code 1). Database gốc trên thiết bị không đổi. Đây là bằng chứng độc lập ngoài kiểm tra header.

**C — Candidate key trên bản sao database cũ**

Đã dùng Expo FileSystem `File.copy()` tạo các bản sao `task00-legacy-copy-v6-0.db` đến `-8.db`. Chỉ candidate `.v6` được thử; không giả định các alias/key lịch sử khác. Mỗi bản sao có kích thước bằng nguồn; sau phép thử, toàn bộ bytes của từng file nguồn được so sánh trước/sau và **unchanged=true**.

| File nguồn | Kích thước | Candidate `.v6` trên bản sao | Kết luận |
|---|---:|---|---|
| `task00-sqlcipher-spike.db` | 8192 | SQLite error 26 | `.v6` không mở được schema; key khác (nếu có) chưa thử |
| `task00-sqlcipher-spike-v1.db` | — | Không tồn tại | Không áp dụng |
| `task00-sqlcipher-spike-v2.db` | 8192 | SQLite error 26 | `.v6` không mở được schema; key khác chưa thử |
| `task00-sqlcipher-spike-v3.db` | 8192 | SQLite error 26 | `.v6` không mở được schema; key khác chưa thử |
| `task00-sqlcipher-spike-v4.db` | 8192 | SQLite error 26 | `.v6` không mở được schema; key khác chưa thử |
| `task00-sqlcipher-spike-v5.db` | 8192 | SQLite error 26 | `.v6` không mở được schema; key khác chưa thử |
| `task00-sqlcipher-spike-v6.db` | 8192 | Đọc schema trên bản sao thành công | Candidate `.v6` MATCH về khả năng giải mã |
| `task00-sqlcipher-filediag-303962770ab632dcb4c6095cccd0a471.db` | 8192 | Đọc schema trên bản sao thành công | Candidate `.v6` MATCH về khả năng giải mã |

Không thể kết luận file `.db` hoặc v2–v5 không thể giải mã bằng mọi key; những key khác không có mapping/bằng chứng trong repository và không được thử đoán. File nguồn vẫn chưa bị mở.

**D — iOS**

- Kiểm tra cấu hình `expo-sqlite` SDK 58 cho biết plugin hỗ trợ SQLCipher trên iOS; app config bật `useSQLCipher: true`; `expo-secure-store` có cấu hình nền tảng iOS qua Keychain. `npx expo prebuild --platform ios --no-install` hoàn thành và tạo project iOS; `ios/Podfile.properties.json` có `expo.sqlite.useSQLCipher: true`.
- Host hiện tại là Linux (`x86_64`); `xcodebuild` không có. Không thể chạy CocoaPods/Xcode build hoặc SQLCipher/Keychain runtime trên thiết bị iOS: **BLOCKED**, chưa tuyên bố iOS verified.
- Điều kiện kiểm chứng sau: trên macOS có Xcode/CocoaPods, cài pods/build Development Build từ cùng config; chạy route SQLCipher fresh, key-loss test, Drizzle migration/CRUD/reopen và ghi lại thiết bị/OS/runtime. Không cần thay đổi schema.

**Ma trận bổ sung và trạng thái**

| Hạng mục | Trạng thái | Bằng chứng / điều kiện còn lại |
|---|---|---|
| Thiếu key trên database hiện hữu | VERIFIED | Thiết bị thật; generation/write/SQLite-open đều 0; file byte-for-byte không đổi |
| Không fallback plaintext | VERIFIED | Python SQLite 3.46.1 không có cipher từ chối schema trên bản sao ciphertext |
| `.v6` đối với `spike-v6` và filediag | VERIFIED candidate match | Decrypt/schema read thành công trên bản sao; không mở nguồn |
| `.v6` đối với file fixed và v2–v5 | VERIFIED candidate mismatch | Code 26 trên bản sao; các key khác NOT VERIFIED |
| Khả năng giải mã file fixed và v2–v5 bằng mọi key | NOT VERIFIED | Không có bằng chứng/alias mapping cho các key khác; giữ nguyên nguồn |
| iOS prebuild/config | VERIFIED config-level | Prebuild thành công, plugin `useSQLCipher=true`; không phải runtime evidence |
| iOS build/runtime | BLOCKED | Linux không có Xcode/xcodebuild hoặc thiết bị iOS |

**Rà soát acceptance**

- DONE: Expo SDK/dependencies, TypeScript strict, Expo Router, layered layout, import boundaries, safe logger, hướng dẫn dev, lint/format/type/Jest, Expo Doctor, Android export/build/runtime, SQLCipher, SecureStore lifecycle, Drizzle migration/CRUD/reopen.
- PARTIAL: key `.v6` chỉ kiểm chứng trên các file legacy bằng bản sao; các file không match có thể có key khác chưa xác định.
- BLOCKED: iOS native build và runtime do thiếu macOS/Xcode/thiết bị.
- Root cause cập nhật: `.v6` mở được `task00-sqlcipher-spike-v6.db` và fresh diagnostic file, nhưng nhận code 26 với fixed `.db` và v2–v5. Điều này chứng minh candidate `.v6` không tương ứng để giải mã các file đó; không chứng minh các file hỏng hoặc không có key khác. Giả thuyết key/file mismatch được củng cố nhưng nguyên nhân lịch sử vẫn chưa xác định hoàn toàn.
- Không sửa business rules, ERD, schema tài chính, migration production hoặc production database architecture. Không sửa/xóa/đổi tên các database spike cũ hay key `.v6`.
- **Trạng thái:** chuyển TASK-00 sang **IN REVIEW**, không phải DONE. Điều kiện review: reviewer chấp nhận iOS runtime là BLOCKED trong môi trường hiện tại; các file cũ có candidate khác chưa thử được giữ NOT VERIFIED. Muốn tuyên bố hỗ trợ iOS hoặc phân loại đầy đủ file cũ phải có môi trường/key tương ứng.
- **Hồi quy cuối trên source hiện tại:** `npx tsc --noEmit` PASS; `npx expo lint` PASS; `npm run format:check` PASS; `npm test -- --runInBand` PASS (2 suites / 5 tests); `npx expo-doctor` PASS (20/20); `npx expo install --check` báo dependencies up to date; `npx expo export --platform android` PASS (Android bundle tạo trong `dist`).
- **iOS native generation:** `npx expo prebuild --platform ios --no-install` PASS; Expo tạo `ios/` từ config và không thay `package.json`. Đây chỉ là prebuild/config evidence; `xcodebuild` không có trên host nên chưa compile/chạy runtime.

### 12.3 Quyết định nghiệm thu của owner (2026-11-02)

- **iOS:** Không yêu cầu kiểm thử iOS cho nghiệm thu TASK-00 do repository hiện không có môi trường macOS/Xcode. iOS runtime vẫn **NOT VERIFIED**; đây không được ghi nhận là PASS.
- **Bảo mật database Android:** Các tiêu chí bắt buộc được xác nhận trên Huawei LYA-L29 / Android 10 API 29: DB test mới tạo với SQLCipher và key riêng; truy cập đúng key và đọc lại sau reopen thành công; khi key test bị mất, app trả `MISSING_KEY_FOR_EXISTING_DATABASE`, không sinh/ghi key mới, không mở SQLite và giữ nguyên bytes database; bản sao ciphertext không đọc được bằng SQLite plaintext.
- **Trạng thái:** Giữ **IN REVIEW**, không DONE. Những key khác `.v6` và khả năng giải mã tương ứng của các DB cũ tiếp tục **NOT VERIFIED**; không ảnh hưởng tiêu chí nghiệm thu database test mới đã được owner xác nhận.

### 12.4 Dọn artifact test trên thiết bị (2026-11-02)

- ADB `run-as` không đọc được app sandbox (`/data has wrong owner`), nên dùng Expo FileSystem trong Development Build để stat allowlist trước khi xóa.
- Đã xóa 15 DB chỉ dùng trong test: `task00-drizzle-integration-v1/v2/v3.db`, `task00-key-loss-probe-v1/v2.db`, diagnostic file `task00-sqlcipher-filediag-303962770ab632dcb4c6095cccd0a471.db`, và 9 bản sao `task00-legacy-copy-v6-0.db` đến `-8.db`. Tổng dữ liệu DB xóa: **163840 bytes**. Không có `-wal`, `-shm` hoặc `-journal` sidecar nào tồn tại.
- Đã xóa ba SecureStore alias riêng của integration test v1/v2/v3. Hai alias key-loss test đã vắng mặt từ trước sau khi test xóa đúng key. Không đọc/log giá trị key.
- Chạy preflight lần nữa: toàn bộ file/sidecar test vắng mặt; ba alias integration vắng mặt. Các file `task00-sqlcipher-spike.db`, `task00-sqlcipher-spike-v2.db` đến `-v6.db` vẫn tồn tại, mỗi file **8192 bytes**; SecureStore key `.v6` vẫn có mặt. File `-v1.db` vốn không tồn tại.
- Không mở, sửa, đổi tên hoặc xóa database spike lịch sử. Route cleanup tạm thời đã được gỡ khỏi source sau khi hoàn tất; không để lại chức năng xóa test artifact trong app.

### 12.1 Kết quả nghiệm thu SQLCipher + Drizzle (2026-11-02)

**Thiết bị và lệnh thực tế**

- Thiết bị: Huawei LYA-L29 (`LHS7N18A23002591`), Android 10 / API 29, Development Build `com.anonymous.fintech`.
- Build: `ANDROID_HOME=/home/user/Android/Sdk ./android/gradlew -p android assembleDebug --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a` — `BUILD SUCCESSFUL`; cài bằng `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
- Chạy JS: `npx expo start --dev-client --localhost`, `adb reverse tcp:8081 tcp:8081`; mở route `/database-file-diagnostic` trên thiết bị.
- Chất lượng: `npx tsc --noEmit` PASS; `npx expo lint` PASS (đã bỏ warning import thừa); `npm run format:check` PASS; `npm test -- --runInBand` PASS (2 suites, 5 tests); `npx expo-doctor` PASS (20/20).
- iOS: NOT VERIFIED; chưa có build hoặc thiết bị iOS trong lần nghiệm thu này.

**Giai đoạn A — Metadata database spike cũ (chỉ đọc)**

Đã stat bằng Expo FileSystem từ ứng dụng, không mở SQLite, không đọc nội dung, không xóa/ghi/đổi tên. Tất cả file cũ được giữ nguyên:

| File | Kết quả |
|---|---|
| `task00-sqlcipher-spike.db` | Tồn tại, 8192 bytes |
| `task00-sqlcipher-spike-v1.db` | Không tồn tại |
| `task00-sqlcipher-spike-v2.db` đến `-v6.db` | Mỗi file tồn tại, 8192 bytes |
| `task00-sqlcipher-filediag-303962770ab632dcb4c6095cccd0a471.db` | Tồn tại, 8192 bytes |
| SecureStore key `.v6` | Có mặt; giá trị không đọc ra report |

Các metadata trên không chứng minh nội dung DB cũ giải mã được hay key tương ứng với file. Vì vậy trạng thái/khả năng giải mã các DB cũ vẫn **NOT VERIFIED** và không có thay đổi nào thực hiện trên chúng.

**Giai đoạn B — Key lifecycle**

- Thêm `resolveDatabaseKey`: kiểm tra DB có tồn tại trước khi quyết định sinh key; key hiện hữu phải là 32-byte raw key biểu diễn bằng 64 ký tự hex chữ thường.
- DB mới + chưa có key: tạo và lưu key một lần. DB đã tồn tại + mất key: ném `MISSING_KEY_FOR_EXISTING_DATABASE`, không sinh hoặc ghi đè key. Stored key sai định dạng cũng fail closed.
- Unit tests: tạo key cho DB mới PASS; tái sử dụng key PASS; DB hiện hữu thiếu key không tạo key PASS; key lưu sai định dạng không bị thay thế PASS.
- Không xóa key SecureStore thật để mô phỏng mất key. Trường hợp mất key trên thiết bị thật: **NOT VERIFIED**; hành vi resolver được kiểm tra bằng fake SecureStore trong Jest.

**Giai đoạn C — Drizzle integration**

- Runner dùng file tách biệt `task00-drizzle-integration-v3.db` và key SecureStore riêng; không đụng file/key spike cũ. Một lượt fresh ghi nhận `existed=false`, key mới được tạo; file cuối **16384 bytes**. Lượt tiếp theo ghi nhận file đã tồn tại và dùng lại key, chứng minh đường đi DB đã migrate.
- Runtime SQLCipher **4.17.0 community**. Mỗi connection kiểm tra `PRAGMA cipher_version` trước khi cấp raw key. Ở connection đầu, ngay sau cấp key là `PRAGMA user_version = 0`; không dùng lệnh cấp key hoặc cipher version làm bằng chứng giải mã.
- Drizzle migration probe tạo duy nhất `task00_spike_probe`; chạy migration lần đầu PASS, chạy lại migration PASS. Không có schema ledger/production.
- Drizzle insert/select PASS; đóng connection PASS; mở lại cùng file bằng cùng key, tạo Drizzle instance và đọc lại đúng giá trị PASS.
- Connection riêng cấp key sai: schema read bị từ chối với SQLite error code **26**. Raw key dài **32 bytes**, dạng **lowercase hexadecimal**; report không chứa giá trị key.
- Kiểm tra 16-byte header không phát hiện plaintext header `SQLite format 3\0` — PASS cho kiểm tra fallback plaintext.
- Không có phép đo độc lập bằng SQLite plaintext CLI; kết quả header là kiểm tra định dạng sơ bộ, không khẳng định mọi nội dung file đã được giải mã/đọc bằng một SQLite plaintext engine.

**Ma trận ca nghiệm thu**

| Ca | Kết quả | Bằng chứng / giới hạn |
|---|---|---|
| Fresh database | PASS | DB v3 ban đầu vắng mặt; tạo bằng key mới trên thiết bị |
| Migration thành công | PASS | Drizzle migrator tạo probe table |
| Drizzle insert/select | PASS | Cùng connection đã cấp key |
| Reopen/persistence | PASS | Đóng, mở lại, cấp cùng key, đọc dữ liệu đã ghi |
| Database đã migrate | PASS | Lượt chạy kế tiếp: file đã tồn tại, key tái sử dụng, migration chạy lại thành công |
| Wrong key | PASS | Connection riêng; schema read trả SQLite error 26 |
| Missing key trên DB mới | PASS | Unit test resolver xác nhận tạo/lưu key cho DB mới |
| DB tồn tại nhưng SecureStore mất key | PASS (unit); thiết bị NOT VERIFIED | Unit test xác nhận fail closed và không sinh/ghi key; không xóa key thật để thử |
| Không fallback SQLite plaintext | PASS (header check) | Header plaintext không có; chưa dùng plaintext SQLite CLI độc lập |

**Nhật ký cập nhật**

- **Done:** Thống nhất hai route development hiện có dùng một integration runner; route legacy không còn mở file spike cố định. Runner chỉ stat file cũ, sau đó dùng database/key riêng.
- **Done:** Đã xử lý lỗi URI của Expo FileSystem SDK 58 bằng URI tuyệt đối; lỗi phát hiện ở smoke test dừng trước khi mở database.
- **Doing:** TASK-00 giữ trạng thái **IN PROGRESS**. Các ca Drizzle, migration, persistence và logic fail-closed có bằng chứng; trạng thái giải mã các file cũ, mất key vật lý trên thiết bị, kiểm tra plaintext độc lập và iOS còn giới hạn/chưa xác minh.
- **Next:** Không chuyển TASK-01 hoặc tạo schema nghiệp vụ trong phạm vi này. Có thể xem xét IN REVIEW sau khi người phụ trách chấp nhận các giới hạn NOT VERIFIED nêu trên hoặc bổ sung môi trường để kiểm tra chúng.
- **Root cause — dữ kiện:** Cùng binary/runtime SQLCipher 4.17.0, raw-key và SecureStore đều chạy thành công trên DB v3 mới; các file spike cũ chỉ được xác định là tồn tại và có kích thước, không được mở.
- **Root cause — giả thuyết:** Lỗi `file is not a database` trước đây có thể gắn với trạng thái file/key cũ hoặc các lượt thử định dạng key trước đó. Metadata hiện có không đủ để kết luận nguyên nhân chính xác. Chưa thực hiện thay đổi production database architecture, migration production hoặc Drizzle production integration.
- **Rủi ro:** Database test v1/v2/v3 cùng các file spike lịch sử vẫn tồn tại trong app sandbox; không xóa chúng. Device-specific key-loss và iOS chưa được kiểm tra.
