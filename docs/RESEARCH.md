# Nghiên cứu thiệp cưới & thiết kế sản phẩm

Khảo sát ngày 03/10/2026. Các nhận xét về mẫu do quan sát trực tiếp, không phải thông tin về hệ thống nội bộ của nhà cung cấp. Giá của dự án là đề xuất khởi tạo, chưa phải giá bán được chủ dịch vụ chốt.

## 1. Hai trang tham khảo

### Mạnh Hùng – Phạm Hằng, Thắng VN

Nguồn: https://thangvn.vn/thiep-cuoi/manh-hung-pham-hang/ và https://thangvn.vn/mau-thiep/.

Trang mẫu có giới thiệu cặp đôi, đếm ngược, tiệc nhà trai/nhà gái, album, lời chúc, xác nhận tham dự, hộp quà mừng và lời cảm ơn. Các trường thông tin tiệc và form phản hồi cần được quản lý tập trung: trong trang quan sát, tên địa điểm trên form RSVP có nội dung khác phần lịch tiệc. Dự án sử dụng cùng một mảng sự kiện để render lịch tiệc, bản đồ và lựa chọn RSVP, giảm nguy cơ lệch thông tin.

Điểm cần học: cấu trúc một trang cuộn đơn giản, tên cặp đôi nổi bật, ngày/giờ/địa chỉ rõ và thao tác RSVP ngay trên thiệp. Không sao chép hình ảnh, logo, mã nguồn hoặc nội dung riêng của cặp đôi.

### Xuân Bắc & Vũ Minh, MeHappy

Nguồn: https://bac-minh-wedding.mehappy.info/. Công cụ đọc web ban đầu không mở được; xác minh lại bằng HTTP và Playwright, trang trả về 200 và render được.

Qua trình duyệt quan sát được bố cục trang trí nhiều lớp, tên cặp đôi, lời mời, thông tin thành hôn, chỉ đường, lịch tháng, album, lời chúc và nút bật nhạc. Cảm xúc đến từ nhịp kể chuyện, chữ lớn và hình ảnh; không nên để hiệu ứng làm khó việc đọc giờ tiệc hoặc gửi phản hồi trên điện thoại. Bản xây dùng các khu vực nội dung tương ứng với thiết kế độc lập, nhạc chủ động bật và tôn trọng cài đặt giảm chuyển động.

## 2. Mô hình dịch vụ để bán

Nguồn chính thức: https://mehappy.vn/ , https://mehappy.vn/pricing , https://mehappy.vn/partner .

MeHappy giới thiệu mô hình bắt đầu miễn phí, nâng cấp cho thêm quyền thiết kế, số ảnh và thời gian lưu thiệp. Hệ thống có quản lý khách cá nhân hóa, bản đồ, RSVP, thêm lịch. Trang đối tác mô tả website mang thương hiệu đại lý, kho mẫu và bảng giá.

Hướng rút ra cho dự án: tách ba vai trò và hai loại tiền.

- Khách mua dịch vụ: đăng ký → chọn mẫu → tạo bản nháp → xem thử → mua gói → thanh toán → xuất bản.
- Khách dự cưới: mở link → đọc tên người được mời → xem lịch tiệc/bản đồ → RSVP → gửi lời chúc.
- Admin: quản lý mẫu/gói → đối chiếu thanh toán → kích hoạt quyền lợi → quản lý tài khoản/thiệp → kiểm tra nhật ký.
- Tiền mua gói thuộc chủ dịch vụ; cấu hình tại `/admin/settings`.
- Tiền mừng thuộc cặp đôi; cấu hình riêng trong trình sửa thiệp. Không cộng vào doanh thu dịch vụ.

Không áp dụng lời hứa “trọn đời”: thời gian lưu phải có giới hạn cụ thể để vận hành và tính chi phí. Cấu hình ban đầu gồm 12, 18, 36 tháng; số ảnh 12, 24, 40; giá 199.000, 399.000, 699.000 đồng. Đây là quyết định sản phẩm của dự án, không phải sao chép hoặc so sánh giá tương đương với đối thủ. Admin có thể điều chỉnh tất cả.

## 3. Phạm vi bản triển khai

