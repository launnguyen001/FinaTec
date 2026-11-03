# TASK-04 — Quản lý tài sản

- Giai đoạn: 3 — MVP 2: Tài sản và lãi
- Ưu tiên: P1
- Trạng thái: READY FOR REVIEW — Android SQLCipher acceptance 15/15 PASS; CI PASS; interest accrual thuộc TASK-05; iOS NOT VERIFIED; metals provider DEFERRED
- Phụ thuộc: TASK-02, TASK-03

## 1. Mục tiêu

Theo dõi tài sản, số lượng đang nắm giữ, lịch sử mua/bán, giá vốn do người dùng khai báo, giá trị thị trường, lịch sử định giá và lãi/lỗ đã thực hiện hoặc chưa thực hiện. Ứng dụng chỉ ghi nhận và theo dõi tài sản, không thực hiện lệnh giao dịch mua bán thực tế.

## 2. Phân loại và nguyên tắc ghi nhận

Task04 phân biệt hai nhóm theo cơ chế xác định giá trị, không áp dụng một cơ chế định giá chung cho mọi tài sản.

### 2.1. Nhóm tài sản có giá trị ghi nhận trực tiếp (stable-value)

Ví dụ: tiền mặt, số dư ngân hàng và tiền gửi có lãi có giá trị gốc được xác định chắc chắn.

- Ghi nhận trực tiếp giá trị thực tế/giá trị sổ sách; không cần API thị trường, market valuation hoặc cost-basis engine.
- Tiền mặt và số dư tài khoản ngân hàng tiếp tục lấy số dư từ ACCOUNT/ledger của TASK-03. TASK-04 tuyệt đối không tạo bản sao số dư để cộng thêm vào tổng tài sản.
- Tiền mặt, ngân hàng và tiền gửi được biểu diễn bằng ASSET Account chuyên biệt trong Core Ledger; TASK-04 không tạo bản sao số dư. Khoản tiền gửi có kỳ hạn sử dụng Account ASSET riêng (có thể đánh dấu INVESTMENT để loại khỏi tiền khả dụng).
- Kế hoạch, công thức, accrual và posting lãi thuộc TASK-05. TASK-04 không tính lãi, không tạo accrual record hoặc journal entry lãi; lãi chưa POSTED không được coi là số dư đã xác nhận.
- Mọi thay đổi giá trị phải có căn cứ từ giao dịch hoặc bút toán lãi đã ghi nhận, không refresh từ API giá thị trường.

### 2.2. Nhóm tài sản biến động theo thị trường (market-valued)

Ví dụ: vàng, bạc, cryptocurrency, cổ phiếu và tài sản có giá thị trường biến động.

- Một loại tài sản được phép có nhiều bản ghi nắm giữ/mua độc lập. Mỗi bản ghi có thể có số lượng, giá mua, giá trị và thời điểm mua khác nhau.
- Mỗi bản ghi mua lưu giá vốn thực tế do người dùng xác nhận; dữ liệu gốc bất biến và không bị ghi đè khi giá thị trường thay đổi hoặc khi thực hiện DCA.
- Người dùng có thể chọn nhiều bản ghi cùng một loại tài sản để hợp nhất thành một bản ghi DCA mới. Bản ghi DCA phải lưu liên kết đến đầy đủ các bản ghi thành phần; các bản ghi gốc vẫn được giữ để xem chi tiết nhưng chuyển trạng thái đã hợp nhất và không được cộng trùng vào số lượng/giá trị đang nắm giữ.
- Bản ghi DCA tổng hợp tổng số lượng, tổng giá trị mua và giá vốn đơn vị bình quân có trọng số theo dữ liệu thành phần. Giá bình quân chỉ là số liệu tổng hợp, không thay thế giá mua và thời điểm của từng bản ghi gốc.
- Hợp nhất DCA chỉ là thao tác tổ chức/tổng hợp dữ liệu nội bộ, không phải giao dịch mua/bán, không tạo Journal Entry và không làm thay đổi ACCOUNT hoặc tổng tài sản.
- Khi có mạng và nguồn giá khả dụng, hệ thống refresh giá thị trường từ API. Giá API dùng để tính current valuation và mức tăng/giảm tài sản, không phải giá giao dịch đã thực hiện.
- Khi API lỗi hoặc offline, giữ giá gần nhất đã lưu, hiển thị thời điểm cập nhật và trạng thái stale. Không tự suy diễn hoặc tạo giá mới.
- Biến động giá thị trường chỉ làm thay đổi valuation và unrealized P&L; không tự tạo Journal Entry thu nhập/chi phí hoặc realized P&L.
- Người dùng có thể nhập/chỉnh sửa giá thủ công khi nguồn API không phù hợp hoặc không có dữ liệu. Giá thủ công phải được đánh dấu nguồn MANUAL, lưu thời điểm và không giả mạo thành giá API.

## 3. Phạm vi

