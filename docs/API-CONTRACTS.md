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
