# Hỷ Studio / Wedding Studio

Nền tảng thiệp cưới online và bán dịch vụ, clone từ `my_task`. Xem [nghiên cứu & phạm vi](docs/RESEARCH.md) và [hướng dẫn vận hành](docs/OPERATIONS.md).

## Chạy dự án

```bash
pnpm install
pnpm run setup
pnpm dev
```

Yêu cầu Node 22 và pnpm 10.28.2. Mở http://localhost:3200.

`pnpm run setup` tạo DB riêng, nạp 6 mẫu/3 gói/1 thiệp minh họa, tạo mật khẩu quản trị ngẫu nhiên trong `.local-admin-password` (quyền đọc riêng). Dùng mật khẩu này tại `/login`. `.env` và mật khẩu không đưa vào Git. Chạy setup lại không ghi đè tài khoản/ngân hàng/bảng giá đã chỉnh.

- `/`: Website giới thiệu; `/templates`, `/pricing`: mẫu và dịch vụ.
- `/account/register`, `/account/login`: tài khoản khách hàng.
- `/dashboard`: tạo/sửa thiệp, mua gói, quản lý khách mời.
- `/w/thiep-mau`: thiệp mẫu đầy đủ, dữ liệu minh họa.
- `/admin`: quản lý đơn, mẫu, gói, khách hàng, thiệp, cấu hình, nhật ký.

Khách tạo bản nháp miễn phí. Mua gói gắn với một thiệp; chuyển khoản/admin xác nhận hoặc SePay được cấu hình; sau đó khách xuất bản. Các gói ban đầu là giá mẫu để admin chốt lại trước khi bán.

## Kiểm tra

```bash
pnpm check
pnpm build
pnpm test:e2e
npx react-doctor@latest --verbose --scope changed
```

Unit/integration và E2E dùng các SQLite test độc lập. Playwright cần Chromium: `pnpm exec playwright install chromium` nếu máy chưa có trình duyệt (chạy E2E bằng `pnpm test:e2e`).

## Nền tảng giữ lại và phần thay thế

Giữ Next.js/React/TypeScript, Prisma/SQLite, customer/admin auth, session revocation, guards HTTP/CSRF, rate limiting Redis, logger và test bảo mật từ base. Thay nghiệp vụ bán hàng/POS/kho/voucher/giao hàng bằng template, service plan, invitation, service order, payment, personal guest và RSVP.

Dự án không sao chép dữ liệu, mật khẩu hoặc ảnh upload của `my_task`. Git remote `base` chỉ phục vụ đối chiếu lịch sử và bị chặn push; chưa cấu hình remote GitHub riêng.

## Lưu ý nội dung

Tên, ngày, gia đình và địa điểm trên thiệp mẫu là minh họa. Cần thông tin/ảnh của anh trai để hoàn thiện thiệp thật. Tài khoản ngân hàng mặc định để trống. Điều khoản/hoàn tiền là bản dự thảo, cần chủ dịch vụ xác nhận trước khi mở bán. SePay có endpoint thật nhưng cần khóa/tài khoản và kiểm tra sandbox; chưa kiểm tra bằng tiền thật.