- Danh mục loại tài sản và hồ sơ tài sản.
- Theo dõi số lượng, đơn vị đo và thông tin nơi lưu trữ.
- Ghi nhận mua/bán tài sản, liên kết tài khoản thanh toán và Ledger.
- Lưu nhiều bản ghi mua cho cùng loại tài sản, hỗ trợ hợp nhất DCA có thể truy ngược đến từng bản ghi thành phần.
- Lưu giá vốn thực tế và phí giao dịch tách biệt theo từng giao dịch.
- Định giá thị trường qua API hoặc nhập thủ công.
- Refresh giá hiện tại khi có mạng; cache giá gần nhất để sử dụng offline.
- Lưu lịch sử định giá hằng ngày để tái lập biểu đồ tăng trưởng.
- Theo dõi tài sản số offline nhưng không lưu thông tin bí mật.

Không bao gồm thực hiện lệnh giao dịch, lưu private key/seed phrase hoặc tích hợp nhà cung cấp khi chưa đánh giá điều khoản và độ tin cậy.

## 4. Quy tắc định giá và lịch sử tăng trưởng

### 4.1. Giá hiện tại

- Current valuation = quantity đang nắm giữ × market price mới nhất, theo precision và đơn vị của từng loại tài sản.
- Giá API là giá tham khảo. Giá người dùng xác nhận khi mua/bán mới là giá giao dịch thực tế.
- Mỗi quote phải lưu nguồn, giá, currency, thời điểm nguồn cung cấp và thời điểm hệ thống nhận dữ liệu.
- Khi quote vượt ngưỡng bất thường hoặc không hợp lệ, không âm thầm thay thế giá đang dùng; cần cảnh báo/xác nhận theo chính sách provider.
- Không cộng giá trị tiền thanh toán vào tài sản lần thứ hai: sau khi mua, tiền giảm và tài sản tăng; tổng tài sản chỉ phản ánh hai vế đã ghi sổ.

### 4.2. Chốt lịch sử định giá mỗi ngày

- Trong ngày, refresh API có thể cập nhật current valuation để màn hình tài sản và tổng quan tăng trưởng phản ánh giá mới nhất.
- Không tạo một bản ghi lịch sử cho mỗi lần refresh.
- Mỗi tài sản biến động có một bản ghi định giá đang mở cho ngày hiện tại theo timezone của ứng dụng.
- Khi nhận giá mới, hệ thống so sánh ngày của lần cập nhật với ngày của bản ghi định giá gần nhất: nếu vẫn cùng ngày thì cập nhật bản ghi ngày đó; nếu đã sang ngày mới thì chốt bản ghi ngày cũ và tạo bản ghi định giá mới cho ngày hiện tại.
- Bản ghi ngày đã chốt không bị cập nhật ngược bởi quote của ngày sau. Trong một ngày có thể refresh nhiều lần nhưng chỉ cập nhật một bản ghi định giá của ngày đó.
- Bản ghi định giá lưu observed_at, captured_at, nguồn giá, quantity tại thời điểm cập nhật/chốt, unit price, total valuation và trạng thái quote.
- Nếu không có quote mới trong ngày, có thể dùng giá gần nhất đã biết để duy trì valuation nhưng phải đánh dấu STALE và lưu tuổi dữ liệu; không được giả định đó là quote mới của ngày.
- Nếu ứng dụng không hoạt động qua nhiều ngày, lần mở/refresh tiếp theo chốt bản ghi gần nhất và tạo bản ghi cho ngày hiện tại; không tự tạo dữ liệu giá giả cho những ngày không có lần quan sát/cập nhật.
- Snapshot là dữ liệu lịch sử định giá, không phải Journal Entry và không làm thay đổi Ledger.
- Lịch sử phải đủ dữ liệu để tái lập biểu đồ giá trị tài sản và tăng trưởng tại từng ngày. Thay đổi quantity do giao dịch phải được phản ánh đúng theo thời điểm hiệu lực, không quy toàn bộ biến động thành lãi/lỗ thị trường.

## 5. Quy tắc mua, bán và chuyển về tài sản ổn định

### 5.1. Mua

- Mỗi lần mua tạo một bản ghi mua/holding độc lập cho cùng loại tài sản, lưu quantity, giá mua thực tế do người dùng xác nhận, tổng giá trị mua, thời điểm và nguồn tiền thanh toán.
- Giá API có thể đề xuất để tham khảo nhưng không tự quyết định giá mua thực tế.
- Phí mua được ghi nhận thành khoản chi phí giao dịch riêng trên Ledger; không cộng vào giá vốn của tài sản.
- Dòng tiền thanh toán phản ánh tổng số tiền thực chi (giá trị mua + phí). Phần giá trị mua ghi tăng tài sản; phần phí ghi nhận chi phí.
- Tạo bản ghi mua/holding và các bút toán Ledger trong cùng một transaction nguyên tử.
- Giá mua thực tế lịch sử được lưu riêng với market quote và không bị thay đổi bởi DCA.

