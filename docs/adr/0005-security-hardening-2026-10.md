# ADR 0005 — Gia cố bảo mật sau rà soát 22/10/2026

Date: 2026-10-22. Status: Accepted / implemented.

## Context

Rà soát toàn bộ chức năng ngày 22/10/2026 phát hiện các lỗ hổng mà mã nền chưa chặn. Lỗi nghiêm trọng nhất là trang quản trị: `src/proxy.ts` chỉ kiểm tra có cookie và chỉ `src/app/admin/layout.tsx` xác thực phiên. Một request RSC (`RSC: 1` + `Next-Router-State-Tree` trỏ tới segment admin khác) với cookie giả tạo đã nhận về dữ liệu nhật ký, khách hàng, đơn, thiệp và cấu hình ngân hàng, vì Next.js chỉ render lại segment page mà không chạy layout.

## Decision

1. **Guard trang quản trị.** `requireAdminPage(roles)` trong `src/server/auth/require-admin-session.ts` xác thực phiên DB và role; mọi `src/app/admin/**/page.tsx` gọi hàm này là câu lệnh `await` đầu tiên. Layout vẫn gọi để không render shell, nhưng không còn là ranh giới tin cậy duy nhất. Test tĩnh trong `tests/server/auth/require-admin-page.test.ts` bắt buộc quy tắc cho page mới.
2. **Đăng nhập khách không lộ số điện thoại đã đăng ký.** `verifyCustomerCredential` luôn chạy scrypt, dùng hash giả khi không có tài khoản; phản hồi lỗi chung và thời gian xử lý tương đương cho số chưa đăng ký, tài khoản bị khóa và sai mật khẩu.

## Alternatives

- Xác thực đầy đủ trong `proxy.ts`: proxy chạy cho mọi request, không nên truy vấn DB; tài liệu Next khuyến nghị kiểm tra gần dữ liệu.
- Chỉ dựa vào layout: đã chứng minh bị vượt qua bằng RSC.

## Consequences

Thêm một truy vấn phiên mỗi lần render page admin (layout + page); chấp nhận được ở quy mô hiện tại.

## Evidence / revisit

Tái hiện trước và sau sửa trên dev server cô lập (port 3210, bản sao DB): cookie giả nhận `NEXT_REDIRECT;replace;/login`, cookie hợp lệ vẫn thấy dữ liệu. Xem `docs/VERIFICATION.md` mục “Gia cố bảo mật 22/10/2026”.
