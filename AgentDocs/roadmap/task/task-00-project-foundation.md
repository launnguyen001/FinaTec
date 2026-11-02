# TASK-00 — Nền tảng dự án

- **Giai đoạn:** 0 — Nền tảng dự án
- **Ưu tiên:** P0
- **Trạng thái:** ANALYSIS
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
- [ ] Đã rà soát và ghi nhận baseline repo.
- [ ] TypeScript strict mode được cấu hình.
- [ ] Expo Router chạy được với route gốc.
- [ ] Cấu trúc source tuân thủ kiến trúc phân lớp.
- [ ] Có script lint, format, type-check và unit test.
- [ ] Các kiểm tra code nền chạy thành công.
- [ ] Android Development Build chạy được theo quy trình có thể tái lập.
- [ ] Đã chứng minh SQLCipher có mặt trong native binary bằng cipher runtime check.
- [ ] Mở/đóng DB và migration thử nghiệm thành công.
- [ ] Khóa được quản lý ngoài mã nguồn và không xuất hiện trong log.
- [ ] Có kết quả kiểm tra tương thích iOS hoặc ghi rõ chưa kiểm chứng.
- [ ] Rủi ro và quyết định còn mở được ghi nhận.

## 12. Nhật ký tiến độ
- **Đã làm:** Đọc đặc tả, roadmap, task, `AGENTS.md`, `package.json`, lockfile, `app.json`, `App.js`, `index.js`, `.gitignore`.
- **Đã làm:** Xác định baseline Expo SDK 58 / React Native 0.88.1 / React 19.3.0; xác nhận dự án hiện là JavaScript tối giản, chưa có Router, TypeScript, database và test scripts.
- **Đã làm:** Tạo nhánh thực hiện riêng `task/00-project-foundation`; chưa sửa `main`.
- **Đang làm:** Phân tích tương thích và chuẩn bị phương án triển khai theo từng chặng.
- **Tiếp theo:** Thực hiện Chặng A trên nhánh task; sau đó dựng Development Build để kiểm chứng SQLCipher.
- **Vấn đề:** Chưa có kết quả build/test trên thiết bị; chưa xác nhận key lifecycle hoàn chỉnh.
- **Quyết định tạm thời:** Giữ Expo SDK 58, React Native 0.88.1, React 19.3.0 và npm; không nâng/hạ phiên bản nếu chưa có bằng chứng blocker.
- **Kiểm chứng:** Chưa chạy build, lint, type-check hoặc test trong runtime dự án.