### 5.2. Bán/chuyển đổi sang tiền

- Khi người dùng chốt tài sản biến động và chuyển thành tiền/quỹ tiền ổn định, hệ thống lấy giá API mới nhất làm giá đề xuất nếu có quote hợp lệ.
- Người dùng được quyền chỉnh sửa giá đề xuất thành giá giao dịch thực tế trước khi xác nhận. Nếu không có API, người dùng nhập giá thực tế.
- Giá được người dùng xác nhận là execution price dùng cho giao dịch; không thay thế quote lịch sử.
- Khi bán một phần, người dùng phải chỉ rõ bản ghi mua/DCA thành phần được dùng để xuất quantity; không tự áp dụng FIFO hoặc Weighted Average để chọn giá vốn. Nếu bán từ DCA, phải truy xuất và chọn quantity từ các bản ghi cấu thành DCA.
- Hệ thống tính gross proceeds = quantity bán × execution price; realized gain/loss trước phí = gross proceeds − cost basis của đúng quantity được chọn.
- Phí bán được ghi nhận thành khoản chi phí giao dịch riêng trên Ledger, không trừ vào execution price và không sửa cost basis. Net cash received = gross proceeds − phí bán.
- Ghi giảm đúng quantity và giá trị ghi sổ của bản ghi thành phần được chọn; ghi tăng ACCOUNT nhận tiền theo số thực nhận; ghi nhận realized gain/loss và chi phí giao dịch bằng các bút toán cân bằng theo Core Ledger.
- Lưu riêng gross proceeds, execution price, cost basis đã xuất, phí, net cash received, nguồn nhận tiền, thời điểm và quote API đề xuất (nếu có).
- Việc cập nhật holding, lot, Journal Entry và ACCOUNT phải atomic; nếu bất kỳ bước nào thất bại thì rollback toàn bộ.
- Không được bán/chuyển số lượng lớn hơn số đang nắm giữ.
- Giá trị tài sản sau giao dịch không được đồng thời tính cả holding đã bán và số tiền nhận được.

## 6. Bảo mật và dữ liệu nhạy cảm

- Không lưu hoặc truyền private key, seed phrase hay thông tin khôi phục ví.
- Tài sản số offline chỉ lưu mã tài sản, quantity và mô tả/nơi lưu trữ do người dùng nhập.
- Không gửi dữ liệu tài chính cá nhân lên price provider; chỉ gửi mã tài sản/tham số cần thiết để lấy quote.

## 7. Thay đổi dự kiến

Domain model tài sản và nhiều bản ghi mua; quan hệ DCA aggregate/component; dịch vụ lưu giá vốn người dùng khai báo; use case mua/bán; ánh xạ Ledger và chi phí giao dịch; interface PriceProvider; quote cache; daily valuation record; màn hình danh sách/chi tiết/DCA/lịch sử; truy vấn current valuation và realized/unrealized P&L.

## 8. Thay đổi dữ liệu

Chỉ triển khai schema tài sản, bản ghi mua/holding, quan hệ DCA aggregate/component, price quote/cache, daily valuation record và liên kết Ledger đã được duyệt. Schema phải bảo đảm:
- Mỗi lần mua là một bản ghi độc lập, lưu quantity, unit price, gross purchase value, thời điểm và giá vốn gốc.
- Bản ghi DCA có định danh riêng và liên kết đến các bản ghi thành phần; trạng thái hợp nhất của bản ghi gốc giúp loại trừ khỏi phép cộng holdings, nhưng không xóa hoặc sửa dữ liệu lịch sử.
- Tổng quantity và tổng giá trị DCA phải được tính từ các thành phần; không lưu một bản sao độc lập có thể bị cộng trùng. Giá vốn đơn vị bình quân chỉ là derived value.
- Giao dịch bán phải lưu rõ bản ghi thành phần được xuất quantity và cost basis tương ứng.
- Phí giao dịch là khoản chi phí riêng, có liên kết tới giao dịch mua/bán và Journal Entry tương ứng; không nằm trong asset cost basis.
- Phân biệt rõ giá vốn do người dùng khai báo, giá quote từ provider, giá thủ công dùng cho định giá và giá giao dịch thực tế do người dùng xác nhận.
- Daily valuation record có khóa duy nhất theo tài sản và ngày ứng dụng; cập nhật cùng ngày là upsert, sang ngày mới thì đóng bản ghi cũ và tạo bản ghi mới.

Không lưu trùng số dư ACCOUNT của TASK-03 trong bảng asset. Bảo đảm truy vết được asset transaction đến Journal Entry và nguồn tiền.

## 9. Kế hoạch triển khai

