# ADR 0003 — Xuất bản, lời mời riêng và moderation

Date: 2026-10-03. Status: Accepted / implemented baseline.

## Context

Khách được preview trước khi mua nhưng thiệp public chỉ phục vụ khi có quyền. Lời mời có tên cần hoạt động không yêu cầu khách dự cưới tạo tài khoản. Nội dung lời chúc từ người ngoài không được công khai ngay.

## Decision

publicInvitation yêu cầu published + owner enabled + entitlement paid chưa hết hạn. Suspension do admin quản lý, restore về draft. Token 24 byte ngẫu nhiên nhận diện WeddingGuest trong một thiệp; không cấp quyền dashboard. Personal RSVP dùng guest ID làm dedupe, public RSVP dùng client UUID. Mỗi submit đưa wishStatus về pending; owner duyệt approved/hidden.

## Alternatives

- Public mọi draft: lộ nội dung chưa duyệt và không thể bán entitlement.
- RSVP bắt buộc đăng nhập: giảm khả năng khách lớn tuổi sử dụng.
- Công khai mọi lời chúc: spam và nội dung không mong muốn xuất hiện ngay.

## Consequences

Hết hạn ẩn khi đọc, không cần cron; người giữ link riêng có thể gửi/thay phản hồi của lời mời đó. Token không phải định danh người thật. Public UUID không dedupe xuyên thiết bị. Token không được log/đưa vào referrer. Chưa có token rotation, xác thực danh tính khách hoặc gửi link tự động.

## Evidence / revisit

`publicInvitation`, `publishInvitation`, `submitResponse`; `src/app/w/[slug]/page.tsx`; `src/lib/log-redaction.ts`; Next no-referrer header; domain và E2E tests. Xem xét lại khi khách yêu cầu RSVP xác thực, thu hồi từng link hoặc quản lý thiệp hết hạn theo chính sách khác.

### Hai tài khoản mừng cưới (03/10/2026)

Thông tin nhận mừng cưới nhà trai/nhà gái là nội dung chủ thiệp chủ động công khai khi xuất bản; không thuộc thanh toán dịch vụ. Giữ giftBank/giftAccount/giftName cho dữ liệu cũ, bổ sung brideGiftBank/brideGiftAccount/brideGiftName mặc định rỗng. Mỗi bên độc lập, điền đủ hoặc để trống. Ảnh QR có referrer-policy no-referrer, thông tin tài khoản và thao tác sao chép vẫn dùng được khi nhà cung cấp QR lỗi; không ghi nhận/giả lập việc khách đã chuyển tiền.

## Đọc thiệp và bỏ qua chuyển động — 05/10/2026

Cho phép mở tức thì qua nút rõ nhãn hoặc Escape, vẫn trả focus vào tiêu đề và phát cùng sự kiện mở nội dung. Các lối tắt là anchor tới phần sẵn có, không tải hay công khai danh sách khách. Nhãn tiếng Việt và chữ chính 16px được dùng cho mọi viewport; tương phản chữ không giảm bằng opacity. Không thay quyền truy cập thiệp.

## Hỗ trợ trước khi mua — 05/10/2026

Trang hướng dẫn công khai tái sử dụng liên hệ đã lưu trong merchant, chỉ truyền ba trường hỗ trợ để chủ dịch vụ không phải cập nhật một kênh liên hệ khác. Không biến trang công khai thành trang tra cứu đơn hoặc tài khoản: khách xem trạng thái đơn sau đăng nhập, khách mời hỏi cặp đôi về lịch/đường dẫn thiệp.

## Liên kết lịch của từng tiệc — 05/10/2026

Tạo link từ đúng thông tin tiệc công khai thay vì dùng ngày cưới chung cho mọi tiệc. Helper chỉ nhận date/title/location, không nhận đối tượng Invitation hay WeddingGuest để tránh vô tình đưa capability vào URL bên ngoài. Giữ rel noopener/noreferrer và referrer policy hiện có.

### Chuyển động ảnh — 05/10/2026

Hiệu ứng theo cuộn là progressive enhancement sau khi mở thiệp. Nội dung SSR vẫn hiện, ảnh nổi bật thêm vào album là trang trí aria-hidden, không thêm liên kết hay dữ liệu khách. Tắt sticky/parallax khi giảm chuyển động, kể cả khi đổi thiết lập trong phiên; không thay đổi guards và các tương tác RSVP/album.

### Các lớp ảnh và vuốt album — 05/10/2026

Hai cảnh nổi bật vẫn là trang trí aria-hidden dùng dữ liệu ảnh sẵn có. Giữ toàn bộ ảnh và nút native trong album. Chỉ nhận vuốt từ pointer touch chính, hỗ trợ pointercancel và không xử lý chuyển động dọc; cập nhật lựa chọn đồng bộ, không lấy animationend làm điều kiện. Reset pointer animation/inline styles khi reduced motion hoặc loại con trỏ thay đổi, cleanup khi unmount. Guards và dữ liệu khách không đổi.

### Thay ảnh stock — 05/10/2026

Dùng alias URL stock tại renderer thay vì sửa DB/ảnh người dùng. Ảnh stock chỉ minh họa, nguồn/giấy phép có trong repo; không đại diện cho cặp đôi có tên trong demo. Bố cục cinematic mobile giữ vùng ảnh riêng để panel không che khuôn mặt; publication/guest boundaries không đổi.
