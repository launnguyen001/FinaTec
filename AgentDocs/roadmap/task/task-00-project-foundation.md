# TASK-00 — Nền tảng dự án

- **Giai đoạn:** 0 — Nền tảng dự án
- **Ưu tiên:** P0
- **Trạng thái:** IN PROGRESS
- **Ước lượng:** 1–2 tuần (ước lượng lập kế hoạch)
- **Roadmap nguồn:** `AgentDocs/roadmap/plan.md`
- **Đặc tả nguồn:** Tài liệu đặc tả ứng dụng trong `AgentDocs/core/`

## 1. Mục tiêu
Thiết lập nền tảng phát triển Android/iOS có thể tái lập và kiểm chứng. Rà soát dự án Expo hiện tại, đồng thời xác minh khả năng tích hợp cơ sở dữ liệu cục bộ có mã hóa trước khi triển khai nghiệp vụ tài chính.

## 2. Phạm vi
**Bao gồm**
- Kiểm tra cấu trúc repo, Expo SDK, React Native, trình quản lý gói, entry point và trạng thái build hiện tại.
- Thiết lập TypeScript strict mode và lộ trình chuyển đổi an toàn từ JavaScript; không viết lại phần đang hoạt động nếu không cần thiết.
- Cấu hình Expo Router và cấu trúc mã nguồn theo kiến trúc đã thống nhất.
- Thiết lập lint, format, type-check, unit test và tài liệu hướng dẫn chạy.
- Thực hiện technical spike cho SQLite + SQLCipher + Drizzle trên Expo Development Build: mở/đóng DB, kiểm tra mã hóa, khả năng quản lý khóa và chạy migration thử nghiệm.
- Xây dựng design token, typography, spacing và các UI primitive tối thiểu.
- Thiết lập quy tắc log an toàn và quy trình build Android.

**Không bao gồm**
- Triển khai tính năng tài chính, schema ledger production hay backup production.
- Tích hợp nhà cung cấp giá thị trường.
- Thay thế Expo hoặc bổ sung backend.

## 3. Phụ thuộc
- Không có task phụ thuộc trước đó.
- Các ràng buộc sản phẩm và kiến trúc phải tuân theo đặc tả và roadmap. Mọi lựa chọn chưa rõ phải được ghi nhận, không tự suy diễn.

## 4. Bối cảnh cần kiểm tra
- `package.json`, lockfile, `app.json`, `App.js`, `index.js`, `AGENTS.md`, `.gitignore`, assets và luồng khởi động hiện tại.
- Phiên bản Expo SDK/React Native và tài liệu tương thích đúng phiên bản cho các API native được sử dụng.
- Cấu trúc thư mục hiện tại trước khi bổ sung `src/`.

## 5. Thay đổi dự kiến
- Cấu hình TypeScript, compiler strict mode và Expo Router sau khi rà soát tương thích.
- Thiết lập các ranh giới `app`, `presentation`, `application`, `domain`, `infrastructure`, `shared` và thư mục test theo cấu trúc được duyệt.
- Bổ sung script lint/format/type-check/test và smoke test tối thiểu.
- Tạo technical spike DB tách biệt khỏi domain production.
- Ghi lại chính xác các lệnh phát triển và yêu cầu Development Build.

## 6. Quy tắc nghiệp vụ và kỹ thuật
- Dữ liệu tài chính cốt lõi được lưu cục bộ; không gửi dữ liệu tài chính người dùng lên server.
- Không mặc định Expo Go hỗ trợ SQLCipher hoặc native module khác.
- Cài dependency tương thích Expo và dùng tài liệu Expo đúng phiên bản.
- Không dùng số thực dấu phẩy động thông thường để tính toán tiền.
- Log không được chứa số dư, mô tả giao dịch, PIN, khóa mã hóa hoặc dữ liệu tài chính nhạy cảm.

## 7. Thay đổi dữ liệu
Chưa tạo schema production. Spike chỉ được dùng database thử nghiệm có thể xóa và một migration kiểm chứng.

## 8. Kế hoạch triển khai
1. Kiểm kê ứng dụng và ghi nhận trạng thái build/start/type/lint ban đầu.
2. Xác nhận phiên bản Expo SDK và React Native; kiểm tra tài liệu tương ứng.
3. Chốt cách áp dụng TypeScript và lộ trình chuyển đổi routing.
4. Cấu hình cấu trúc dự án và quality gate với mức thay đổi tối thiểu.
5. Tạo thử nghiệm SQLite, SQLCipher và Drizzle trên Development Build.
6. Kiểm chứng mã hóa, ranh giới lưu khóa, mở/đóng DB và migration.
7. Thiết lập nền tảng giao diện và màn hình khởi chạy tối thiểu.
8. Ghi nhận kết quả tương thích, quyết định, rủi ro và việc cần làm tiếp.

## 9. Kế hoạch kiểm thử
- Cài đặt sạch và chạy ứng dụng trên Android Development Build.
- Chạy type-check, lint, formatter check và unit test nền.
- Kiểm thử khởi động ứng dụng và điều hướng cơ bản.
- Kiểm thử tạo/mở/đóng/mở lại database và migration.
- Xác minh khóa sai hoặc thiếu không thể đọc database đã mã hóa (nếu thư viện SQLCipher được chọn hỗ trợ kiểm chứng này).
- Xác minh dữ liệu tài chính thử nghiệm không xuất hiện trong log.
- Ghi riêng kết quả khả thi trên iOS; không tuyên bố đã kiểm thử iOS nếu chỉ chạy Android.

## 10. Tiêu chí nghiệm thu
- [ ] Đã rà soát ứng dụng và dependency hiện tại.
- [ ] Android Development Build chạy được theo quy trình có thể tái lập.
- [ ] TypeScript strict mode được cấu hình hoặc có lộ trình chuyển đổi rõ ràng, có lý do.
- [ ] Expo Router và ranh giới source được thiết lập, không đặt nghiệp vụ trong UI.
- [ ] Các lệnh lint, type-check và test nền chạy thành công.
- [ ] Đã chứng minh khả năng tương thích SQLite + SQLCipher + Drizzle trên Development Build, hoặc ghi rõ blocker và phương án thay thế.
- [ ] Kiểm thử mở/đóng DB và migration thành công.
- [ ] Quy tắc log an toàn và lệnh phát triển được tài liệu hóa.
- [ ] Quyết định và rủi ro chưa xử lý được ghi nhận để review.

## 11. Nhật ký tiến độ
- **Đã làm:** Tạo task theo Giai đoạn 0 của roadmap.
- **Đang làm:** Rà soát repo/toolchain và technical spike database.
- **Tiếp theo:** Hoàn tất đánh giá tương thích và triển khai nền tảng.
- **Vấn đề:** Repo hiện có nền JavaScript Expo; cần xác minh trạng thái thực tế trước khi chuyển đổi.
- **Kiểm chứng:** Chưa chạy.