1. Chốt taxonomy tài sản, đơn vị và precision quantity.
2. Thiết kế bản ghi mua độc lập, hợp nhất DCA, liên kết bản ghi thành phần và xuất quantity khi bán một phần.
3. Thiết kế vòng đời holding/lot và quy tắc stable-value so với market-valued.
4. Thiết kế định khoản mua/bán; ghi phí thành chi phí giao dịch riêng và đối soát Ledger.
5. Thiết kế PriceProvider, quote cache, nguồn giá thủ công và stale policy.
6. Thiết kế daily valuation record theo quy tắc cập nhật cùng ngày/chốt khi sang ngày mới và timezone.
7. Triển khai use case mua/bán và valuation.
8. Xây màn hình tài sản, chi tiết, lịch sử giá và tổng hợp lãi/lỗ.
9. Đối soát quantity/valuation với Ledger, bảo đảm không tính trùng.

## 10. Kế hoạch kiểm thử

- Stable-value: tiền mặt/ngân hàng/tiền gửi lấy số dư từ Core Ledger, không nhân đôi; interest plan và accrual của tiền gửi được triển khai, nghiệm thu riêng ở TASK-05.
- Market-valued: nhiều bản ghi mua cùng loại tài sản ở thời điểm/giá khác nhau; DCA tạo bản ghi tổng hợp nhưng giữ nguyên bản ghi thành phần; không cộng trùng quantity; giá vốn không đổi khi API refresh; manual quote có provenance.
- Provider: refresh online, lỗi provider, offline, quote stale, quote bất thường, nhiều lần refresh trong ngày.
- Snapshot: một snapshot/ngày/tài sản; lấy quote hợp lệ cuối cùng; không có quote mới thì đánh dấu stale; timezone và ngày chuyển tiếp; tái lập biểu đồ.
- Mua/bán: mua có phí; phí mua/bán là chi phí Ledger riêng; giá vốn tài sản không bao gồm phí; bán một phần/toàn bộ từ bản ghi thành phần do người dùng chọn; bán vượt quantity; giá đề xuất API được người dùng chỉnh sửa; realized/unrealized P&L và kết quả sau phí; rollback khi Ledger hoặc asset write thất bại.
- Đối soát: quantity holding/lot, Journal Entry, ACCOUNT và tổng tài sản không bị tính trùng.
- Bảo mật: không lưu/truyền private key hoặc seed phrase.

## 11. Tiêu chí nghiệm thu

- [x] Phân biệt đúng stable-value assets và market-valued assets.
- [x] Tiền mặt/ngân hàng chỉ lấy số dư từ Core Ledger, không bị ghi nhận trùng.
- [x] Không tạo nguồn số dư stable-value thứ hai ngoài Core Ledger; term deposit dùng ASSET Account riêng. Interest accrual/capitalization/payout thuộc TASK-05 và không được tính hoặc ghi nhận trong TASK-04.
- [x] Giá vốn market-valued do người dùng khai báo và được lưu bất biến theo từng bản ghi mua.
- [x] Một loại tài sản có thể có nhiều bản ghi mua với thời điểm, số lượng và giá mua khác nhau.
- [x] Có thể hợp nhất nhiều bản ghi thành một bản ghi DCA; bản ghi DCA truy xuất được toàn bộ thành phần, giá và thời điểm mua gốc.
- [x] Bản ghi gốc sau khi hợp nhất vẫn được giữ để xem chi tiết nhưng không bị cộng trùng vào holdings/total assets.
- [x] Hợp nhất DCA không tạo giao dịch tài chính hoặc bút toán Ledger.
- [x] API refresh current valuation nhưng không tự tạo giao dịch thu nhập/chi phí.
- [x] Người dùng có thể nhập giá thủ công; provenance và thời điểm được lưu.
- [x] Daily snapshot lưu quote hợp lệ cuối cùng trong ngày, hỗ trợ trạng thái stale và tái lập lịch sử.
- [x] Giá API chỉ là đề xuất; execution price do người dùng xác nhận khi mua/bán.
- [x] Phí mua/bán được ghi nhận thành chi phí giao dịch riêng trên Ledger, không cộng vào cost basis hoặc thay đổi execution price.
- [x] Mua/bán đối soát nguyên tử với tài khoản và Ledger.
- [x] Từ chối bán vượt quantity.
- [x] Realized và unrealized P&L được phân biệt chính xác.
- [x] Không tính trùng tiền và giá trị tài sản.
- [x] Không lưu hoặc truyền thông tin bí mật của ví.

## 12. Quyết định đã khóa trước triển khai

### 12.1. Taxonomy, đơn vị và precision

