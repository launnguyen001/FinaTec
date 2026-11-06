# TASK-06 — Ghi chú kiến trúc: tiền đề bảo mật, khôi phục khóa và backup

- **Loại tài liệu:** Architecture note / implementation constraints
- **Vị trí:** Sau TASK-06 và trước TASK-07 trong thư mục roadmap/task
- **Trạng thái:** PROPOSED — cần duyệt trước khi triển khai
- **Phạm vi:** Ghi nhận quyết định và công việc phụ thuộc; **không** thay đổi trạng thái nghiệm thu TASK-00–06, không mở rộng phạm vi nghiệp vụ TASK-07.
- **Task triển khai chính:** TASK-09 — Bảo mật, sao lưu và an toàn dữ liệu

## 1. Mục đích

FinaTec là ứng dụng offline-first, privacy-first và không có máy chủ lưu dữ liệu tài chính cá nhân. Vì vậy, khả năng khôi phục dữ liệu phải dựa trên cơ chế mã hóa và bản sao lưu do người dùng tự quản lý, không dựa vào tài khoản FinaTec hoặc server recovery.

Cần phân biệt hai tình huống:

1. **On-device key recovery:** database vẫn còn trên thiết bị hiện tại nhưng SecureStore không còn cung cấp database key.
2. **Cross-device data recovery:** thiết bị cũ bị mất/hỏng/đổi mới; người dùng cần chuyển dữ liệu sang thiết bị khác mà không có FinaTec server.

Recovery Key không thể tự tái tạo dữ liệu đã mất. Khôi phục thiết bị mới cần đồng thời có encrypted backup và Recovery Key tương ứng.

## 2. Quyết định kiến trúc cần giữ

### 2.1 Phân tách các loại khóa và xác thực

- **DEK (Data Encryption Key):** khóa ngẫu nhiên dùng để mã hóa SQLCipher database.
- **Recovery Key:** bí mật có entropy cao, được tạo bằng CSPRNG và giao cho người dùng lưu trữ. Không lưu Recovery Key dạng rõ trong database, SecureStore, log hoặc backup package.
- **KEK (Key Encryption Key):** khóa dẫn xuất từ Recovery Key bằng KDF có salt và tham số được lưu trong metadata. KEK chỉ dùng để bọc/mở DEK, không thay thế DEK.
- **PIN / Biometric:** lớp xác thực và kiểm soát truy cập ứng dụng. Không dùng PIN hoặc dữ liệu sinh trắc học làm DEK/Recovery Key; không để việc đổi biometric trở thành điều kiện duy nhất để khôi phục database.

Cần chọn thuật toán và tham số cụ thể sau khi kiểm tra khả năng tương thích Expo/React Native/native build. Ưu tiên KDF phù hợp cho bí mật người dùng và AEAD có xác thực (ví dụ Argon2id hoặc lựa chọn tương thích đã được security review; AES-256-GCM hoặc XChaCha20-Poly1305). Không tự triển khai primitive mật mã.

### 2.2 Key envelope

Khi người dùng thiết lập recovery trong lúc database đang mở hợp lệ:

1. Lấy DEK hiện tại từ key lifecycle đã được xác minh.
2. Sinh Recovery Key ngẫu nhiên; hiển thị để người dùng lưu trữ.
3. Dẫn xuất KEK từ Recovery Key, salt và KDF parameters.
4. Mã hóa/wrap DEK bằng AEAD; lưu key envelope gồm ciphertext, nonce, salt, KDF parameters, thuật toán và version.
5. Yêu cầu người dùng xác nhận đã lưu Recovery Key; nên có bước kiểm tra khôi phục bằng cách nhập lại hoặc xác minh challenge trước khi đánh dấu recovery đã thiết lập.

Recovery Key không được gửi lên server vì FinaTec không có server lưu dữ liệu và không được tạo backdoor hỗ trợ giải mã.

### 2.3 Fail-closed và phân loại lỗi

