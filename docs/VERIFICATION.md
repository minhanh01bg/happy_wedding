# Kết quả kiểm tra — 03/10/2026

- `pnpm check`: lint, TypeScript, 13 file / **111 bài kiểm tra qua**.
- `pnpm build`: build production thành công, tạo toàn bộ route của website/khách/admin/API.
- `pnpm test:e2e`: **2 kịch bản Chromium qua**, trên DB test riêng.
- `pnpm run setup`: chạy lại thành công, không ghi đè catalog; migration status cập nhật đầy đủ.
- Backup bằng SQLite backup API: `PRAGMA integrity_check = ok`, có 6 mẫu trong snapshot.
- Kiểm tra production thiếu cấu hình: instrumentation từ chối chuẩn bị ứng dụng với lỗi môi trường; không phục vụ ứng dụng khi thiếu Redis, HMAC, proxy và origin công khai.
- Kiểm tra desktop/mobile bằng Playwright; màn hình chính và thiệp mẫu không có lỗi console.

## Những đường đi được kiểm tra trên trình duyệt

Đăng ký → dashboard → tạo thiệp → tải ảnh từ thiết bị → lưu → thử xuất bản khi chưa thanh toán (bị từ chối) → mua gói → báo chuyển khoản (vẫn pending) → admin đăng nhập/xác nhận giao dịch → khách kiểm tra trạng thái → xuất bản → tạo lời mời cho Chị Lan → khách mở link cá nhân → RSVP hai người/lời chúc → chủ thiệp duyệt → lời chúc xuất hiện công khai → xuất CSV.

Kịch bản khác kiểm tra trang chủ ở 390×844, lọc mẫu theo phong cách, chi tiết mẫu và bản preview hoàn chỉnh. Preview khóa chức năng gửi RSVP. Kiểm tra không có cuộn ngang trên điện thoại; mutation không có phiên khách trả 401.

## Kiểm tra miền nghiệp vụ

Quyền sở hữu thiệp, cập nhật version, trùng slug, gói hết hạn, mẫu cao cấp, tài khoản/thiệp bị khóa; snapshot giá/quyền lợi; idempotency mua gói và webhook; sai số tiền, sai auth, sai ngân hàng, tiền ra, đơn đã hủy; gia hạn; RSVP không nhân đôi theo lời mời; lời chúc mặc định chờ duyệt; không xóa/thêm tiệc khi đã có phản hồi; lọc token lời mời/API Key khỏi log.

## React Doctor

Bản quét đầy đủ đầu tiên sau khi stage toàn bộ mã mới: 60/100, 39 gợi ý. Sau rà soát: **72/100, 8 gợi ý**, không còn gợi ý performance. Đã đổi API Zod sang API v4, tách trình sửa thiệp thành các phần, bảo vệ request tải ảnh, dùng ref cho version, ổn định key tiệc/ảnh, gom formatter, gom query độc lập và tách hàm điều hướng khỏi component.

8 gợi ý còn lại đã được xem:

- 5 lần preventDefault trong form: **false positive với luồng hiện tại, confidence cao**. Các form chủ động gửi JSON qua API, có trạng thái pending/error và giữ nội dung khi lỗi; native submit sẽ điều hướng sai. E2E xác nhận các form hoạt động. Chưa chuyển toàn bộ sang form actions vì việc reset input sẽ đổi hành vi này.
- 2 cấu trúc bảng lặp: **gợi ý maintainability, confidence cao**. Bảng nhật ký và bảng khách hàng có miền dữ liệu khác nhau; có thể trích table shell khi mở rộng giao diện.
- AuthForm nhiều nhánh: **gợi ý maintainability, confidence cao**. Ba chế độ register/customer login/admin login; các luồng đã được E2E và kiểm tra session bao phủ. Có thể tách presentation theo vai trò trong đợt tiếp theo.

Không tắt hoặc suppress rule để thay đổi điểm.

## Chưa xác minh / cần thông tin thật

Chưa chạy giao dịch tiền thật hoặc tài khoản SePay thật; chưa triển khai domain/HTTPS production. Ngân hàng nhận tiền chưa cấu hình, giá là dữ liệu khởi tạo. Thiệp mẫu không phải thiệp của anh trai. Cần tên, ngày/giờ, địa điểm, ảnh và thông tin nhận tiền để hoàn thiện nội dung thật. Xem [hướng dẫn vận hành](OPERATIONS.md).

## Animation và album — 03/10/2026

Giữ nguyên palette, thêm hero xuất hiện lần lượt, ảnh bìa zoom chậm, trang trí theo layout, nội dung và thẻ hiện khi cuộn, phản hồi nút/RSVP/nhạc. Album dùng native dialog với chuyển ảnh, Escape, focus trap và trả focus về thumbnail. Nội dung không bị ẩn khi JavaScript chưa chạy; reduced motion tắt cả CSS và Web Animations API.

Kiểm tra mới: `pnpm check` đạt lint/TypeScript và 111 tests; `pnpm build` đạt; `pnpm test:e2e` đạt 3/3 kịch bản, gồm album trên viewport 390×844, phím mũi tên, Escape, focus restoration, không cuộn ngang và đổi reduced motion. Không thay API, quyền công khai hoặc dữ liệu thanh toán.

## Mở cửa thiệp — 03/10/2026

Thêm màn mở thiệp bằng hai cánh cửa xoay, theo palette/layout của mẫu; tên cặp đôi, ngày cưới và tên khách riêng khi có. Native dialog khóa focus/scroll trong lúc mở, nút Mở thiệp hoặc Escape mở cửa; sau đó focus tiêu đề và bắt đầu animation nội dung. Reduced motion mở tức thì; không JavaScript vẫn xem được thiệp. Đã xem giao diện ở 390×844 và 1440×900.