- Taxonomy tài sản là dữ liệu có thể mở rộng; không hard-code danh mục loại tài sản vào logic nghiệp vụ.
- Mỗi loại tài sản khai báo valuation model: STABLE_VALUE hoặc MARKET_VALUED; đơn vị đo; quantity precision; price precision; quote currency.
- Giá trị mặc định cho quantity precision: tài sản nguyên chiếc/cổ phiếu mặc định 0 hoặc theo quy tắc đơn vị của loại tài sản; vàng/kim loại dùng tối đa 3 chữ số thập phân theo đơn vị được khai báo; crypto hỗ trợ tối đa 8 chữ số thập phân. Cấu hình từng loại tài sản có thể quy định precision thấp hơn/cao hơn trong giới hạn an toàn.
- Lưu quantity và unit price dưới dạng decimal string/decimal representation chính xác; không dùng floating-point binary để tính cost basis, proceeds hoặc valuation.
- Stable-value không đi qua price provider và không tham gia market cost-basis engine. Số dư CASH/BANK tiếp tục là Ledger balance.

### 12.2. Account đầu tư và Dashboard

- Tài sản market-valued được phản ánh vào Ledger thông qua Account ASSET chuyên dụng được đánh dấu INVESTMENT; không tạo nguồn số dư thứ hai ngoài Ledger.
- Account INVESTMENT vẫn là tài sản kế toán, nhưng không phải tiền khả dụng. Dashboard tiền khả dụng phải loại trừ account đầu tư; tổng tài sản/net worth ở phạm vi báo cáo sau có thể cộng riêng giá trị thị trường từ Asset domain.
- Không thay đổi ý nghĩa subtype hiện có của CASH/BANK/EWALLET/SAVINGS. Dùng cờ phân loại đầu tư tương thích migration để tránh phá vỡ dữ liệu Task03.
- Khi mua: Debit INVESTMENT theo gross purchase value, Debit EXPENSE theo fee nếu fee > 0, Credit funding ASSET theo tổng tiền thực chi.
- Khi bán: Debit receiving ASSET theo net proceeds, Debit EXPENSE theo sale fee nếu fee > 0, Credit INVESTMENT theo cost basis đã xuất; phần chênh lệch gross proceeds và cost basis được ghi nhận vào INCOME (gain) hoặc EXPENSE (loss). Mọi bút toán phải cân bằng theo Core Ledger.
- Người dùng khai báo phí ngay trong form tạo giao dịch. Fee amount mặc định 0. Nếu fee > 0, người dùng chọn Category EXPENSE và tài khoản EXPENSE cùng currency ngay tại form; fee có liên kết bắt buộc với asset transaction và Journal Entry. Không tạo fee transaction rời. Fee không cộng vào cost basis hoặc execution price.
- Tất cả bước ghi asset transaction, lot quantity/cost basis và Journal Entry phải nằm trong cùng SQLite transaction/atomic repository command. Không gọi hai use case độc lập rồi giả định chúng atomic.

### 12.3. DCA và xuất quantity

- DCA chỉ nhận các lot ACTIVE cùng asset và cùng currency; không cho chọn lot đã merge/closed hoặc lot đã là component của DCA khác.
- DCA tạo aggregate lot mới và liên kết component; lot nguồn chuyển MERGED, không xóa dữ liệu gốc và không còn được cộng vào holdings.
- Tổng quantity/cost basis DCA là phép tính derived từ component; không ghi bản sao quantity/cost basis có thể cộng trùng.
- Bán từ DCA bắt buộc người dùng chỉ rõ component lot và quantity xuất từ component đó. Không FIFO, không Weighted Average tự động.
- Không cho quantity <= 0 hoặc vượt quantity còn lại. Cost basis phần bán được tính chính xác từ unit cost của component lot theo precision đã cấu hình.

### 12.4. Currency và crypto

- Quote currency cơ sở của crypto là USDT. Trong giai đoạn đầu, dùng quy ước 1 USDT = 1 USD để chuẩn hóa quote USD thành USDT; đây là giả định quy đổi, không khẳng định peg luôn tuyệt đối.
- Lưu quote currency và conversion basis/provenance để phân biệt quote USD gốc với giá trị quy đổi theo giả định USDT/USD.
- Fiat FX là lớp quy đổi/hiển thị; người dùng có thể chọn base fiat để xem tổng quy đổi hoặc giữ từng khoản theo native currency. Không thay đổi số dư native currency và không tự tạo FX gain/loss.
- Mỗi Account vẫn giữ một native currency theo invariant Task02/03.

### 12.5. Timezone và daily valuation

- Timezone mặc định lấy timezone hiện tại của thiết bị tại lần khởi tạo; người dùng có thể chọn timezone riêng trong Settings.
- Lưu mọi timestamp theo UTC; dùng timezone cấu hình của ứng dụng để xác định valuation_date.
- Khi đổi timezone, không sửa lại snapshot đã đóng; các snapshot mới dùng timezone mới từ thời điểm cấu hình thay đổi.
- Nếu app offline nhiều ngày, lần refresh kế tiếp chỉ chốt snapshot gần nhất và tạo snapshot ngày hiện tại; không backfill ngày không quan sát.
- Một tài sản có tối đa một snapshot/ngày; quote cập nhật trong cùng ngày upsert snapshot đang mở. Snapshot đã đóng bất biến.

