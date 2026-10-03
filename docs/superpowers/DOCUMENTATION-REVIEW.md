# Review bộ tài liệu Superpowers — 03/10/2026

## Phạm vi review

Đối chiếu baseline `53bea9c` và yêu cầu người dùng: clone my_task, làm thiệp anh trai, bán dịch vụ có tài khoản/mẫu/gói/admin; tài liệu đầy đủ và commit/push từng phần. Bản đặc tả ghi sau triển khai; kế hoạch là nghiệm thu/hoàn thiện các phân hệ hiện hữu, không phải lịch sử TDD được dựng lại.

Đã đọc schema, validation, domain service, wedding/upload/SePay routes, guards, package/test config và test cases. Self-review trong cùng phiên; không có review subagent hoặc phê duyệt thiết kế mới từ chủ dự án được giả định.

## Coverage matrix

| Yêu cầu / bất biến                                 | Spec       | Kế hoạch / task               | Mã và bằng chứng kiểm tra                               |
| -------------------------------------------------- | ---------- | ----------------------------- | ------------------------------------------------------- |
| Clone base, bỏ nghiệp vụ dư, DB/secret riêng       | §1, §3, §6 | Global Constraints cả ba plan | Setup, Prisma, AGENTS; ADR 0001                         |
| Có mẫu, xem thử, đăng ký/mua dịch vụ               | §2, §4A/B  | Catalog T1, Commerce T1       | templates/dashboard, browser journey                    |
| Tạo/sửa ảnh/nội dung, tránh ghi đè                 | §4A        | Catalog T1                    | saveInvitation, upload, editor; domain/E2E              |
| Thiệp thật cho anh trai                            | §9         | Catalog T2                    | **Còn mở:** thiếu nội dung thật và xác nhận gia đình    |
| Snapshot giá, idempotent order                     | §4B        | Commerce T1                   | createServiceOrder, snapshot/replay tests               |
| Báo tiền không paid; admin/SePay xác nhận          | §4B        | Commerce T1/T2                | payment-note, confirmPayment, SePay route/tests         |
| Thanh toán thật, chính sách và ngân hàng           | §9         | Commerce T2                   | **Còn mở:** chủ dịch vụ/credential/sandbox              |
| Admin catalog/orders/accounts/suspension/audit     | §2, §4B    | Commerce T1                   | admin pages, guards, API; atomicity giới hạn ghi rõ     |
| Public gate khi đủ quyền; expiry/suspension        | §4C, §5    | Guests T1                     | publicInvitation/publishInvitation, domain tests        |
| Lời mời riêng, RSVP, moderation và CSV             | §4C        | Guests T1                     | submitResponse, export/moderate routes, browser journey |
| Bảo vệ owner, session, origin/body/rate và privacy | §3, §7     | T1 cả ba plan                 | guards/auth/http, logger; inherited/domain tests        |
| Production, persistent data, backup/restore        | §7, §9     | Guests T2                     | OPERATIONS, backup.py; **launch thật còn mở**           |
| Commit từng phần và push đúng repo                 | §3         | Mỗi task có commit/push       | AGENTS; Git history và remote origin                    |

Tên plan: [Catalog](plans/2026-10-03-catalog-editor-plan.md), [Commerce](plans/2026-10-03-commerce-admin-plan.md), [Guests](plans/2026-10-03-guest-publication-plan.md). Spec: [Wedding Design](specs/2026-10-03-wedding-platform-design.md).

## Các điểm đã rà và làm rõ

1. Entitlement chọn một order theo maxPhotos/expiry, không union quyền; snapshot plan không đồng nghĩa snapshot template.
2. Hết hạn ẩn public khi đọc; không có cron và không có trạng thái expired của Invitation.
3. Personal RSVP dedupe xuyên thiết bị; anonymous RSVP không bảo đảm điều đó.
4. eventIndex phụ thuộc thứ tự; hiện chỉ chặn đổi số lượng tiệc sau RSVP. Không hứa stable event ID.
5. Payment/audit nguyên tử; các mutation catalog/admin khác không phải tất cả có audit trong transaction.
6. success:true của SePay có thể là acknowledge bỏ qua; không phải bằng chứng activation.
7. Transaction prefix tách kênh; chưa có đối soát manual/SePay, trả thừa hoặc refund tự động.
8. Upload tạo file trước save; chưa có cleanup, retention hoặc private image access.
9. Giá/nội dung sample và terms chưa được chủ dịch vụ chốt. Secret không ghi trong tài liệu.
10. Chưa có CI GitHub Actions; test hooks/local không được mô tả là CI hoặc bank integration thật.

## Kiểm tra tài liệu trong lượt này

- Prettier check cho README/AGENTS/CONTEXT và toàn bộ docs.
- Validator đã kiểm 18 Markdown files, 42 liên kết local và 75 tham chiếu đường dẫn source; không có file/link bị thiếu.
- Đối chiếu các đường dẫn source/test ghi trong tài liệu với checkout.
- Kiểm ba header plan, global constraints, task/interfaces/checkboxes, lệnh có trong package và test filter có case tương ứng.
- Kiểm không có bước thay code để ngỏ bằng placeholder; bước cần dữ liệu thật ghi dependency rõ và giữ chưa hoàn thành.
- Git diff whitespace, staged file scope, remote/main đồng bộ sau push.

Đây là kiểm chứng tài liệu, không thay cho chạy lại toàn bộ test/build/E2E. Bằng chứng ứng dụng trước đó vẫn nằm tại [VERIFICATION](../VERIFICATION.md); các plan yêu cầu lần chạy mới khi thực thi.

## Điều kiện tiếp tục

Bộ docs có thể dùng để tiếp quản và review hiện tại. Những task cần chủ dự án chốt nội dung, giá, chính sách, ngân hàng và domain giữ mở. Nếu xây tính năng mới hoặc đổi quyết định kiến trúc, cần cập nhật spec/plan cho thay đổi đó; không diễn giải việc viết docs là đã giao những tính năng còn thiếu.
