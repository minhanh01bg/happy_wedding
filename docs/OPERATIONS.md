# Vận hành Wedding Studio

## Thiết lập thiệp thật

1. Tạo tài khoản khách tại `/account/register`.
2. Chọn mẫu, thay tên hai người/ngày giờ (giờ Việt Nam), câu chuyện/gia đình, lịch hai nhà. Tạo đường dẫn dễ nhớ.
3. Lưu bản nháp, tải ảnh của cặp đôi, chọn ảnh bìa, bỏ ảnh minh họa. Thêm ngân hàng nhận mừng cưới nếu muốn.
4. Mở preview đầy đủ trên điện thoại; kiểm tra địa chỉ Maps và giờ của từng tiệc.
5. Mua gói. Admin kiểm tra giao dịch và xác nhận tại `/admin/orders/<id>` bằng mã giao dịch thật.
6. Tài khoản khách về thiệp, bấm xuất bản. Thêm khách trong mục quản lý khách, sao chép link riêng.
7. Duyệt lời chúc, theo dõi số người, xuất CSV.

Không dùng bản demo cho thiệp thật. Bản demo có nhãn minh họa và danh tính không đăng nhập được.

## Admin

Mật khẩu local nằm trong `.local-admin-password`, chỉ đọc tại máy. Đăng nhập ở `/login`. Đổi mật khẩu bằng cách tạo PBKDF2 hash mới theo `scripts/setup.ts`, cập nhật STORE_PASSWORD_HASH và khởi động lại. Khi xoay mật khẩu production, thu hồi AdminSession và tăng AdminIdentity.version để vô hiệu phiên cũ.

Mẫu được tạo từ năm bố cục/phối màu đã hỗ trợ. Chạy `pnpm db:seed` trên DB wedding để thêm bốn mẫu mới (Lời hẹn, Thư tình, Khoảnh khắc, Bên nhau); seed không ghi đè catalog hiện có. Ngừng cung cấp mẫu không làm hỏng thiệp đã xuất bản; thiệp đang dùng vẫn hiển thị. Không đổi thuộc tính cao cấp của mẫu khi còn thiệp đã xuất bản. Ngừng bán gói không ảnh hưởng quyền đã mua.

Khóa tài khoản ngừng phiên khách và truy cập thiệp công khai. Tạm khóa một thiệp chỉ khóa thiệp đó. Khi mở khóa, thiệp về bản nháp để chủ thiệp tự xuất bản sau khi kiểm tra.

## Thanh toán

Cấu hình ngân hàng nhận **tiền dịch vụ** trong `/admin/settings`; ngân hàng **mừng cưới** nằm trong từng thiệp. Đừng nhầm hai tài khoản này.

Mỗi đơn có mã HY + 12 ký tự hex. Khách chuyển đúng số tiền và nội dung. Nút báo đã chuyển chỉ ghi chú; admin vẫn phải kiểm tra sao kê. Xác nhận khớp tiền, transaction ID duy nhất. Gia hạn cộng số tháng sau thời hạn còn lại. Giá/quyền lợi lưu snapshot lúc đặt.

SePay tùy chọn:

- `.env`: SEPAY_WEBHOOK_API_KEY tối thiểu 32 ký tự ngẫu nhiên, SEPAY_ACCOUNT_NUMBER đúng tài khoản nhận tiền.
- Tạo webhook `https://<domain>/api/payments/sepay`, sự kiện tiền vào, API Key auth.
- Header do nhà cung cấp gửi: `Authorization: Apikey <secret>`.
- Chọn tài khoản tương ứng ngân hàng trong admin settings. Kiểm tra Test Mode/sandbox trước.
- Tài khoản trong admin settings phải khớp SEPAY_ACCOUNT_NUMBER. Khi đổi tài khoản nhận tiền, cập nhật cấu hình máy chủ và kiểm tra giao dịch thử; webhook trả 503 khi cấu hình không khớp hoặc chưa lưu ngân hàng.
- Lưu số điện thoại/email hỗ trợ trong admin settings để khách bấm gọi hoặc gửi email từ trang thanh toán.
- Chỉ giao dịch khớp tài khoản, mã đơn, số tiền mới kích hoạt. Transaction ID có prefix nhà cung cấp; retry không tăng thời hạn hai lần.
- Chưa tích hợp hoàn tiền tự động. Đơn pending có thể hủy; đơn paid không hủy qua giao diện để tránh xóa lịch sử doanh thu.