### 12.6. Provider, stale policy và refresh scheduler

- Thiết kế PriceProvider abstraction, hỗ trợ primary/fallback provider theo từng asset class; provider có thể thay thế mà không thay đổi domain/application contract.
- Crypto giai đoạn đầu: CoinPaprika Free là provider public không cần API key cho mục đích cá nhân; CoinGecko Demo là provider dự phòng nếu người dùng cấu hình API key. Không coi CoinPaprika Free là giấy phép phân phối dữ liệu thương mại; phải đánh giá lại điều khoản trước khi thương mại hóa. CoinGecko Demo hiện công bố 10.000 calls/tháng và 100 calls/phút; CoinPaprika Free công bố 20.000 calls/tháng/IP và dữ liệu cập nhật tối đa khoảng 10 phút. Tài liệu: https://www.coingecko.com/en/api/pricing ; https://coinpaprika.com/api ; https://coinpaprika.com/api-terms-of-use/ 
- Fiat FX giai đoạn đầu: Frankfurter public API, không cần API key, dữ liệu tỷ giá cập nhật hằng ngày; không gọi dày hơn chu kỳ dữ liệu của provider. Tài liệu: https://frankfurter.dev/
- Metals provider được cấu hình riêng sau khi xác nhận API miễn phí, độ tin cậy và quyền sử dụng; không giả định một crypto provider cung cấp giá kim loại.
- Chu kỳ refresh mặc định: crypto 15 phút; kim loại 60 phút; fiat FX 24 giờ. Người dùng được chọn chu kỳ trong khoảng cho phép của từng nhóm; không cho đặt dưới giới hạn tối thiểu 15 phút.
- Manual refresh có cooldown 30 giây cho cùng provider/asset group. Gom nhiều symbol vào một request khi provider hỗ trợ.
- Tôn trọng HTTP 429/Retry-After; lỗi tạm thời dùng exponential backoff, giới hạn tối đa 6 giờ. Không retry liên tục khi app resume.
- Background execution là best-effort theo hệ điều hành; không cam kết thời điểm chạy chính xác. Khi app mở lại sau offline, chỉ thực hiện một lần refresh cần thiết.
- Khi provider lỗi, giữ last known price và đánh dấu STALE kèm age. Manual price có provenance MANUAL. Quote provider hợp lệ mới được ưu tiên lại, nhưng lịch sử manual quote vẫn được giữ.
- Chỉ cập nhật current quote/snapshot khi response hợp lệ; lỗi, timeout, malformed payload hoặc quote bất thường không được ghi đè giá đang dùng.

### 12.7. Các ràng buộc triển khai

- Provider chỉ nhận asset symbol/provider symbol và quote currency cần thiết; không gửi account, quantity, cost basis, giao dịch hoặc dữ liệu tài chính cá nhân.
- Không lưu API key trong source code hoặc database Ledger; secret do người dùng cung cấp phải lưu trong secure storage.
- Không lưu private key, seed phrase hoặc thông tin khôi phục ví.
- Chỉ đánh dấu tiêu chí nghiệm thu DONE sau khi có implementation, migration, unit/repository tests và CLI acceptance pass. Tài liệu không được đánh dấu hoàn thành thay cho kiểm thử.

## 13. Nhật ký tiến độ

