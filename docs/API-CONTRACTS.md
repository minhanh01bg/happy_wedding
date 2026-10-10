# Wedding API Contracts

Đối chiếu route và Zod ngày 03/10/2026. Đây là hợp đồng nội bộ browser/server của bản hiện tại, chưa phải API tích hợp bên thứ ba có version/SLA.

## Quy ước

Wedding JSON API dùng POST `/api/wedding/<operation>`, Content-Type application/json. Trước dispatch kiểm tra safe origin, body streaming tối đa 64.000 byte. Mutation khách/admin kiểm tra phiên và rate-limit; RSVP không cần phiên nhưng vẫn origin/rate-limit. Browser dùng same-origin cookies. Không gửi secret/price/owner/status tùy ý vào payload.

Thành công thường `{ "ok": true }`, có data khi cần. Lỗi domain `{ "ok": false, "message": "..." }`; unexpected error trả 500 với correlationId. Đáp ứng JSON của catch-all đặt `Cache-Control: private, no-store`. 400 validation; 401 thiếu phiên; 403 thiếu quyền; 404 không có tài nguyên/thao tác; 409 xung đột; 413 body quá lớn; 429 hạn tốc độ; 503 không xác minh IP/limiter.

## Khách mua dịch vụ

| POST operation | Payload                                                        | Kết quả / guard                                                            |
| -------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `invitations`  | `{invitation: InvitationInput, id?: string, version?: number}` | Tạo/sửa thuộc owner; data `{id, version}`; sửa phải version hiện tại       |
| `publish`      | `{id: string, publish: boolean}`                               | Publish/unpublish; đủ quyền lợi khi publish; suspended bị từ chối          |
| `orders`       | `{invitationId: string, planId: string, clientId: UUID}`       | data `{id}`; ownership, plan active, snapshot và replay                    |
| `payment-note` | `{id: string, note: string}`                                   | note 4–300 ký tự; pending thuộc account; không kích hoạt                   |
| `guests`       | `{invitationId: string, name: string, group: string}`          | name 2–100, group 1–80; ownership; tối đa 2.000 khách; token do server tạo |
| `moderate`     | `{id: responseId, status: "approved" \| "hidden"}`             | Chỉ response thuộc thiệp của account                                       |

InvitationInput chính xác tại `src/lib/wedding.ts`: templateId, slug, groom, bride, weddingDate, headline, story, groomParents, brideParents, events, photos, coverUrl, musicUrl, giftBank, giftAccount, giftName (nhà trai), brideGiftBank, brideGiftAccount, brideGiftName (nhà gái, mặc định rỗng để tương thích client cũ). Zod strict không chấp nhận field thừa. Date là ISO datetime có offset; image URL chỉ ảnh sample hoặc WebP upload local; mỗi bên ngân hàng điền đủ bộ hoặc bỏ trống toàn bộ. Tiền mừng không tạo ServiceOrder/WeddingPayment.

Ví dụ browser đã có phiên và invitationId/planId từ dữ liệu server:

```ts
const response = await fetch("/api/wedding/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ invitationId, planId, clientId: crypto.randomUUID() }),
});
const result = await response.json();
```

Giữ cùng clientId khi retry cùng yêu cầu. ID mới không phải bảo đảm tạo order mới nếu còn pending cùng gói/thiệp.

## Khách dự cưới

POST `rsvp/<slug>`:

```ts
type RSVPInput = {
  clientId: string; // UUID
  name: string; // 2–100 ký tự
  attendance: "attending" | "declined" | "undecided";
  partySize: number; // integer 1–10; server lưu 0 nếu không attending
  eventIndex: number; // integer 0–3 và tiệc phải tồn tại
  message: string; // tối đa 1.000 ký tự
  guestToken?: string; // tối đa 100 ký tự, phải thuộc thiệp
};
```

Trả data `{id: responseId}`. Thiệp phải công khai hợp lệ. Personal client identity được thay bằng guest ID; submit lại cập nhật một record và đưa lời chúc về pending.

## Admin

Mọi operation dưới `admin/` cần phiên admin và role owner/manager.

