# ADR 0005 — Gia cố bảo mật sau rà soát 22/10/2026

Date: 2026-10-22. Status: Accepted / implemented.

## Context

Rà soát toàn bộ chức năng ngày 22/10/2026 phát hiện các lỗ hổng mà mã nền chưa chặn. Lỗi nghiêm trọng nhất là trang quản trị: `src/proxy.ts` chỉ kiểm tra có cookie và chỉ `src/app/admin/layout.tsx` xác thực phiên. Một request RSC (`RSC: 1` + `Next-Router-State-Tree` trỏ tới segment admin khác) với cookie giả tạo đã nhận về dữ liệu nhật ký, khách hàng, đơn, thiệp và cấu hình ngân hàng, vì Next.js chỉ render lại segment page mà không chạy layout.

## Decision

1. **Guard trang quản trị.** `requireAdminPage(roles)` trong `src/server/auth/require-admin-session.ts` xác thực phiên DB và role; mọi `src/app/admin/**/page.tsx` gọi hàm này là câu lệnh `await` đầu tiên. Layout vẫn gọi để không render shell, nhưng không còn là ranh giới tin cậy duy nhất. Test tĩnh trong `tests/server/auth/require-admin-page.test.ts` bắt buộc quy tắc cho page mới.
2. **Đăng nhập khách không lộ số điện thoại đã đăng ký.** `verifyCustomerCredential` luôn chạy scrypt, dùng hash giả khi không có tài khoản; phản hồi lỗi chung và thời gian xử lý tương đương cho số chưa đăng ký, tài khoản bị khóa và sai mật khẩu.
3. **Cookie khách nhất quán.** Login và logout `customer_session` dùng `customerCookieOptionsForRequest`, cùng chính sách Secure với cookie admin (HTTPS/`x-forwarded-proto`, hoặc production trừ khi Origin khớp CANONICAL_ORIGIN HTTP đã cấu hình). Trước đây login có thể phát cookie không Secure ở production nếu proxy không gửi `x-forwarded-proto`, còn logout luôn Secure ở production nên có thể không xóa được cookie đó.
4. **`/api/csp-report` có giới hạn.** Chỉ nhận content-type báo cáo CSP/JSON, đọc stream tối đa 8 KB bằng `readJsonBody`, rate-limit theo IP qua `mutationLimit("csp-report")`, và cắt mỗi trường log còn 300 ký tự. Báo cáo bị từ chối vẫn trả 204, không ghi log.
5. **Lỗi bản ghi không tồn tại và giới hạn khách.** API wedding ánh xạ Prisma P2025 thành 404 thay vì 500 có correlation ID. `addGuest` trong service kiểm tra quyền sở hữu, đếm và tạo lời mời trong cùng transaction `tx`, nên request đồng thời không vượt 2.000 khách/thiệp.
6. **Tài khoản nhận tiền chỉ owner được đổi.** `admin/settings` quyết định mọi khoản thanh toán dịch vụ đi đâu; manager bị 403 và trang cấu hình hiện chỉ đọc. Manager vẫn xác nhận/hủy đơn theo spec, vì mỗi xác nhận đã bắt buộc transaction ID duy nhất, số tiền khớp đơn và audit.
7. **Quota upload.** Trước đây chỉ có rate-limit 60 ảnh/giờ/account, nên một tài khoản có thể ghi khoảng 1.400 file/ngày vô thời hạn. Model `WeddingUpload` ghi từng file; `reserveUpload` kiểm tra ownership và quota (120/thiệp, 150/account/24 giờ) trong một transaction trước khi ghi đĩa.
8. **Nhạc HTTPS bên ngoài.** Giữ tính năng đường dẫn MP3/OGG tùy chọn, vì `<audio preload="none">` và `Referrer-Policy: no-referrer` khiến trình duyệt khách chỉ gọi host ngoài sau khi họ bấm phát. Host phải là tên miền có TLD chữ; IP literal và `localhost` bị từ chối để thiệp không hướng trình duyệt khách vào mạng nội bộ của họ. Không có SSRF vì server không tải URL.
9. **PBKDF2 admin 600.000 vòng.** Hash mới lưu số vòng: `iterations:salt:hash`; `salt:hash` cũ được xác minh ở 100.000 vòng để không khóa môi trường đang chạy. Số vòng dưới 100.000 hoặc sai định dạng bị từ chối, nên không thể hạ cấp qua env. `scripts/setup.ts` và cấu hình E2E sinh định dạng mới.
10. **CSP theo giai đoạn.** Gỡ các origin Vercel Analytics khỏi `script-src` và `connect-src`, vì dự án không tải script hay telemetry Vercel. `connect-src` giờ chỉ còn `'self'`, thêm origin Sentry khi có cấu hình. `script-src` production vẫn có `'unsafe-inline'` và mặc định `CSP_MODE=report-only`. Lý do: nonce bắt mọi trang render động (tắt static/ISR cho thiệp công khai), còn SRI vẫn experimental. Bước tiếp theo, chỉ làm khi có quyết định vận hành riêng: theo dõi `csp.violation` ở report-only, rồi bật `CSP_MODE=enforce`, sau đó mới cân nhắc nonce hoặc SRI.

## Alternatives

- Xác thực đầy đủ trong `proxy.ts`: proxy chạy cho mọi request, không nên truy vấn DB; tài liệu Next khuyến nghị kiểm tra gần dữ liệu.
- Chỉ dựa vào layout: đã chứng minh bị vượt qua bằng RSC.

## Consequences

Thêm một truy vấn phiên mỗi lần render page admin (layout + page); chấp nhận được ở quy mô hiện tại.

## Evidence / revisit

Tái hiện trước và sau sửa trên dev server cô lập (port 3210, bản sao DB): cookie giả nhận `NEXT_REDIRECT;replace;/login`, cookie hợp lệ vẫn thấy dữ liệu. Xem `docs/VERIFICATION.md` mục “Gia cố bảo mật 22/10/2026”.