- Đã làm: Tạo branch Task04 từ main sau khi TASK-03 được merge.
- Đã chốt: Stable-value/market-valued; nhiều lot và DCA có truy vết; fee nhập ngay trên giao dịch và gắn với Journal Entry; fee hạch toán riêng; account đầu tư tách khỏi tiền khả dụng; crypto định giá USDT với giả định USDT/USD 1:1; timezone lấy từ thiết bị và cho phép override; provider primary/fallback; stale/manual quote; refresh scheduler và rate limit.
- Đã triển khai trên branch: migration `0002_asset_management`; schema Drizzle cho asset type, asset, lot, DCA component, asset transaction, price quote, daily valuation, timezone/provider settings và refresh state; cờ `accounts.is_investment` để Dashboard loại trừ tài sản đầu tư khỏi tiền khả dụng.
- Đã triển khai domain rules: decimal arithmetic bằng BigInt, tính gross purchase/fee/net outflow, DCA aggregation, partial-sale cost basis, stale quote fallback, timezone resolution, refresh interval/cooldown và exponential backoff.
- Đã triển khai provider adapters: CoinPaprika, CoinGecko Demo và Frankfurter; có FallbackPriceProvider.
- Đã bổ sung unit tests cho domain rules và test Dashboard không cộng investment account vào available cash.
- Đã sửa invariant giá vốn còn lại sau bán một phần: mỗi lot lưu `remaining_cost_basis_minor`; DCA và tính giá vốn bán tiếp theo sử dụng giá vốn còn lại thay vì giá vốn gốc. Migration `0003_asset_remaining_cost_basis` backfill giá vốn hiện tại cho các lot đã tồn tại; đã bổ sung regression test.
- Đã mở rộng domain sale để hỗ trợ bán từ lot `MERGED` chỉ khi application/repository xác minh lot đó là component của DCA aggregate đang hoạt động; lot MERGED không có quan hệ component hợp lệ vẫn bị từ chối. Đã bổ sung test cho hai trường hợp.
- Đã bổ sung `SqliteAssetRepository`: purchase/sale ghi Journal Entry, journal lines, lot mutation và asset transaction trong cùng SQLite transaction; DCA merge tạo aggregate container không lưu bản sao quantity/cost basis, lưu quan hệ component và chuyển lot nguồn sang MERGED; bán từ component xác minh quan hệ với aggregate ACTIVE và đóng aggregate khi mọi component đã hết quantity.
- Đã bổ sung `AssetTransactionService` và domain `AssetRepository` port: application layer xác thực asset/account/currency/category, tính gross/fee/net, cost basis và realized gain/loss; xây posting cân bằng cho BUY/SELL rồi giao một atomic command cho repository. DCA merge được expose qua application service.
- Đã bổ sung idempotency ở application layer cho BUY/SELL: retry kiểm tra Journal Entry POSTED và transaction tương ứng trước khi đọc lot/asset state; retry sau khi bán hết lot không bị từ chối do lot đã CLOSED.
- Đã bổ sung AssetCatalogService và SQLite CRUD cho asset type/profile; kiểm tra currency active, precision 0–12, quote currency nhất quán và archive state.
- Đã bổ sung exact current-quantity aggregation từ ACTIVE lots và DCA components; bổ sung quote + daily valuation persistence nguyên tử, upsert snapshot đang mở trong cùng ngày, đóng snapshot cũ khi sang ngày mới và không sửa snapshot đã đóng.
- Đã bổ sung AssetValuationService cho provider/manual quote và timezone-derived valuation date; manual quote được đánh dấu MANUAL, không tạo Journal Entry.
- Đã bổ sung AssetsScreen và AssetTransactionsScreen: tạo asset type/profile, nhập giá thủ công, ghi mua/bán, chọn lot nguồn và hợp nhất DCA; AccountsScreen cho phép đánh dấu account ASSET là INVESTMENT.
- Đã thêm GitHub Actions CI workflow để chạy `npm ci`, typecheck, lint, format check và unit tests trên push/PR; chưa có kết quả run được xác nhận.
- Còn giới hạn đã chấp nhận: metals provider DEFERRED do quota/chi phí/điều khoản; iOS runtime NOT VERIFIED; background scheduling BEST-EFFORT theo OS. Các giới hạn này không được mô tả thành PASS.
- Đã chạy CLI acceptance trên Android development build với SQLCipher 4.17.0: 15/15 checks PASS; diagnostic database/key được cleanup.
- Verification cuối: GitHub Actions CI trên PR head `afcfc550956a1edbfcdf7d31d9f0f91f8c028bb2` PASS toàn bộ dependency install, typecheck, lint, format check và unit tests. CLI Android SQLCipher acceptance 15/15 PASS sau các sửa lỗi USDT, snapshot date, DCA component linkage và Hermes BigInt formatting.



## 14. Bổ sung sau nghiệm thu vòng đầu (2026-11-03)

- Đã bổ sung truy vấn daily valuation history và computation Unrealized P&L dựa trên latest saved valuation trừ remaining cost basis của các lot còn quantity; không dùng original cost basis sau partial sale.
- Đã bổ sung Settings UI cho timezone, refresh intervals và crypto provider preference; CoinGecko Demo API key được lưu bằng SecureStore, không lưu trong SQLite.
- Đã bổ sung foreground refresh scheduler: refresh khi runtime khởi tạo, khi app resume và kiểm tra chu kỳ khi app đang active. Đây là best-effort foreground scheduling; chưa cam kết OS background execution khi app bị suspend/terminated.
- Đã bổ sung provider refresh state, cooldown manual 30 giây, exponential backoff, Retry-After và stale marking dựa trên last known quote.
- Đã bổ sung archive policy: chỉ archive asset khi remaining quantity bằng 0; chỉ archive asset type sau khi mọi asset profile thuộc type đã archived.
- Crypto quote currency được khóa ở USDT theo quy ước đã duyệt; CoinPaprika/CoinGecko USD quote được gắn conversion basis USDT/USD parity.
- Metals provider evaluation: MetalCharts có endpoint batch `/v1/prices` trả nhiều metal trong một request; Free cho 200 request/tháng, 10 request/phút, commercial use được phép nhưng public display cần attribution link; Starter được công bố ở mức USD 9/tháng và 10.000 request/tháng. Với chu kỳ mặc định 60 phút, một batch request mỗi giờ tương đương khoảng 720 request/tháng, vượt free quota; nếu gọi riêng từng asset thì còn cao hơn. Vì vậy chưa tích hợp MetalCharts vào refresh mặc định cho đến khi chốt ngân sách hoặc thay đổi cadence. Corgano có API miễn phí cho gold và attribution nhưng không đáp ứng danh mục nhiều kim loại. Nguồn đánh giá: https://metalcharts.org/metals-api ; https://goldprice.corgano.com/gold-price-api
- Giới hạn được công khai: iOS runtime NOT VERIFIED; background scheduling BEST-EFFORT theo OS; metals provider DEFERRED chờ ngân sách/điều khoản. Android SQLCipher repository acceptance và archive flow đã PASS trên thiết bị.