## Production

Bản này chạy Node với SQLite và ảnh local; cần máy chủ/container có volume bền vững. Không chạy nhiều instance cùng SQLite, không đưa DB lên disk tạm của serverless.

1. Chọn domain HTTPS; điền NEXT_PUBLIC_APP_URL và CANONICAL_ORIGIN trùng origin thật.
2. Tạo STORE_PASSWORD_HASH riêng, SESSION_SECRET và RATE_LIMIT_KEY_SECRET ngẫu nhiên, ít nhất 32 ký tự với các secret yêu cầu.
3. Cấu hình UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN. Production không bỏ qua lỗi limiter.
4. Chọn TRUSTED_PROXY_MODE tương ứng reverse proxy. `custom` cần TRUSTED_CLIENT_IP_HEADER được proxy ghi đè, không chuyển nguyên header khách tự gửi.
5. Cấu hình DATABASE_URL chỉ vào DB wedding production. `pnpm db:migrate` áp dụng migration. `pnpm db:seed` lần đầu, không ghi đè catalog đã thay đổi.
6. `pnpm build && pnpm start`. Reverse proxy chuyển tới port 3200; phục vụ HTTPS bên ngoài.
7. Đảm bảo thư mục uploads có quyền ghi và đi cùng backup; chỉ mở tài nguyên thực sự cần thiết.
8. Kiểm tra đăng ký → mua gói → tiền sandbox → xuất bản → RSVP → CSV bằng domain HTTPS.

Production env của base kiểm tra chặt. Build có placeholder để prerender/build, không thay thế cấu hình runtime. Kiểm tra `.env.example` trước triển khai; không đưa dummy Redis/domain/hash vào production.

## Backup & ảnh

`python3 scripts/backup.py <thư-mục-backup>` tạo SQLite snapshot bằng backup API (an toàn với WAL), sau đó lưu ảnh upload trong tar. Mặc định đọc DATABASE_URL từ `.env`; có thể đưa DATABASE_URL qua environment. Chạy cùng quyền tài khoản vận hành, backup chứa dữ liệu cá nhân nên không phục vụ qua web. Để có snapshot DB/ảnh đồng nhất hoàn toàn, tạm dừng ghi lúc backup.

Ảnh upload được chuyển WebP, giới hạn 5 MB input/40 megapixel, bỏ metadata và tên tệp gốc. URL ảnh là công khai; không tải tài liệu riêng. Không có cơ chế xóa dữ liệu tự động hoặc cleanup file mồ côi trong bản này; cần vận hành retention và khả năng xóa trước khi tăng quy mô.

Phục hồi: dừng app, khôi phục DB vào đúng DATABASE_URL và ảnh vào `public/uploads/weddings`, kiểm tra quyền đọc/ghi, chạy app và kiểm tra một thiệp đã xuất bản.

## Test isolation

Vitest chỉ ghi `prisma/prisma/test.db`. E2E chỉ reset `prisma/e2e.db`, không sử dụng dev.db. E2E server port 3201, build cache `.next-e2e`, thông tin admin test chỉ áp dụng cho server test. Không bật các biến môi trường test trên server thật.

## Các giới hạn đã biết

Không có OTP/xác minh số điện thoại hoặc quên mật khẩu tự phục vụ. Không có gửi SMS/email/Zalo, tên miền riêng mỗi thiệp, video, trình kéo-thả, object storage, hoàn tiền tự động hoặc analytics lượt truy cập. Khách tự gửi link; QR mừng cưới/QR dịch vụ dựa trên VietQR ngoài hệ thống. Chính sách hiện là bản dự thảo. Các dữ liệu của anh trai chưa được cung cấp.