- Database hiện hữu nhưng SecureStore key bị thiếu/không hợp lệ: tuyệt đối không tự sinh DEK mới, không xóa database và không tự reset dữ liệu.
- Phân biệt tối thiểu: missing SecureStore item; SecureStore access/platform error; key sai định dạng; DEK không mở được database; database corruption; backup hỏng hoặc không tương thích.
- Chỉ báo “key mất” khi có bằng chứng phù hợp; không gom mọi lỗi mở database thành key loss.
- Recovery chỉ được coi là thành công sau khi mở database và xác minh integrity/schema thành công.
- Nếu không có Recovery Key đã thiết lập trước đó hoặc không có backup, phải giải thích rõ rằng không thể khôi phục bằng mật mã; không hứa hẹn có thể lấy lại dữ liệu.

## 3. Khôi phục trên thiết bị hiện tại

Điều kiện: database file còn tồn tại và người dùng đã thiết lập Recovery Key trước khi SecureStore key gặp sự cố.

Luồng dự kiến:

1. Phát hiện SecureStore key không khả dụng; giữ nguyên database và chuyển sang recovery state.
2. Người dùng nhập Recovery Key.
3. Dùng KDF metadata để dẫn xuất KEK và mở key envelope.
4. Thử mở SQLCipher database bằng DEK vừa khôi phục.
5. Chạy kiểm tra integrity và schema/migration compatibility.
6. Chỉ sau khi xác minh thành công mới lưu lại DEK vào SecureStore hiện tại.
7. Ghi nhận kết quả recovery mà không ghi bí mật vào log.

Nếu bước nào thất bại, giữ nguyên database, envelope và trạng thái hiện tại; không ghi đè khóa hoặc tự tạo database mới.

## 4. Khôi phục trên thiết bị mới — không cần FinaTec server

Recovery Key một mình không mang theo dữ liệu. Người dùng phải tự chuyển cả backup đã mã hóa sang thiết bị mới.

### 4.1 Backup package

Định nghĩa package có version, tối thiểu gồm:

- Database snapshot đã mã hóa bằng SQLCipher.
- Key envelope chứa DEK đã được bọc bằng KEK từ Recovery Key.
- Manifest metadata: format version, schema/migration version, cipher/KDF/AEAD identifiers, salt, nonce và tham số cần thiết.
- Integrity/authentication metadata; không lưu Recovery Key hoặc KEK dạng rõ.

Trước khi tạo snapshot phải xử lý transaction/WAL theo cơ chế SQLite/SQLCipher an toàn để backup nhất quán. Không copy tùy tiện riêng file database khi còn WAL chưa checkpoint.

### 4.2 Người dùng tự vận chuyển và lưu trữ

FinaTec cung cấp thao tác export/import file qua hệ thống file picker/share sheet. Người dùng tự chọn nơi lưu/chuyển: USB, máy tính, ổ cứng, hoặc dịch vụ lưu file như Google Drive/OneDrive do người dùng kiểm soát.

Các dịch vụ này chỉ là nơi chứa ciphertext; không phải backend của FinaTec. Không yêu cầu đăng nhập tài khoản FinaTec, không upload dữ liệu tài chính lên server của sản phẩm và không gửi Recovery Key cùng package trong cùng một kênh không an toàn.

Có thể cung cấp QR/printable representation cho Recovery Key như định dạng tiện lưu trữ; QR không phải cơ chế bảo mật riêng và phải được cảnh báo rằng người có bản QR có thể khôi phục dữ liệu.

### 4.3 Restore trên thiết bị mới

1. Người dùng chọn encrypted backup và nhập Recovery Key.
2. Kiểm tra package format/version trước khi giải mã.
3. Dẫn xuất KEK và mở key envelope để lấy DEK.
4. Giải mã/kiểm tra database trong vùng tạm.
5. Mở database bằng SQLCipher; chạy integrity, foreign-key và schema compatibility checks.
6. Chỉ sau khi tất cả kiểm tra đạt mới chuyển database vào vị trí hoạt động và thiết lập SecureStore key mới trên thiết bị đích.
7. Nếu restore thất bại hoặc bị gián đoạn, không làm hỏng database đang sử dụng; giữ nguyên backup nguồn.

Không mô tả đây là đồng bộ đa thiết bị: MVP/V1 chỉ hỗ trợ backup/restore thủ công, không merge dữ liệu hoặc đồng bộ hai chiều.

## 5. Công việc cần làm trước TASK-07

Chỉ thực hiện các công việc nền tảng có ảnh hưởng trực tiếp đến kiến trúc; không triển khai toàn bộ Recovery UX/Backup trong giai đoạn này.