- Đã triển khai native background refresh bằng `expo-background-task` và `expo-task-manager`; task được define ở module scope, đăng ký sau khi FinanceRuntime khởi tạo, chu kỳ OS tối thiểu 15 phút. Đây là best-effort, không bảo đảm thời điểm chạy khi app bị suspend/terminated.
- Đã thêm Settings action `Refresh giá ngay` cho crypto; hiển thị số asset cập nhật/bỏ qua/lỗi. Cooldown thủ công 30 giây và refresh claim được bảo vệ bằng atomic SQLite transaction để tránh hai worker cùng nhận một lượt.
- Đã bổ sung Realized P&L trên Asset History: gross proceeds trừ cost basis đã xuất, hiển thị riêng sale fees và purchase fees; purchase fees không bị nhập nhằng thành phí bán hoặc trừ hai lần khỏi realized result.
- GitHub Actions Task04 workflow PASS trên commit triển khai manual refresh trước formatter: dependency install, Expo Android prebuild validation, formatter, typecheck, lint và unit tests. Formatter đã tạo commit tiếp theo; cần chạy lại CI trên head đã format trước khi xem implementation là ổn định.
- CLI acceptance screen đã được thêm tại route `/task04-asset-acceptance` (development build, native only). Screen tạo database SQLCipher cô lập, chạy migration upgrade từ Core Finance v1, kiểm tra atomic rollback, partial sale, DCA, daily valuation/P&L, settings, refresh state và archive policy; database cùng SecureStore key được cleanup sau lượt chạy.


## 15. Ranh giới TASK-04 / TASK-05 đã được chốt (2026-11-04)

- TASK-04 sở hữu Asset catalog/profile, stable-value/market-valued classification, lots, DCA, valuation, quote history và asset transactions.
- Khoản tiền gửi có kỳ hạn được biểu diễn bằng một ASSET Account riêng trong Core Ledger; không lưu principal thành một số dư song song trong Asset domain.
- TASK-05 sở hữu InterestPlan, APR/APY conventions, day-count, compounding, accrual lifecycle, rounding, catch-up, capitalization/payout và journal posting lãi. InterestPlan tham chiếu ASSET Account làm nguồn principal; currency và balance được đọc từ Ledger, không sao chép.
- TASK-04 không tự tính hoặc ghi nhận lãi. Acceptance về interest accrual, capitalization và payout chuyển sang TASK-05.
- Các convention tính lãi phải có ví dụ tham chiếu được owner duyệt trước khi implement; không tự suy diễn công thức.

## 16. Kiểm chứng acceptance trên Android (2026-11-04)

- Đã build và cài development build mới trên Android arm64; build cũ thiếu native module `ExpoTaskManager` nên không thể chạy bundle hiện tại.
- CLI acceptance trên database SQLCipher cô lập đã PASS 15 kiểm tra: Core Finance → Task04 migration upgrade; settings migration/persistence; rollback nguyên tử; nhiều lot; partial-sale cost basis; DCA không tạo Ledger entry; realized/unrealized P&L; same-day snapshot upsert và rollover; archive guard/lifecycle; atomic refresh claim và refresh-state persistence. Diagnostic báo SQLCipher 4.17.0 và xác nhận file/key cô lập được cleanup.
- Acceptance phát hiện và đã sửa các lỗi: schema/domain chỉ cho currency 3 ký tự trong khi crypto dùng USDT; regex snapshot date bị escape sai; đóng DCA component không xóa `merged_into_id`; Hermes không nhận `bigint` trực tiếp trong `Intl.NumberFormat`. Migration `0004_usdt_currency_code` mở rộng currency code lên 4 ký tự và bảo toàn các foreign key hiện có.
- `npx expo lint` và `npx tsc --noEmit` PASS sau các sửa đổi.
- TASK-04 đạt Android SQLCipher acceptance 15/15; CI trên PR head trước cập nhật tài liệu PASS. Các commit sau acceptance chỉ cập nhật tài liệu, không sửa code. Metals provider DEFERRED; iOS runtime NOT VERIFIED; background scheduling BEST-EFFORT. PR chờ CI xác nhận trên head tài liệu mới nhất trước khi merge.
