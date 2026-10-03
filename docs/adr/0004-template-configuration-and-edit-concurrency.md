# ADR 0004 — Mẫu cấu hình, version editor và tiệc theo index

Date: 2026-10-03. Status: Accepted / implemented baseline.

## Context

Cần bán nhiều mẫu mà không làm một trình kéo-thả tự do. Chủ thiệp có thể mở nhiều cửa sổ; lịch tiệc và lựa chọn RSVP phải thống nhất.

## Decision

Template chọn một trong 3 layout và 6 palette. Nội dung sử dụng Zod schema dùng chung. Event/photo arrays lưu JSON trong Invitation. Mỗi mutation nội dung/publish tăng version; cập nhật nội dung so khớp version, publish còn kiểm tra không suspended. RSVP dùng eventIndex và chặn thay số lượng tiệc sau khi có phản hồi. Editor dùng key ổn định và không cho save chạy chồng upload.

## Alternatives

- HTML tự do/kéo-thả: linh hoạt hơn nhưng tăng diện kiểm tra/XSS, preview và bảo trì.
- Last write wins: đơn giản nhưng có thể mất nội dung khi hai tab sửa.
- WeddingEvent thành bảng có UUID ngay: định danh tốt hơn khi đổi thứ tự, thêm migration/UI và logic quan hệ.

## Consequences

Admin tạo biến thể trên layout có sẵn, không thể upload template tùy ý. eventsJson phải parse/validate khi đọc; không có FK event của RSVP. Số lượng tiệc ổn định chưa bảo vệ đổi thứ tự; người sửa phải giữ thứ tự sau RSVP. Template có published invitation không đổi premium. Đổi thiết kế global có thể tác động các thiệp đang dùng, vì chưa snapshot template cho từng thiệp.

## Evidence / revisit

`src/lib/wedding.ts`, `saveInvitation`, `publishInvitation`; `src/components/wedding/invitation-editor.tsx`, `editor-fields.tsx`. Xem xét bảng WeddingEvent với stable ID nếu cần xóa/thêm/đổi thứ tự sau RSVP; migration phải ánh xạ phản hồi cũ, không chỉ đổi UI key.