- [ ] Kiểm tra trạng thái remediation F-06 trên `main`: production và diagnostics phải dùng chung một key-lifecycle resolver đã được test; xác minh code thực tế trên `main`, không dựa riêng vào báo cáo của branch khác.
- [ ] Nếu F-06 chưa có trên `main`, hoàn tất việc hợp nhất resolver production/spike, validate generated key và test fail-closed như một remediation độc lập trước khi TASK-07 bắt đầu.
- [ ] Giữ invariant: database tồn tại + key thiếu/không hợp lệ không được tự sinh key mới, reset hoặc xóa dữ liệu.
- [ ] Tài liệu hóa trạng thái và ranh giới trách nhiệm của Database Initialization, SecureStore Adapter và Key Lifecycle; tránh để presentation/UI tự thao tác khóa.
- [ ] Chốt contract/interface ở mức cần thiết để sau này có thể bổ sung key envelope/recovery mà không buộc các feature nghiệp vụ phụ thuộc SecureStore trực tiếp.
- [ ] Xác minh thứ tự khởi tạo: key phải được lưu bền vững trước khi tạo/mở database mới; xử lý lỗi giữa chừng và khởi tạo lặp phải an toàn.
- [ ] Ghi rõ các failure state cần phân biệt và nguyên tắc không phá hủy dữ liệu.
- [ ] Không thay đổi thuật toán mã hóa, định dạng database hoặc migration đang phát hành chỉ vì dự đoán; mọi thay đổi cần ADR, migration/compatibility plan và regression tests.

**Exit gate trước TASK-07:** key lifecycle dùng chung đã được xác minh trên branch `main`; test production resolver chứng minh các trường hợp missing/invalid key fail-closed; không có hành vi tự reset database; các interface và failure states được tài liệu hóa. Nếu các điều kiện này đã đạt, không cần tạo thêm thay đổi code chỉ để “làm trước” Recovery.

## 6. Phân bổ phạm vi theo task

### TASK-00 / remediation sau audit — tiền đề kỹ thuật

- Duy trì SQLCipher initialization và SecureStore adapter.
- Hợp nhất production/spike key lifecycle resolver và test đúng module production (finding F-06).
- Đảm bảo missing/invalid key trên database hiện hữu luôn fail-closed.
- Đây là remediation/architecture hardening, không phải triển khai đầy đủ Recovery Key.

### TASK-06 — không mở rộng nghiệp vụ Liability

- Không thêm logic Recovery, PIN hoặc Backup vào Liability Engine.
- Tài liệu này chỉ được đặt sau TASK-06 để ghi nhận các ràng buộc bảo mật trước TASK-07; không thay đổi acceptance/status của TASK-06.

### TASK-07 — Recurring & Budget

- Giữ nguyên phạm vi nghiệp vụ hiện tại.
- Không thêm PIN, biometric, Recovery Key, backup hoặc restore.
- Không để recurring processor phụ thuộc trực tiếp vào key storage; tất cả thao tác vẫn đi qua database/runtime abstraction hiện hành.
- Đảm bảo retry/catch-up không tự khởi tạo database hoặc thay đổi key lifecycle.

### TASK-08 — Reports & Reconciliation

- Giữ nguyên phạm vi báo cáo/đối soát.
- Nếu triển khai CSV/PDF export, phải áp dụng chính sách bảo vệ file và cảnh báo dữ liệu nhạy cảm; không mặc định file export là encrypted backup.
- Không đưa Recovery Key, DEK, KEK hoặc key envelope vào báo cáo/export nghiệp vụ.

### TASK-09 — Security, Backup & Data Safety (task triển khai chính)

Bổ sung/chi tiết hóa các hạng mục sau vào task này:

1. **Threat model & key lifecycle:** phân biệt DEK/KEK/Recovery Key/PIN/biometric; mô tả mất thiết bị, mất SecureStore item, app uninstall/clear data, backup/restore hệ điều hành, thiết bị mới và database corruption.
2. **Recovery setup:** sinh Recovery Key, hiển thị một lần, hướng dẫn lưu trữ an toàn, xác nhận người dùng đã lưu và kiểm tra khôi phục.
3. **On-device recovery:** khôi phục DEK từ key envelope khi SecureStore key không khả dụng; chỉ ghi lại SecureStore sau khi xác minh database.
4. **Encrypted backup:** snapshot nhất quán, package format/version, key envelope, metadata và integrity/authentication.
5. **Cross-device restore:** import backup + Recovery Key trên cài đặt sạch/thiết bị mới; thiết lập SecureStore key mới sau khi restore thành công.
6. **Failure safety:** backup hỏng, sai Recovery Key, KDF/format không hỗ trợ, migration lỗi, hết dung lượng, app bị kill giữa restore; rollback/giữ nguyên database hiện tại.
7. **User guidance:** giải thích rõ FinaTec không có server recovery; người dùng phải tự giữ backup và Recovery Key ở hai nơi/kênh phù hợp; mất cả hai thì không thể khôi phục.
8. **PIN/biometric:** triển khai như app access control, có fallback và chính sách lock; không dùng chúng làm cơ chế backup/recovery độc lập.

## 7. Acceptance criteria cần bổ sung cho TASK-09

- [ ] Người dùng có thể thiết lập Recovery Key khi database đang mở hợp lệ; Recovery Key có entropy cao và không bị lưu dạng rõ trong app storage/log.
- [ ] Recovery Key có thể được xác minh trong quá trình setup; UI nêu rõ trách nhiệm lưu trữ và hậu quả khi mất.
- [ ] Mất SecureStore key nhưng database còn và có recovery envelope: khôi phục được trên cùng thiết bị.
- [ ] Database hiện hữu nhưng không có Recovery Key/envelope: ứng dụng fail-closed, không tự tạo key mới, không xóa/ghi đè database.
- [ ] Export tạo package nhất quán, có version và xác thực tính toàn vẹn.
- [ ] Backup từ thiết bị A restore thành công trên thiết bị B bằng Recovery Key, không cần FinaTec account/server.
- [ ] Sai Recovery Key, file bị sửa/hỏng, version không hỗ trợ hoặc restore bị ngắt đều bị từ chối an toàn.
- [ ] Restore thất bại không làm thay đổi database đang hoạt động; chỉ promote database tạm sau khi toàn bộ kiểm tra thành công.
- [ ] Sau restore thành công, thiết bị mới có SecureStore key riêng; backup cũ vẫn có thể được giữ để phục hồi lại.
- [ ] Có kiểm thử dữ liệu tài chính sau restore: account balances, journal entries/lines, assets/lots, liabilities/repayments, recurring/budget records và quan hệ khóa ngoại phải nhất quán.
- [ ] Có kiểm thử backup/restore giữa các phiên bản schema được hỗ trợ và quy định rõ version không còn hỗ trợ.
- [ ] Không có dữ liệu tài chính, Recovery Key, DEK hoặc KEK bị ghi vào log hoặc gửi tới network ngoài dự kiến.

## 8. Những điều không được giả định

- SecureStore key mất không đồng nghĩa database đã mất; database file có thể vẫn còn.
- Cài lại ứng dụng/clear app data, factory reset hoặc chuyển thiết bị có thể làm mất khả năng truy cập SecureStore key; không được giả định key có thể backup/restore cùng Android app data.
- Thay đổi PIN hoặc biometric không mặc nhiên làm SecureStore key hiện tại mất hiệu lực; hành vi phụ thuộc cấu hình authentication-bound key cụ thể.
- Không được hứa hẹn khôi phục khi không có backup hoặc Recovery Key.
- Không có FinaTec server không đồng nghĩa không thể restore thiết bị mới; người dùng tự vận chuyển encrypted backup.
- Backup/restore thủ công không phải multi-device sync và không tự giải quyết xung đột giữa hai bản database.

## 9. Trình tự triển khai khuyến nghị

1. Trước TASK-07: xác minh/hoàn tất F-06 shared key lifecycle trên `main`, chốt ADR và interface/failure-state contracts.
2. TASK-07: triển khai Recurring & Budget theo đúng scope hiện tại.
3. TASK-08: triển khai Reports & Reconciliation; giữ chính sách file export tách biệt với encrypted backup.
4. TASK-09: triển khai theo thứ tự threat model → key envelope/Recovery Key setup → on-device recovery → backup package → cross-device restore → PIN/biometric integration và security acceptance.
5. Trước release: chạy acceptance trên thiết bị thật, bao gồm mất SecureStore key, restore cùng thiết bị, restore từ thiết bị A sang B và các ca backup hỏng/khôi phục bị gián đoạn.