`pnpm check` đạt lint/TypeScript và 111 tests; `pnpm build` đạt; `pnpm test:e2e` đạt 4/4. Kịch bản mới kiểm tra mở bằng Enter/Escape, focus/scroll sau mở, tải lại, reduced motion và fallback không JavaScript. Kịch bản RSVP/album chờ cửa đóng trước khi tương tác.

## Responsive theo UI UX Pro Max — 03/10/2026

Áp dụng skill local `my_task/.agents/skills/ui-ux-pro-max/SKILL.md`: tra cứu domain UX (responsive/table handling/touch friendly) và stack Next.js (responsive images). Giữ màu và phong cách hiện tại; menu chính hiển thị trên điện thoại, control có vùng bấm lớn hơn, form 16px ở ≤800px, grid xử lý tên dài, ảnh bìa/QR/countdown/album co theo màn hình, cửa mở thu gọn ở landscape. Header workspace xuống dòng và không sticky trên mobile.

`pnpm check` đạt lint/TypeScript và 111 tests; `pnpm build` đạt. `pnpm test:e2e` đạt 10/10: sáu viewport 320×568, 390×844, 844×390, 768×1024, 1024×768, 1440×900; trang chủ/kho mẫu/bảng giá/login, ba layout editorial/botanical/classic, tên dài, cửa mở và nút đóng album nằm trong màn hình, không tràn ngang. Đã xem ảnh chụp mobile và landscape. Kiểm tra bằng Chromium mô phỏng viewport; chưa xác minh trên thiết bị iOS/Android thật.

Sau bổ sung kiểm tra vùng đăng nhập, chạy lại `pnpm test:e2e --grep 'customer buys'` đạt 1/1: workspace khách hàng và danh sách đơn admin không tràn ngang ở 320/768/1024px, nút đăng xuất luôn hiển thị; luồng thanh toán, xuất bản, RSVP và duyệt lời chúc vẫn đạt.

## Hai tài khoản mừng cưới — 03/10/2026

Migration additive giữ tài khoản cũ ở nhà trai và thêm ba trường nhà gái mặc định rỗng. Đã chạy toàn bộ migrations trên DB mới ở `/tmp`, kiểm tra giữ tài khoản cũ bằng fixture SQLite, áp dụng migration vào `prisma/dev.db` của dự án (không dùng DB `my_task`). Server tests kiểm tra lưu/xuất bản hai bên, ngân hàng nhà gái thiếu dữ liệu, ownership và input từ client cũ.

`pnpm check` đạt lint/TypeScript và 114 tests; `pnpm build` đạt. Chín kịch bản preview/responsive E2E đạt; sau sửa locator ngân hàng theo role combobox, `pnpm test:e2e --grep 'customer buys'` đạt toàn luồng với hai tài khoản, fallback khi chủ động chặn QR nhà trai, thông tin tài khoản vẫn hiện và RSVP vẫn hoạt động. Test phải cuộn đến QR để kích hoạt ảnh lazy-load. Tiền mừng không tạo payment/order hoặc cộng doanh thu; chưa thử chuyển khoản thật.

## Dashboard và thống kê khách — 03/10/2026

Thêm báo cáo 7/30/90 ngày với tám chỉ số, tiền thực nhận toàn thời gian/trong kỳ, kỳ trước, biểu đồ đường tương tác và bảng ngày, tổng theo gói snapshot, trạng thái catalog/khách/thiệp và tác vụ vận hành. Danh sách khách có bộ lọc hoạt động/khóa, tổng theo trạng thái và số tiền gói đã thanh toán. Role/session được xác minh lại ở dashboard trước lấy số liệu.

`pnpm check` đạt 116 tests/lint/typecheck, `pnpm build` đạt. E2E toàn bộ 10/10 đạt cho QR và dashboard; sau thêm danh sách khách, chạy lại `pnpm test:e2e --grep 'customer buys'` đạt 1/1 với biểu đồ/bảng, đổi kỳ 7→90, số tiền khách và bộ lọc tài khoản khóa. Server regression xác minh ranh giới 17:00 UTC thành ngày VN mới, loại demo/pending, tiền theo ngày/kỳ/gói và dữ liệu 0. Đã xem screenshot dashboard 390/1440px và xác nhận không cuộn ngang. Tiền này chưa trừ chi phí; chưa có hoàn tiền/đối soát hai kênh ngoài luồng hiện có.

## Cấu hình thanh toán dịch vụ — 05/10/2026

Chọn ngân hàng theo tên, xem trước tài khoản/QR, lưu liên hệ điện thoại/email có link trực tiếp từ đơn. QR lỗi giữ hướng dẫn chuyển khoản và có thử lại. API và đọc cấu hình dùng chung schema; dữ liệu cũ không có hai trường liên hệ vẫn đọc được. SePay ngừng kích hoạt khi chưa lưu hoặc tài khoản đã đổi không khớp máy chủ.

`pnpm check` đạt lint/typecheck và 121 tests; `pnpm build` đạt. `pnpm test:e2e` đạt 10/10, gồm lưu cấu hình qua phiên admin, khách tải lại đơn thấy liên hệ tel/mailto và vẫn chờ xác nhận, sau đó xác nhận/xuất bản/RSVP. Tests server kiểm tra đổi tài khoản không kích hoạt, thiếu merchant trả 503, tương thích cấu hình cũ, liên hệ không hợp lệ, secret ngắn và tài khoản lệch. Chưa thử giao dịch ngân hàng thật; trạng thái cấu hình khớp không khẳng định bank live đã hoạt động.