| Mảng                | Đã triển khai                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Website bán dịch vụ | Trang chủ, kho mẫu có lọc/tìm kiếm, chi tiết & preview, bảng giá, điều khoản dự thảo                              |
| Thiết kế            | 3 bố cục: editorial / botanical / classic, 6 phối màu, 6 mẫu ban đầu                                              |
| Khách hàng          | Đăng ký bằng số điện thoại, đăng nhập, đăng xuất, dashboard, thiệp và lịch sử đơn riêng                           |
| Trình sửa thiệp     | Cặp đôi, gia đình, câu chuyện, ngày cưới, tối đa 4 tiệc, album, ảnh bìa, nhạc HTTPS, ngân hàng mừng cưới          |
| Dịch vụ             | Đơn có giá/quyền lợi bất biến, chuyển khoản/QR, báo giao dịch, xác nhận thủ công, webhook SePay tùy chọn, gia hạn |
| Xuất bản            | Chỉ cho gói trả tiền còn hiệu lực; kiểm tra mẫu cao cấp/giới hạn ảnh; thu hồi; hết hạn ngừng hiển thị             |
| Khách dự cưới       | Tên riêng trên lời mời, bản đồ, Google Calendar, RSVP theo tiệc/số người, lời chúc                                |
| Quản lý khách       | Nhóm khách, link cá nhân, cập nhật phản hồi không nhân đôi, số người tham dự, duyệt/ẩn lời chúc, xuất CSV         |
| Admin               | Dashboard doanh thu thực, đơn & bộ lọc, mẫu/gói, khách hàng, tạm khóa thiệp, ngân hàng & hỗ trợ, nhật ký          |
| An toàn dữ liệu     | Băm mật khẩu, phiên lưu DB, thu hồi phiên, chặn truy cập chéo chủ thiệp, CSRF, hạn tốc độ, giới hạn body/ảnh      |

## 4. Nguyên tắc dữ liệu và thanh toán

Nguồn: https://docs.sepay.vn/tich-hop-webhooks.html và https://docs.sepay.vn/test-mode.html.

SePay gửi sự kiện giao dịch bằng POST, hỗ trợ API Key trong Authorization; có thể gửi lại cùng giao dịch. Vì vậy dùng khóa transactionId duy nhất trong DB, cập nhật payment/order/expiry/audit trong một transaction. Chỉ nhận tiền vào đúng tài khoản cấu hình, đúng mã đơn và đúng số tiền. Phản hồi thành công theo `{"success": true}`; lỗi nhận tiền không làm giả trạng thái đã thanh toán.

Bản này có endpoint thực, không tự mô phỏng giao dịch ngân hàng khi khách bấm “đã chuyển”. Cần tài khoản SePay và khóa thật để dùng tự động; đường xác nhận admin hoạt động ngay. Chưa xác minh bằng tiền thật.

Phiên admin và khách tách riêng. API mutation xác minh quyền tại server, không dựa vào việc ẩn nút trong giao diện. Mọi đơn lưu snapshot gói; đổi bảng giá không sửa lịch sử bán hàng. Bản nháp không có URL công khai hoạt động. Lời chúc mặc định chờ duyệt. CSV xử lý đầu vào để tránh công thức từ tên/lời nhắn.

## 5. Quyết định kiến trúc

Clone lịch sử git của `my_task` rồi xây miền nghiệp vụ mới. Giữ Next.js 16.3.8, React 19, TypeScript, Prisma/SQLite, xác thực khách/admin, HTTP guards, rate limiter Redis có fail-closed production, logger có lọc dữ liệu. Loại bỏ POS, kho, sản phẩm, giao hàng, công nợ, voucher, hàng đợi offline và các dependencies chỉ phục vụ các phần đó.

Miền mới: CustomerAccount → Invitation → ServiceOrder → WeddingPayment. WeddingTemplate và ServicePlan là catalog quản trị. WeddingGuest giữ lời mời cá nhân; GuestResponse giữ RSVP và trạng thái duyệt lời chúc.

SQLite phù hợp bản đầu chạy một máy chủ. Giữ một connection writer, transaction ngắn, không gọi Prisma gốc trong interactive transaction. Khi cần nhiều instance/khối lượng lớn, chuyển PostgreSQL và storage object; không dùng file SQLite trên filesystem tạm của serverless.

