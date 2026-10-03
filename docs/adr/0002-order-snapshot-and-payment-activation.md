# ADR 0002 — Snapshot và kích hoạt thanh toán

Date: 2026-10-03. Status: Accepted / implemented baseline.

## Context

Gói và giá có thể thay đổi sau khi khách đặt. Khách báo đã chuyển không đủ chứng minh đã thu tiền. Webhook ngân hàng có retry; gia hạn không được cộng nhiều lần cho một giao dịch.

## Decision

Server snapshot giá và quyền lợi vào ServiceOrder. Client UUID dedupe tạo đơn; mã HY dùng đối soát. confirmPayment thực hiện payment + order + expiry + audit trong một DB transaction. transactionId unique có prefix manual/sepay; phải khớp số tiền tuyệt đối. Ghi chú khách không kích hoạt đơn. Đơn pending có thể cancel; paid không cancel/refund qua API hiện tại. Webhook và admin dùng cùng activation service.

## Alternatives

- Đọc quyền từ plan hiện tại: thay bảng giá có thể làm thay đổi quyền đã bán.
- Tin nút đã chuyển: không có bằng chứng sao kê và dễ gian lận.
- Provider cập nhật order trực tiếp: hai quy tắc kích hoạt khác nhau, retry dễ tạo sai expiry.

## Consequences

Retry cùng giao dịch không kéo dài hạn hai lần. Gia hạn cộng UTC months sau expiry dài nhất còn hiệu lực. Đơn đã paid không ghi thêm payment khi nhận ID mới; chưa hỗ trợ reconciliation tiền trả thừa/thiếu hoặc hoàn tiền. Cùng giao dịch nhập manual và đến SePay có hai prefix; không có bộ đối soát hai kênh tự động. Chọn một entitlement theo maxPhotos rồi expiry, không union quyền giữa các đơn.

## Evidence / revisit

`createServiceOrder`, `confirmPayment`, `entitlement` trong `src/server/wedding/service.ts`; `src/app/api/payments/sepay/route.ts`; `tests/server/wedding/service.test.ts`. Xem xét lại khi cần nâng/hạ gói, hoàn tiền, tiền trả thừa, webhook nhiều ngân hàng hoặc đối soát manual/SePay. Mọi thay đổi phải giữ lịch sử thu tiền và có regression test về retry.