| POST operation            | Payload                                                                                                        | Hành vi                                                                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin/templates`         | templateSchema, id optional                                                                                    | Create/update; không đổi premium khi có published invitation                                                                                                                          |
| `admin/plans`             | planSchema, id optional                                                                                        | Create/update catalog; không sửa snapshot order                                                                                                                                       |
| `admin/confirm-payment`   | `{id: orderId, transactionId: string, amount: integer}`                                                        | transactionId 4–100, amount ≥0; prefix manual; trả data ServiceOrder                                                                                                                  |
| `admin/cancel-order`      | `{id: orderId}`                                                                                                | Chỉ pending; ghi audit                                                                                                                                                                |
| `admin/invitation-status` | `{id: invitationId, suspended: boolean}`                                                                       | suspended/draft, tăng version, ghi audit                                                                                                                                              |
| `admin/customer-status`   | `{id: accountId, disabled: boolean}`                                                                           | Khóa/mở; khóa thu hồi phiên trong transaction có audit                                                                                                                                |
| `admin/settings`          | `{bank: string, account: string, name: string, support: string, supportPhone?: string, supportEmail?: string}` | Merchant bank BIN 6 số, account 5–30 chữ/số, name ≤100, support ≤150, supportPhone 9–15 chữ số (có thể +), supportEmail hợp lệ; liên hệ mới mặc định rỗng; bộ ngân hàng đủ hoặc trống |

templateSchema/planSchema tại `src/lib/wedding.ts` là nguồn kiểu chính thức. Layout/palette/category giới hạn danh sách; price integer 0–50.000.000, months 1–60, maxPhotos 1–40, sortOrder 0–100. Catalog mutation ngoài payment có thể audit sau ghi thay vì cùng transaction.

## Upload và export

POST `/api/wedding/upload?invitationId=<id>` dùng **raw bytes**, không phải multipart. Content-Type chính xác `image/jpeg`, `image/png` hoặc `image/webp`. Yêu cầu customer session, ownership, origin/rate guards. Stream ≤5×1024×1024 bytes; Sharp decode ≤40.000.000 pixels, rotate, resize rộng ≤1600, WebP quality 85. Trả `{ok:true,data:{url:"/uploads/weddings/<uuid>.webp"}}`. Upload chỉ tạo file, editor phải lưu URL vào invitation; không có cleanup orphan tự động.

GET `/api/wedding/export/<invitationId>` cần phiên khách và ownership. Trả text/csv UTF-8 BOM, attachment `khach-moi.csv`, tối đa 10.000 phản hồi mới nhất. Cột tên/tham dự/số người/tiệc/lời chúc/ngày gửi; tiệc đổi index sang số bắt đầu 1. Quote/escape và chặn formula prefix `= + @ -`. Private/no-store. Đây là endpoint đọc, không dùng mutation origin guard.

## SePay

POST `/api/payments/sepay` là webhook riêng, không dùng cookie/origin browser. Header `Authorization: Apikey <secret>`; env key ≥32 và account có cấu hình. Body tối đa 16.000 byte:

```ts
type SePayPayload = {
  id: number; // positive integer
  transferType: "in" | "out";
  transferAmount: number; // positive integer
  accountNumber: string;
  code?: string | null;
  content: string; // tối đa 2.000 ký tự
};
```

Extra provider fields được Zod bỏ qua. Regex tìm HY + 12 hex trong code (nếu có truthy code) hoặc content; lookup không phân biệt hoa/thường. Đúng incoming/account/code/amount gọi confirmPayment với `sepay:<id>`.

`{success:true}` acknowledge cả giao dịch bị bỏ qua (outgoing, sai account, không mã, không đơn hoặc cancelled); **không có nghĩa order đã paid**. Thiếu config 503; sai auth 401; invalid payload hoặc sai số tiền 400; transaction conflict 409; unexpected 500. Đối soát phải kiểm tra order/payment/audit.

## Xác thực và phạm vi version

Customer `/api/customer-auth/register`, `/login`, `/logout`; admin `/api/auth/login`, `/logout` thuộc nền giữ lại, có validation/session guards riêng. Xem `src/server/customer-auth/`, `src/server/auth/` và các route tương ứng. Tài liệu này không hứa compatibility cho mobile SDK/external API; khi cần, định nghĩa version và schema độc lập trước khi mở quyền bên ngoài.

## Trang thống kê quản trị

GET `/admin?period=7|30|90` yêu cầu phiên owner/manager ở server; query không hợp lệ dùng 30. Khoảng ngày VN gồm hôm nay; tiền lấy giao dịch thực receivedAt/amount và loại thiệp demo. Biểu đồ có dữ liệu theo ngày và bảng đọc bằng bàn phím. GET `/admin/customers?q=...&status=all|active|disabled&page=...` giữ bộ lọc khi phân trang, không đưa số điện thoại hoặc tài khoản ngân hàng vào biểu đồ. Không có API báo cáo công khai.

SePay chỉ kích hoạt khi tài khoản ngân hàng đã lưu khớp `SEPAY_ACCOUNT_NUMBER`; thiếu hoặc lệch cấu hình trả 503 cho giao dịch vào có mã đơn. Không đưa webhook secret vào form quản trị.

Trang bảng giá và so sánh tại bước mua chỉ hiển thị ServicePlan active. Gói được chọn từ bảng giá tiếp tục qua query `plan` trong redirect đăng nhập và bước tạo nháp; server vẫn tính giá theo catalog khi tạo đơn. Liên kết xem nhanh trên thẻ mẫu dùng `/preview/<slug>` hiện có, không công khai bản nháp của khách.

Layout catalog được validation bằng enum `editorial | botanical | classic | minimal | cinematic`; seed bổ sung bốn mẫu, không ghi đè mẫu hiện có. Không đổi cấu trúc dữ liệu thiệp khi đổi layout.

Nút bỏ qua hiệu ứng và điều hướng nội dung chỉ đổi tương tác phía xem thiệp. Không đổi public guards, token, payload RSVP hay bật nhạc tự động.

`GET /support` là trang hướng dẫn không yêu cầu đăng nhập. Chỉ xuất thông tin liên hệ chủ dịch vụ (support/supportPhone/supportEmail); không xuất merchant bank/account/name, đơn hoặc danh sách khách. Không có API mutation mới.

Liên kết lịch công khai dùng ngày giờ của từng phần tử eventsJson, chuyển thành timestamp UTC cho Google Calendar; không thêm guest token vào URL. Không có mutation hoặc schema mới. Thời điểm kết thúc trên lịch bên ngoài là giá trị tạm tính ba giờ, không phải thời điểm kết thúc được cặp đôi xác nhận.

Chuyển động ảnh theo cuộn (05/10/2026) chỉ là nâng cấp trình bày phía xem thiệp; không thêm API, không đổi payload ảnh, quyền công khai hay guest token. Ảnh nổi bật trang trí dùng ảnh đầu album, không có điều khiển hoặc dữ liệu khách mới.

Chuyển cảnh hai ảnh, mở tiêu đề, nghiêng ảnh và vuốt lightbox chỉ dùng trạng thái trình bày local (05/10/2026). Không thêm API, không ghi thay đổi thứ tự/ảnh lên server. Tất cả ảnh vẫn truy cập qua lưới album và nút trước/sau; cảnh phụ trang trí không đưa thêm nội dung vào cây accessibility.

Ảnh stock mặc định (05/10/2026): renderer có alias riêng /images/couple.jpg → /images/wedding-couple-forest.jpg để dùng ảnh mới và tránh cache cũ. URL lưu trong DB/payload không thay đổi; URL upload tùy chỉnh được giữ nguyên. Không thêm endpoint hoặc thay guards.

### Chiều sâu cho chương ảnh — 05/10/2026

Chương ảnh bổ sung hai tấm ảnh trang trí từ album, nghiêng phối cảnh và rời khung khi ảnh chính mở rộng. Tiến trình cuộn điều khiển đồng bộ chuyển cảnh, caption và thanh tiến trình; cuộn ngược đảo lại trạng thái. Điện thoại dùng tấm ảnh nhỏ hơn; reduced motion/no-JS giữ ảnh tĩnh và ẩn lớp trang trí. Học cách tổ chức lớp và nhịp từ https://www.oneplus.com/vn/15, không sao chép tài sản. Không đổi API, dữ liệu hay quyền truy cập.

### Font tiếng Việt — 06/10/2026

Nội dung dùng Be Vietnam Pro, tiêu đề/tên dùng Lora, tải local qua next/font/local với WOFF2 đầy đủ ký tự và font italic thực. Nới line-height tên/tiêu đề và mask animation để giữ dấu; font swap có fallback. Nguồn/giấy phép nằm src/app/fonts/. Không thay trường dữ liệu, API hay quyền truy cập.

### Âm nhạc và nhịp kể chuyện — 06/10/2026

`musicUrl` giữ là string: rỗng để tắt, HTTPS MP3/OGG như trước hoặc duy nhất `/audio/loi-hen.mp3` cho nhạc đóng gói. Không mở rộng arbitrary local paths, không sửa DB/migration; thiệp đang lưu giữ giá trị cũ. Demo/nội dung khởi tạo mới chọn piano, editor có chọn không nhạc/piano/bài riêng. Mở kèm nhạc gọi play trong user gesture trước await animation; skip/Escape không yêu cầu phát. Nút pause/âm lượng phản ánh media events, lỗi phát có thông báo/thử lại và không chặn mở thiệp; rời tab/unmount dừng nhạc. Chương câu chuyện dùng ảnh/tên/headline thật của thiệp; hoa SVG trang trí và ngày watermark lịch tiệc aria-hidden. Motion là progressive enhancement, reduced motion/no-JS vẫn đọc và dùng nội dung. Không đổi quyền truy cập hay RSVP/payment.

### Ảnh studio và mở thiệp — 06/10/2026

Hai ảnh stock cùng cặp đôi của Nam Nguyen thay alias minh họa couple.jpg/celebration.jpg; ghi nguồn và giấy phép trong public/images/CREDITS.md. Không thay URL ảnh khách tải lên hay dữ liệu DB. Cinematic desktop chia vùng ảnh 56% và bảng lời mời riêng để không che gương mặt; mobile giữ ảnh trên lời mời. Mở thiệp dùng phối cảnh chung 1800px, hoa SVG nét mảnh, dấu sáp hình tim; bảng tên nhấc nhẹ 520ms rồi hai cánh mở 1650ms sau trễ 220ms, giữ độ đục trong đầu chuyển động. Lớp sáng radial tắt khi kết thúc. Skip/Escape/reduced motion, focus, nhạc theo user gesture và no-JS giữ hành vi hiện có. Không đổi API/quyền truy cập.

### Hộp quà và lá rơi — 06/10/2026

Mục mừng cưới dùng details/summary bàn phím và no-JS mở được: nhấn hộp quà mở nắp, hiện QR theo một/hai tài khoản đã cấu hình; sao chép/lưu QR và fallback lỗi vẫn giữ. Preview demo chưa có tài khoản hiện hai QR SVG local mã hóa thông báo minh họa nhà trai/nhà gái, ghi rõ không dùng chuyển khoản; không tạo QR ngân hàng hay bịa tài khoản nhận tiền. Nội dung mở có animation nhẹ, reduced motion bỏ animation. Tăng lá/cánh rơi hero từ 7 lên 24, vị trí/kích thước/nhịp deterministic và delay âm để rải sẵn; decorative aria-hidden, pointer-events none, reduced motion/print ẩn. Không thay API, DB, thanh toán hay quyền truy cập.

### Admin sidebar và responsive — 07/10/2026

Shell admin chuyển từ tab ngang sang sidebar 248px cho desktop trên 900px, active route theo pathname (kể cả trang chi tiết đơn). Màn hình nhỏ dùng drawer dialog native có Escape, focus trap/return, tự đóng khi chọn mục hoặc resize desktop. Topbar giữ website/logout; skip link tới nội dung. Guard phiên/role server chạy trước khi render shell, không thay quyền/API/mutation. Bộ lọc GET giữ semantics, native select có chevron/màu/font thống nhất, nút xóa bộ lọc đơn. Bảng đơn/khách/thiệp/nhật ký ở <=600px hiện thẻ có nhãn cột; bảng desktop giữ cấu trúc ngữ nghĩa, panel rộng cuộn nội bộ. Form, stats, mẫu/gói và cấu hình co theo diện tích nội dung. Áp dụng UI UX Pro Max từ skill source my_task: focused UX responsive navigation và Next.js active links; dùng palette/font hiện có và Lucide đồng nhất.

### Dropdown trạng thái đơn dùng template — 07/10/2026

Ô trạng thái ở `/admin/orders` dùng lại `DropdownField` và `Select` từ template my_task, trên Base UI 1.8.0. Popup nằm trong portal, cùng màu/font Hỷ Studio, có tick lựa chọn, highlight bàn phím, Escape/return focus và hiệu ứng tôn trọng reduced motion. Form GET giữ tên `status` qua hidden input, các giá trị pending/paid/cancelled và giá trị rỗng cho tất cả; xóa bộ lọc khôi phục lựa chọn. Không thay truy vấn, quyền hoặc xử lý thanh toán.

Dropdown trạng thái tài khoản ở `/admin/customers` dùng cùng `DropdownField` của template với đơn dịch vụ. Form GET giữ `status=all|active|disabled`, tên truy cập “Trạng thái tài khoản”, lựa chọn theo URL và truy vấn/phân trang hiện có.

### Album và nhạc thiệp mẫu — 07/10/2026

Mẫu mới dùng sáu ảnh thật cùng cặp đôi, album hai cột so le và ảnh ngang rộng mỗi ba ảnh. Demo lưu từ baseline với đúng ba ảnh stock cũ được nâng album lúc render; demo có musicUrl rỗng dùng piano Lời hẹn. Nhạc bắt đầu khi bấm mở thiệp, có tắt/bật/âm lượng; skip vẫn yên lặng. Thiệp khách và album demo tùy chỉnh giữ dữ liệu đã chọn, không ghi đè DB. Guard công khai/entitlement không đổi.

Phần Câu chuyện dùng bố cục ảnh in giấy chữ nhật nghiêng nhẹ, kèm ảnh nhỏ so le khi album có ảnh khác. Ưu tiên ảnh album khác ảnh bìa; album rỗng dùng ảnh bìa. Khung vòm phần đầu giữ nguyên, ảnh câu chuyện tiếp tục hỗ trợ motion/reduced motion và responsive.

Toàn bộ select ứng dụng chuyển sang DropdownField/Select của template: admin catalog/category/palette/layout, ngân hàng dịch vụ, khoảng báo cáo/ngày biểu đồ; editor mẫu/nhạc/ngân hàng; RSVP attendance/eventIndex/partySize. Hidden input giữ tên và giá trị form; controlled state nhận onValueChange; ngân hàng BIN cũ ngoài danh mục vẫn hiển thị. Popup cuộn với danh sách dài và nhãn dài xuống dòng; không đổi hợp đồng payload/authorization/validation.

Giao diện 07/10/2026: spotlight/cascade trang chủ và bốn lớp ảnh photo chapter chỉ dùng dữ liệu render hiện có; không thêm endpoint, payload hoặc mutation. Các ảnh phụ trang trí có alt rỗng/aria-hidden; album tương tác vẫn giữ nhãn và lightbox.

Demo public và preview đều render hộp QR minh họa khi isDemo và chưa có gift account; không tạo tài khoản ngân hàng, ghi DB hay thay API chuyển khoản.

Gift UI mở QR trong dialog, không thay endpoint/VietQR URL hoặc cách sao chép số tài khoản. QR demo vẫn được ghi rõ không dùng chuyển khoản.

### Landing studio — 08/10/2026

Trang chủ bổ sung showcase năm ảnh cưới minh họa ghim theo cuộn, ảnh mở thành hình quạt; bốn thẻ lợi ích, FAQ dùng native details và bố cục editorial. Tham khảo preview công khai Showcase Equator / Carousel Spotlight của https://www.getlayers.ai/; không dùng mã nguồn/prompt Premium. Nội dung catalog vẫn đọc server, animation chỉ tăng cường client qua HomeMotion, giữ HTML hiển thị khi không có JS. Reduced motion bỏ ghim và chuyển động. Các CTA dẫn tới catalog, thiệp mẫu và tạo bản nháp; không thay API, giá, entitlement hay dữ liệu khách hàng.

### 08/10/2026 — hoàn thiện 10 mẫu thiệp

`invitationDesign` chọn composition theo cặp layout/palette hiện có, dùng chung cho thumbnail và thiệp đầy đủ: Lời yêu (editorial/rose), Vườn thương (botanical/sage), Song hỷ (classic/wine), Ngày chung đôi (editorial/sand), Đêm sao (classic/midnight), Nắng thu (botanical/terracotta), Lời hẹn (minimal/sand), Thư tình (minimal/rose), Khoảnh khắc (cinematic/midnight), Bên nhau (cinematic/terracotta). Mỗi composition có hero và chi tiết câu chuyện/lịch tiệc riêng; giữ đầy đủ countdown, lịch/bản đồ, gia đình, album/lightbox, RSVP, lời chúc được duyệt, nhạc, hộp quà QR và branding theo quyền lợi. Thumbnail phản ánh khung ảnh/chữ của composition.

Mở đầu dùng cửa cho rose/garden/traditional/night/autumn, thư cho editorial/sand và minimal, rèm cho cinematic. Skip/Escape/reduced motion vẫn đóng ngay, đưa focus tới h1 và không tự phát nhạc khi skip. Modal QR và preview RSVP disabled giữ nguyên semantics. Không đổi schema, giá, auth, API hay bank data. Tổ hợp mới ngoài 10 cặp được render fallback theo layout; admin đổi layout/palette làm composition đổi tương ứng, không khóa preset theo slug.

### Trình bày preview theo mẫu — 08/10/2026

Mười `/preview/{slug}` đang hoạt động dùng cấu trúc câu chuyện và album theo thiết kế, không chỉ đổi palette. Album Thư tình có phân trang phía client; Đêm sao có spotlight theo hover/focus; Lời hẹn cuộn ngang; Bên nhau có accordion ảnh; Khoảnh khắc xếp lớp khi cuộn. Chọn ảnh tiếp tục mở cùng lightbox hỗ trợ Escape, bàn phím và vuốt. Không phát sinh endpoint, payload, mutation hay yêu cầu mua gói; RSVP preview vẫn bị vô hiệu hóa.

Album nhận diện ảnh ngang sau khi tải để dành khung rộng hoặc giữ toàn bộ ảnh trong trang sách/spotlight/cinema; ảnh demo ngang có cấu hình trước để ổn định bố cục. Accordion desktop giãn ảnh đủ chiều cao khung và mở rộng bằng hover hoặc focus bàn phím; trên điện thoại dùng các khung dọc. Không đổi payload hoặc dữ liệu ảnh lưu.

### Trình bày bìa theo mẫu — 08/10/2026

Hero, trình tự các mục và chuyển động opening resolve từ layout/palette hiện có. Không thêm trường request/response, không đổi API hoặc điều kiện public/preview. Ảnh phụ hero đọc từ photosJson đã lưu, không tạo ảnh hoặc thông tin cặp đôi mới. Preview tiếp tục khóa gửi RSVP; quà demo không chứa tài khoản thật.

### Lịch tháng và composition lịch tiệc — 10/10/2026

Không thay payload/schema. Lịch tháng đọc weddingDate theo Asia/Ho_Chi_Minh; các khung tiệc đọc eventsJson giữ nguyên index/ngày/địa điểm. Không có API chọn ngày công khai hoặc lịch âm. Không thêm mốc chương trình/trang phục lấy từ thiệp tham khảo. Quyền public/preview, RSVP và quà giữ hợp đồng hiện hành.
