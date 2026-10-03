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