## 6. Trước khi mở bán và hướng phát triển

Các việc cần dữ liệu/chủ tài khoản thật: tên thương hiệu chính thức; tên và lịch cưới anh trai; ảnh được phép dùng; ngân hàng của chủ dịch vụ/cặp đôi; giá và điều khoản/hoàn tiền; domain/HTTPS; hạ tầng rate limit production; tài khoản SePay nếu dùng tự động.

Bản đầu chưa có: thiết kế kéo-thả tự do, video cưới, tên miền riêng từng thiệp, cổng thẻ quốc tế, tự động hoàn tiền, OAuth/OTP, khôi phục mật khẩu tự phục vụ, AI tạo nội dung, nhập khách hàng Excel, báo cáo lượt xem, quản lý ngân sách cưới, in thiệp vật lý. Đây là phần mở rộng, không được quảng cáo là đã hoạt động.

Hướng ưu tiên sau bản đầu:

1. Hoàn thiện thiệp thật cho anh trai và kiểm tra bằng điện thoại của gia đình.
2. Chuẩn hóa chính sách, thương hiệu và ảnh; kết nối thanh toán thật trong sandbox trước.
3. Đưa lên domain thật với backup DB/ảnh và HTTPS.
4. Sau khi có khách: bổ sung OTP/khôi phục, object storage, giao dịch hoàn tiền và analytics.

Ảnh minh họa tải từ Unsplash (không thuộc hai trang tham khảo): photo-1519741497674-611481863552, photo-1523438885200-e635ba2c371e, photo-1519225421980-715cb0215aed. Cần thay bằng ảnh của cặp đôi cho thiệp chính thức.

## 7. Rà soát để mở bán — 03/10/2026