**Kết luận:** chốt kiến trúc và đóng các tiền đề key lifecycle trước TASK-07; triển khai đầy đủ Recovery Key và backup/restore trong TASK-09. Không trì hoãn quyết định kiến trúc, nhưng cũng không kéo toàn bộ phạm vi bảo mật vào TASK-07.


---

## 10. Addendum rà soát ngày 2026-11-06 — các điểm cần hoàn thiện

> **Mục đích:** Ghi lại các thiếu sót/điểm chưa chốt được phát hiện trong buổi rà soát hôm nay để owner xem xét trước khi phê duyệt architecture baseline. Đây là ghi chú bổ sung, không tự biến các đề xuất dưới đây thành quyết định kiến trúc đã được chấp thuận. Không sửa nội dung hoặc trạng thái của TASK-00–09.

### 10.1 Các điểm thiết kế còn thiếu hoặc cần chốt

1. **Vị trí lưu key envelope cho on-device recovery**
   - Chưa quy định envelope được lưu ở đâu để vẫn đọc được khi SecureStore không còn cung cấp DEK.
   - Cần xem xét lưu một bản envelope trong app-private storage độc lập với SecureStore; encrypted backup cũng phải chứa envelope.
   - Không được lưu Recovery Key/KEK dạng rõ. Nếu envelope local bị mất/hỏng thì phải xử lý như một failure state riêng; không giả định có thể khôi phục chỉ từ database.
   - Owner cần chốt retention, atomic write và cách version hóa envelope.

2. **Xác thực manifest và metadata của backup**
   - Cần xác định chính xác metadata nào được xác thực, không chỉ kiểm tra format bằng logic thông thường.
   - Các trường cần được ràng buộc với cơ chế xác thực mật mã gồm package format/version, cipher/KDF/AEAD identifiers, KDF parameters, salt, nonce, schema/migration version và database ciphertext.
   - Khi dùng AEAD, cần đánh giá đưa metadata phù hợp vào Associated Authenticated Data (AAD), hoặc dùng cơ chế xác thực tương đương đã được security review.
   - Thay đổi metadata quan trọng phải bị phát hiện trước khi restore/promote database.

3. **KDF phải phù hợp với loại Recovery Key**
   - Tài liệu hiện xác định Recovery Key là bí mật ngẫu nhiên entropy cao, nhưng ví dụ KDF đang đặt Argon2id cạnh các lựa chọn tương thích mà chưa phân biệt rõ loại đầu vào.
   - Nếu Recovery Key là random secret có entropy cao, cần đánh giá KDF/key-derivation phù hợp như HKDF; nếu cho phép passphrase do người dùng tự đặt thì cần password-hardening KDF như Argon2id hoặc lựa chọn đã được security review.
   - Không dùng cùng một cấu hình theo mặc định cho random Recovery Key và human-memorable passphrase. Không tự triển khai primitive mật mã; phải kiểm tra native compatibility và tham số trên Expo/React Native.

4. **Làm rõ DEK sau cross-device restore**
   - Cần chốt MVP/V1 có giữ nguyên DEK được mở từ envelope hay re-encrypt database bằng DEK mới trên thiết bị đích.
   - Đề xuất đơn giản cho MVP: giữ nguyên DEK của backup, xác minh database thành công rồi lưu DEK đó vào SecureStore riêng của thiết bị đích. Như vậy “SecureStore key riêng” nghĩa là bản lưu trữ theo thiết bị, không phải một DEK khác.
   - Nếu muốn sinh DEK mới, phải có quy trình re-encrypt toàn bộ database, tạo envelope mới và acceptance riêng; không để implementation tự suy diễn.

5. **Atomic restore, WAL và rollback**
   - Cần mô tả rõ staging database, xử lý WAL/SHM và đóng mọi connection trước khi promote.
   - Restore phải xác minh package, SQLCipher open, integrity, foreign keys và schema compatibility trên vùng tạm.
   - Chỉ promote sau khi toàn bộ kiểm tra thành công; cần có recovery/rollback strategy nếu app bị kill, hết dung lượng hoặc lỗi trong giai đoạn promote.
   - Database đang hoạt động và backup nguồn phải được giữ nguyên khi restore thất bại. Không copy riêng database file khi WAL có thể còn dữ liệu chưa checkpoint.

6. **Bổ sung các acceptance case chuyên biệt**
   - SecureStore key mất nhưng local envelope còn.
   - SecureStore key và local envelope đều mất.
   - Envelope/manifest bị sửa hoặc sai version.
   - Database ciphertext bị sửa/hỏng.
   - Sai Recovery Key hoặc KDF parameters không hỗ trợ.
   - App bị kill/hết dung lượng trong lúc restore và trong lúc promote.
   - Restore từ thiết bị A sang B, sau đó mở lại app và xác minh database vẫn dùng được.
   - Kiểm tra không rò rỉ Recovery Key/DEK/KEK qua log, crash report, clipboard hoặc dữ liệu chẩn đoán.

### 10.2 Đối chiếu F-08 với audit/remediation F-06

**Kết quả kiểm tra báo cáo audit:**

- Báo cáo audit ban đầu xác định **F-06 — Shipped key lifecycle bị duplicate và chỉ spike helper được test**. Đây là verification gap của TASK-00, không phải finding mang mã F-08.
- Remediation closeout trên nhánh `remediation/audit-00-06` ghi F-06 **FIXED**: production database và spike diagnostics dùng chung `src/infrastructure/database/key-lifecycle.ts`; test import module production và cover valid stored key, missing key với database hiện hữu, invalid stored key, valid generated key và invalid generated key.
- PR #9 đã được merge vào `main` với merge commit `7f36fa5bc104d57ae53dae308560e93faf82a1f7`. Đối chiếu source hiện tại trên `main` xác nhận `database.ts` import shared resolver và `key-lifecycle.test.ts` import đúng module production.
- Vì vậy, **không mở F-08 riêng để lặp lại phần shared resolver / generated-key validation / fail-closed hardening đã được F-06 xử lý**.
- Kết quả này cũng **thay thế các checkbox F-06 còn để trống ở §5 và bước F-06 tại §9**: đó là trạng thái ghi nhận trước khi đối chiếu remediation; không còn là việc cần làm lại trên `main`. Các mục interface/failure-state khác chỉ được xem là đã hoàn tất nếu có bằng chứng riêng, không tự động được đóng theo F-06.

**Giới hạn cần giữ rõ:**

- F-06 chỉ đóng vấn đề duplicate resolver và test coverage cho production key lifecycle.
- Báo cáo audit vẫn ghi nhận **old-key recovery / khôi phục database cũ khi key không còn khả dụng là NOT VERIFIED**.
- F-06 không triển khai Recovery Key, key envelope, on-device recovery hoặc cross-device backup restore. Các phần này vẫn thuộc phạm vi thiết kế/triển khai TASK-09 trong tài liệu này.
- Không có bằng chứng trong báo cáo audit đã kiểm tra về một finding độc lập mang mã **F-08**. Do đó trạng thái F-08 ở thời điểm ghi note là: **NOT ESTABLISHED / chưa có căn cứ để tạo remediation riêng**. Nếu F-08 được dùng để chỉ một yêu cầu bảo vệ vòng đời khóa khác ngoài phạm vi F-06, owner cần xác định lại yêu cầu cụ thể trước khi mở finding; không suy diễn rằng F-06 đã giải quyết mọi vấn đề recovery.

### 10.3 Việc cần owner rà soát sau

- [ ] Chốt nơi lưu local key envelope và cách xử lý khi envelope mất/hỏng.
- [ ] Chốt metadata được xác thực và cơ chế AAD/integrity cho backup package.
- [ ] Chốt KDF theo loại Recovery Key (random secret hay passphrase).
- [ ] Chốt MVP/V1 giữ nguyên DEK khi restore hay re-encrypt bằng DEK mới.
- [ ] Chốt staging/promote/rollback và WAL handling.
- [ ] Xác nhận không mở F-08 trùng F-06; nếu có yêu cầu khác, mô tả rõ gap và bằng chứng audit trước khi tạo finding.
- [ ] Giữ old-key recovery ở trạng thái **NOT VERIFIED** cho tới khi có implementation và acceptance evidence riêng trong TASK-09.

**Ranh giới thay đổi:** Addendum này chỉ bổ sung vào architecture note hiện tại. Không tạo file mới, không sửa task documents cũ, không thay đổi source code, migration, task status hoặc acceptance status.