Nguồn đối chiếu bổ sung: [bảng quyền lợi MeHappy](https://mehappy.vn/pricing), [giới thiệu iWedding](https://biihappy.com/iwedding), [hướng dẫn iWedding](https://biihappy.com/help), [W3C cho người lớn tuổi](https://www.w3.org/WAI/older-users/), [danh mục ngân hàng VietQR](https://api.vietqr.io/v2/banks). Chỉ dùng mô tả công khai, không coi số lượng khách/đánh giá quảng cáo là bằng chứng độc lập; không sao chép mẫu/ảnh/mã hoặc áp dụng giá đối thủ vào catalog hiện có.

MeHappy phân biệt gói theo ảnh, thời hạn, quyền thiết kế và tiện ích; trang công khai có cả mục add-on lẫn bảng tính năng nên không suy diễn mọi quyền lợi thuộc mọi gói. iWedding giới thiệu RSVP, chia sẻ QR và quản lý khách; hướng dẫn của họ có tài khoản cô dâu/chú rể riêng. W3C chỉ ra nhu cầu liên quan thị lực, thao tác và khả năng hiểu; hướng thiết kế của dự án là chữ dễ đọc, nhãn rõ, thao tác bằng bàn phím, zoom/reflow và giảm chuyển động. Danh mục VietQR dùng để hiển thị tên ngân hàng; không phải xác minh chủ tài khoản.

### Hai hành trình phải hoàn chỉnh

- Người mua: xem mẫu đủ nội dung trước đăng ký → chọn phong cách/gói theo nhu cầu → tạo và xem nháp → sửa thông tin hai nhà/ảnh/ngân hàng → thanh toán với hướng dẫn rõ → theo dõi trạng thái → xuất bản → chia sẻ link/QR → quản lý phản hồi/gia hạn.
- Người nhận: thấy tên/ngày/giờ/địa điểm dễ đọc → mở thiệp hoặc đi thẳng nội dung khi giảm chuyển động → chỉ đường/thêm lịch → xác nhận người/tiệc → gửi lời chúc → mừng cưới từ xa đúng bên. Không cần tài khoản; không bị lộ danh sách khách hoặc ép bật nhạc.

### Khoảng trống và tiêu chí bàn giao

| Phần               | Hiện trạng khi rà soát                                   | Kết quả cần có                                                                                                                                      |
| ------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quà mừng           | Một bộ ngân hàng chung, yêu cầu nhập BIN                 | Hai bên độc lập, chọn ngân hàng theo tên, QR/sao chép/lưu ảnh, fallback khi QR lỗi; giữ dữ liệu cũ                                                  |
| Quản trị           | Có danh sách khách/mẫu/gói, bốn số tổng, thiếu biểu đồ   | Tổng và trạng thái tài khoản, mẫu/gói đang bán, thiệp công khai, doanh thu thực theo kỳ, biểu đồ và dữ liệu đọc được, đơn gần đây, tác vụ vận hành  |
| Thanh toán dịch vụ | Cấu hình bank/account/name/support và webhook env có sẵn | Chọn ngân hàng dễ hiểu, xem trước thông tin/QR, trạng thái sẵn sàng, hướng dẫn đối chiếu và hỗ trợ; không giả lập thanh toán                        |
| Mẫu                | Sáu phối màu trên ba bố cục; preview toàn trang có sẵn   | Thêm phong cách/bố cục thực sự khác biệt, preview rõ từ thẻ mẫu và editor, lọc theo nhu cầu; giữ nội dung khi đổi mẫu                               |
| Gói                | Quyền lợi snapshot nhưng mô tả còn thiên về kỹ thuật     | So sánh rõ thời hạn/ảnh/mẫu/branding và tiện ích chung; gợi ý nhu cầu, dùng thử bản nháp, FAQ thanh toán/gia hạn; không quảng cáo tính năng chưa có |
| Mọi lứa tuổi       | Form/mobile đã cải thiện, còn chữ tiếng Anh và chữ nhỏ   | Tiếng Việt nhất quán trên thiệp, giờ tiệc rõ, lối tắt nội dung, cỡ chữ/contrast/zoom/bàn phím; kiểm tra mobile/tablet/desktop                       |

Mỗi phần phải có bằng chứng server và trình duyệt phù hợp, cập nhật contract/migration/đặc tả khi thay dữ liệu, commit riêng. Những dữ liệu thương mại cần chủ dịch vụ nhập (ngân hàng, hỗ trợ, bảng giá/chính sách chính thức) không được bịa để làm dashboard có vẻ sẵn sàng. Chưa có khảo sát trực tiếp người lớn tuổi; cần ghi rõ giới hạn này và kiểm tra trên thiết bị thật trước mở bán.

## Chuyển động ảnh tham khảo OnePlus — 05/10/2026

Nguồn: [OnePlus 15, Tri-Chips](https://www.oneplus.com/vn/15#anchor-tri-chips). Đã mở trang thật bằng Chromium 1440×900, cuộn qua Tri-Chips và Photography, kiểm tra DOM/CSS và ảnh chụp trước/sau cuộn. Tri-Chips dùng khung sticky theo chiều cao màn hình, canvas và lớp chữ xuất hiện theo tiến trình cuộn; Photography cũng có khung sticky và lớp tiêu đề biến đổi scale. Đây là quan sát giao diện, không phải đo hiệu năng trên điện thoại thật.

Áp dụng vào thiệp bằng triển khai riêng: ảnh đầu thiệp mở khung; ảnh có độ sâu theo cuộn; ảnh nổi bật trước album giữ vị trí, mở khung từ bo tròn về toàn cảnh và giảm zoom theo tiến trình cuộn; ảnh album mở theo nhịp so le. Dùng ảnh có sẵn của thiệp, không lấy tài nguyên hay mã nguồn OnePlus. Không mang canvas/video giải mã hoặc quãng cuộn dài của trang sản phẩm vào thiệp. Chỉ bật đoạn sticky khi JavaScript hoạt động và người xem không yêu cầu giảm chuyển động; mặc định HTML là ảnh tĩnh, không chặn cuộn hay thay đổi điều hướng.

### Khai thác thêm chuyển lớp — 05/10/2026

Đã xem thêm OxygenOS và Design trên cùng trang bằng Chromium 1440×900. OxygenOS có các khung màn hình xếp thành nhiều lớp; Design có lớp tiêu đề biến đổi 3D và các slide ngang, kiểm tra được transform/opacity trong DOM. Các cơ chế này gợi ý chuyển cảnh, chiều sâu và hướng chuyển động; nghiêng theo con trỏ và vuốt album là điều chỉnh riêng cho thiệp, không khẳng định OnePlus có cùng tương tác.

Thiệp bổ sung hai cảnh ảnh trong khung nổi bật: mở khung rồi ảnh thứ hai đi vào bằng lớp che theo cuộn, cuộn ngược phục hồi cảnh trước. Tiêu đề mục mở từ lớp che; album desktop có nghiêng/ánh sáng theo con trỏ; lightbox chuyển ảnh có hướng và hỗ trợ vuốt ngang trên điện thoại. Nội dung/ảnh đang chọn cập nhật ngay, không phụ thuộc animation kết thúc, nên thao tác nhanh hoặc bật giảm chuyển động không khóa điều khiển. Không tự chạy slideshow hoặc tự phát nhạc.

## Thay ảnh cưới minh họa — 05/10/2026

Đã tìm ảnh chụp thật và xem trực tiếp ba ứng viên Unsplash. Chọn ảnh [Martin Baron — A bride and groom standing in the middle of a forest](https://unsplash.com/photos/a-bride-and-groom-standing-in-the-middle-of-a-forest-hWiqlzjwCLI): cặp đôi ở giữa, ánh sáng mềm, tông xanh ngoài trời và khuôn mặt nằm trong vùng cắt ngang/dọc. Trang nguồn xác nhận Download free/Unsplash License; đối chiếu [giấy phép](https://unsplash.com/license). Nguồn và ngày kiểm tra nằm ở public/images/CREDITS.md.

Ảnh mới wedding-couple-forest.jpg, JPEG tối ưu 1600×2400, khoảng 429 KiB. Renderer chuyển riêng đường dẫn stock cũ /images/couple.jpg sang ảnh mới, tránh cache Image Optimization cũ; không đổi URL ảnh người dùng tải lên, không sửa DB. Trang chủ sửa alt/caption khớp ảnh và dùng tiếng Việt. Trên cinematic mobile, ảnh có vùng riêng phía trên nội dung để không bị panel che mặt. Đây vẫn là ảnh minh họa, không phải cặp đôi có tên trên thiệp demo.

### Chiều sâu cho chương ảnh — 05/10/2026

Chương ảnh bổ sung hai tấm ảnh trang trí từ album, nghiêng phối cảnh và rời khung khi ảnh chính mở rộng. Tiến trình cuộn điều khiển đồng bộ chuyển cảnh, caption và thanh tiến trình; cuộn ngược đảo lại trạng thái. Điện thoại dùng tấm ảnh nhỏ hơn; reduced motion/no-JS giữ ảnh tĩnh và ẩn lớp trang trí. Học cách tổ chức lớp và nhịp từ https://www.oneplus.com/vn/15, không sao chép tài sản. Không đổi API, dữ liệu hay quyền truy cập.

### ZenLove Quốc Huy – Thanh Huyền — 06/10/2026

Tham khảo URL người dùng gửi: https://zenlove.me/s/wedding-quochuy-thanhhuyen. HTTP trả HTML 200, metadata đúng tên thiệp; dữ liệu công khai ghi nhạc “50 Năm về sau”, volume 80 và nút music-4. Trình duyệt tự động bị chuyển sang Google nên chưa quan sát được toàn bộ chuyển cảnh của đúng thiệp này; không coi dữ liệu cấu hình là bằng chứng đã nghe nhạc hay thấy animation chạy.

Đối chiếu hướng dẫn chính thức https://zenlove.me/guide/thiet-ke/nhac-nen-cho-thiep (chọn nhạc sẵn, âm lượng, phát sau thao tác mở) và https://zenlove.me/guide/thiet-ke/hieu-ung-mo-man-phong-bi-dong (mở màn, rơi, phần tử xuất hiện khi cuộn). Hỷ Studio bổ sung bản piano gốc, chọn nhạc trong editor, mở kèm nhạc/skip im lặng, điều chỉnh âm lượng; thêm chương câu chuyện có portrait, lời hẹn, nét hoa SVG gốc và reveal lịch tiệc. Không tải lại bài hát, ảnh cặp đôi hoặc sao chép mã từ thiệp tham khảo.
