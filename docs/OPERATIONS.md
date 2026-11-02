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

Mật khẩu local nằm trong `.local-admin-password`, chỉ đọc tại máy. Đăng nhập ở `/login`. Đổi mật khẩu bằng cách tạo PBKDF2-SHA256 hash mới theo `scripts/setup.ts` (600.000 vòng, định dạng `600000:<salt hex 32>:<hash hex 64>`), cập nhật STORE_PASSWORD_HASH và khởi động lại. Giá trị cũ `<salt>:<hash>` vẫn được hiểu là 100.000 vòng; nên tạo lại hash mới khi xoay mật khẩu. Khi xoay mật khẩu production, thu hồi AdminSession và tăng AdminIdentity.version để vô hiệu phiên cũ.

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

Site thật chạy `next build` + `next start` từ checkout chính, dưới systemd system unit `happy-wedding.service` (chạy với user `ccgram`, có bảo vệ OOM), chỉ nghe `127.0.0.1:3200`; nginx phục vụ HTTPS và chuyển vào. `scripts/deploy-prod.sh` build bundle mới bên cạnh server đang chạy rồi đổi sang nó với vài giây downtime. **Không chạy `pnpm build` trong checkout chính:** nó ghi đè `.next` của server đang chạy. `pnpm start` cũng chỉ nghe `127.0.0.1:3200` và chỉ dùng để thử tay; site thật chạy qua unit. Đừng cho `next start` nghe `0.0.0.0`: ai vào thẳng port 3200 sẽ bỏ qua nginx và tự đặt X-Real-IP.

### Cấu hình

Đặt cấu hình production trong `.env.production.local` ở gốc checkout (`chmod 600`, đã nằm trong `.gitignore`). `next build`, `next start` và `scripts/check-prod-env.ts` đọc lần lượt `.env.production.local`, `.env.local`, `.env.production`, `.env`; giá trị đọc trước thắng, environment của tiến trình thắng tất cả. `next dev` bỏ qua tệp này. Giữ DATABASE_URL trong `.env`, vì Prisma CLI và `scripts/backup.py` chỉ đọc `.env` (script deploy tự truyền giá trị đã giải cho chúng).

Kiểm tra mà không khởi động server:

```bash
NODE_ENV=production node --import tsx scripts/check-prod-env.ts
```

Lệnh in `DATABASE_URL=file:...` khi hợp lệ, hoặc danh sách trường sai (chỉ tên trường, không in giá trị) và thoát mã 1. Server chạy cùng bộ kiểm tra (`src/config/env.ts`) lúc khởi động, nên trường **chặn khởi động** dưới đây làm `next start` dừng trước khi nhận request.

| Biến                                                                                                                                       | Chặn khởi động                                                      | Giá trị production                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CANONICAL_ORIGIN`                                                                                                                         | Có, khi thiếu                                                       | `https://example.com`, không có `/` cuối. Kiểm tra Origin/CSRF.                                                                                                                                                                      |
| `NEXT_PUBLIC_APP_URL`                                                                                                                      | Có, khi cả biến này lẫn `CANONICAL_ORIGIN` không phải URL công khai | `https://example.com`. Canonical, sitemap, OpenGraph, link chia sẻ. **Chốt lúc build.**                                                                                                                                              |
| `STORE_PASSWORD_HASH`                                                                                                                      | Có                                                                  | `600000:<salt hex 32>:<hash hex 64>` (mục Admin).                                                                                                                                                                                    |
| `RATE_LIMIT_STORE`                                                                                                                         | Có, khi đặt giá trị khác `upstash`/`memory`                         | `memory` cho site này: bộ đếm nằm trong tiến trình server, có trần 50.000 khóa, chỉ đúng khi chạy **một** instance ([ADR 0012](adr/0012-single-instance-memory-rate-limit.md)). Không có mặc định; thiếu biến nghĩa là dùng Upstash. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                                                       | Có, trừ khi `RATE_LIMIT_STORE=memory`                               | Kho rate limit dùng chung khi chạy nhiều instance. Không đặt khi dùng `memory`. Production không bỏ qua lỗi limiter.                                                                                                                 |
| `RATE_LIMIT_KEY_SECRET`                                                                                                                    | Có                                                                  | Ngẫu nhiên, ≥ 32 ký tự.                                                                                                                                                                                                              |
| `TRUSTED_PROXY_MODE`                                                                                                                       | Có, khi thiếu hoặc `none`                                           | `custom` (xem dưới).                                                                                                                                                                                                                 |
| `TRUSTED_CLIENT_IP_HEADER`                                                                                                                 | Có, khi mode là `custom`                                            | `x-real-ip`.                                                                                                                                                                                                                         |
| `SESSION_SECRET`                                                                                                                           | Chỉ khi đặt mà ngắn hơn 32 ký tự                                    | Có mặc định; mã hiện tại không dùng.                                                                                                                                                                                                 |
| `NODE_ENV`                                                                                                                                 | Không                                                               | Unit đặt `production`. Không ghi vào tệp env.                                                                                                                                                                                        |
| `DATABASE_URL`                                                                                                                             | Không                                                               | Mặc định `file:./dev.db`; đường dẫn tương đối tính từ `prisma/`.                                                                                                                                                                     |
| `CSP_MODE`                                                                                                                                 | Không                                                               | `report-only` (mặc định, [ADR 0005](adr/0005-security-hardening-2026-10.md)); `enforce` khi báo cáo CSP đã sạch. **Chốt lúc build.**                                                                                                 |
| `SEPAY_WEBHOOK_API_KEY` (≥ 32), `SEPAY_ACCOUNT_NUMBER`                                                                                     | Không                                                               | Thiếu thì webhook SePay trả 503, không tự kích hoạt đơn (mục Thanh toán).                                                                                                                                                            |
| `NEXT_PUBLIC_SENTRY_DSN`                                                                                                                   | Chỉ khi không phải URL                                              | Thêm vào `connect-src` của CSP. **Chốt lúc build.**                                                                                                                                                                                  |
| `DATA_RETENTION_DAYS`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_STORE_NAME`, `STORE_NAME`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Chỉ khi sai định dạng                                               | Được kiểm nhưng mã hiện tại chưa dùng.                                                                                                                                                                                               |
| `NEXT_DIST_DIR`, `ALLOWED_DEV_ORIGINS`                                                                                                     | —                                                                   | Không đặt trên production: biến đầu chỉ cho script deploy, biến sau chỉ cho `next dev`.                                                                                                                                              |

Biến **chốt lúc build** được ghi vào bundle (`NEXT_PUBLIC_*` vào JavaScript gửi trình duyệt, CSP vào header lúc build). Đổi chúng thì chạy lại `scripts/deploy-prod.sh`; đổi biến khác chỉ cần `sudo -n systemctl restart happy-wedding.service`. Không đưa dummy Redis/domain/hash từ build hay `.env.example` vào production: placeholder chỉ có hiệu lực trong lúc `next build`.

**IP khách:** `TRUSTED_PROXY_MODE=custom` với `TRUSTED_CLIENT_IP_HEADER=x-real-ip`. nginx ghi đè `X-Real-IP` bằng `$remote_addr` ở mọi request, nên khách không tự đặt được, và app chỉ nghe `127.0.0.1` nên không ai vào thẳng mà bỏ qua nginx. Không dùng `vercel` (đọc `x-vercel-forwarded-for` trước, nginx chuyển nguyên header khách gửi) hay `cloudflare` (`cf-connecting-ip` khách tự gửi được khi không có Cloudflare phía trước). Nếu sau này đặt Cloudflare trước nginx, giữ cấu hình app và cho nginx giải IP thật bằng `set_real_ip_from <dải IP Cloudflare>` cùng `real_ip_header CF-Connecting-IP`. Request gửi thẳng tới `127.0.0.1:3200` không có X-Real-IP nên các route có rate limit từ chối; thử qua domain.

### systemd system unit

Site chạy dưới unit hệ thống [`ops/happy-wedding.service`](../ops/happy-wedding.service), cài vào `/etc/systemd/system/`, chạy với user `ccgram`. Không dùng user unit nữa vì máy chỉ có 5,9 GB RAM, swap gần đầy, và systemd-oomd theo dõi cây `user@1001.service` (áp lực bộ nhớ 50% trong 20 giây): server nằm trong cây đó có thể bị giết cùng phiên của user. Chỉ unit hệ thống mới:

- đặt được `OOMScoreAdjust=-900` (user manager không được đặt số âm): kernel OOM killer chọn gần như mọi tiến trình khác trước server. Không đặt -1000 để server rò bộ nhớ vẫn bị giết được.
- nằm ngoài cây `user@1001.service`, nên oomd không giết server vì áp lực bộ nhớ của phiên user.
- có `ManagedOOMPreference=avoid` có hiệu lực (oomd bỏ qua thiết lập này trên cgroup không thuộc root). Hiện oomd không theo dõi `system.slice`; dòng này phòng cho cấu hình sau này.

Các thiết lập khác trong unit:

- `Restart=always`, `RestartSec=2`: chạy lại cả sau khi kernel OOM-kill server. `TimeoutStopSec=20`.
- `MemoryLow=256M`: kernel tránh thu hồi 256 MB bộ nhớ nền của server khi máy thiếu RAM. Mức này chỉ có hiệu lực khi `system.slice` cũng được bảo vệ, nên cài kèm [`ops/system.slice-memory-low.conf`](../ops/system.slice-memory-low.conf) (cũng 256M).
- Không có `MemoryMax=`: đỉnh upload xấu nhất khoảng 1,6 GB cho 2 slot mã hóa cộng tối đa 400 MB body (mục Backup & ảnh), cộng mức nền của Node; giới hạn dưới khoảng 2,5G thì kernel giết server giữa lúc upload. Không thêm `--max-old-space-size`: bộ nhớ sharp/libvips nằm ngoài heap V8. Script deploy tự giới hạn heap của `next build` (1536 MB) và chỉ build khi `free -m` báo available ≥ 1800 MB.
- Đường dẫn tuyệt đối: trong unit hệ thống `%h` là home của root. Không có secret trong unit: Next tự đọc `.env.production.local` và `.env` từ WorkingDirectory.
- Log vào journal. Server chạy với user `ccgram`, nên journald ghi output vào tệp journal của ccgram: đọc không cần sudo bằng `journalctl -u happy-wedding.service -n 100` (không có `--user`), và journald tự xoay vòng, không cần logrotate. Dòng của chính systemd về unit (dừng, exit code, OOM kill) nằm trong journal hệ thống: `sudo journalctl -u happy-wedding.service`, hoặc không cần sudo `systemctl show -p Result,NRestarts,ExecMainStatus happy-wedding.service`. Lỗi trả cho khách chỉ có correlationId; chi tiết nằm trong log.
- Unit hệ thống tự chạy khi máy khởi động (`WantedBy=multi-user.target`), không cần linger.

**Cài một lần** (cần sudo; chạy từ checkout chính, sau `git pull` có thư mục `ops/`):

```bash
cd ~/happy_wedding
sudo install -m 644 -o root -g root ops/happy-wedding.service /etc/systemd/system/happy-wedding.service
sudo install -d -m 755 -o root -g root /etc/systemd/system/system.slice.d
sudo install -m 644 -o root -g root ops/system.slice-memory-low.conf /etc/systemd/system/system.slice.d/50-happy-wedding-memory-low.conf
sudo visudo -cf ops/sudoers-happy-wedding && sudo install -m 440 -o root -g root ops/sudoers-happy-wedding /etc/sudoers.d/happy-wedding
sudo visudo -c
sudo systemctl daemon-reload
sudo systemctl enable happy-wedding.service   # không --now: script deploy khởi động nó
```

- `visudo -cf` kiểm cú pháp **trước** khi cài: một tệp lỗi trong `/etc/sudoers.d` làm sudo từ chối mọi lệnh. `visudo -c` kiểm lại toàn bộ cấu hình đã cài. Tên tệp trong `sudoers.d` không được có dấu chấm.
- Tệp sudoers chỉ cho `ccgram` chạy đúng `systemctl start|stop|restart happy-wedding.service` không cần mật khẩu; mọi lệnh khác vẫn hỏi mật khẩu. Thử: `sudo -n -l systemctl restart happy-wedding.service` phải in `/usr/bin/systemctl restart happy-wedding.service`.
- Unit hệ thống và user unit cũ cùng nghe port 3200: không bao giờ để cả hai cùng chạy hay cùng enable. Từ lệnh `enable` ở trên tới lần deploy chuyển đổi (mục "Lần chuyển đầu tiên") cả hai đều enable: chạy deploy ngay, đừng khởi động lại máy giữa chừng.
- Đổi phiên bản Node (nvm): sửa đường dẫn node ở ExecStart và PATH trong `ops/happy-wedding.service`, cài lại bằng lệnh `install` đầu tiên, `sudo systemctl daemon-reload`, rồi `sudo -n systemctl restart happy-wedding.service`. Unit giả định checkout ở `/home/ccgram/happy_wedding` và user `ccgram`; máy khác thì sửa unit và sudoers trước khi cài.
- Script deploy dùng unit hệ thống khi có `/etc/systemd/system/happy-wedding.service`; nếu không thì dùng user unit cùng tên (`~/.config/systemd/user/`, không có bảo vệ OOM, chỉ tự chạy khi máy khởi động nếu bật linger). `DEPLOY_UNIT_SCOPE=system` hoặc `user` ép một trong hai.

**Kiểm tra** (sau lần deploy đầu với unit hệ thống, và khi nghi ngờ):

```bash
systemctl show -p User,ActiveState,OOMScoreAdjust,ManagedOOMPreference,MemoryLow happy-wedding.service
cat /proc/$(systemctl show -p MainPID --value happy-wedding.service)/oom_score_adj   # -900
cat /sys/fs/cgroup/system.slice/memory.low /sys/fs/cgroup/system.slice/happy-wedding.service/memory.low   # 268435456 cả hai
systemctl --user is-enabled happy-wedding.service; systemctl --user is-active happy-wedding.service   # disabled, inactive
journalctl -u happy-wedding.service -n 50
```

### nginx

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;                         # nginx < 1.25.1: "listen 443 ssl http2;"
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Ảnh tới 40 MB (ADR 0008) cộng phần bọc multipart; MP3 tới 15 MB (ADR 0010).
    client_max_body_size 45m;

    # Áp dụng cho mọi location bên dưới. Không còn header Upgrade/Connection
    # cho WebSocket: next start không có HMR.
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Ghi đè, không nối: app tin X-Real-IP (TRUSTED_CLIENT_IP_HEADER=x-real-ip).
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;

    location = / {
        return 302 /w/<slug>;
    }

    # JS/CSS của build, tên có hash. Next đã gửi
    # "Cache-Control: public, max-age=31536000, immutable"; nginx giữ nguyên
    # header đó (không add_header, để 404 của chunk cũ sau deploy không bị cache).
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3200;
        proxy_buffering on;
    }

    # Trang, API, /_next/image và /uploads/weddings/* (ảnh, MP3: Next phục vụ,
    # ADR 0011; không dùng alias).
    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

So với cấu hình chạy `next dev`: bỏ hai header WebSocket, thêm `location /_next/static/`, đưa các `proxy_set_header` lên mức server; phần còn lại giữ nguyên. Giữ các dòng `listen`/`ssl_*` mà certbot đang quản lý thay vì chép ví dụ. Áp dụng: `sudo nginx -t && sudo systemctl reload nginx`.

### Lần chuyển đầu tiên từ `next dev`

Trước lần chuyển, site chạy `next dev` dưới user unit cùng tên. Lần chuyển đi thẳng sang unit hệ thống:

1. Kiểm tra tài nguyên: `df -h .` (script cần ≥ 400 MB trống, upload cũng cần chỗ) và `free -m` (available ≥ 1800 MB trong lúc dev server vẫn chạy).
2. Tạo `.env.production.local` (`chmod 600`) với các biến ở bảng trên, gồm `RATE_LIMIT_STORE=memory` (site không dùng Redis), rồi chạy lệnh kiểm tra ở mục Cấu hình tới khi nó in `DATABASE_URL=...`.
3. Chạy thử: `scripts/deploy-prod.sh --build-only`. Nó kiểm tra cấu hình, migration, Prisma client và dependency, build vào `.next-staging` rồi khởi động thử trên `127.0.0.1:3290`; server thật không bị đụng tới.
4. Chạy các lệnh "Cài một lần" ở mục systemd system unit, tới `enable` (không `--now`). Dev server vẫn chạy. Làm bước 5 ngay sau đó.
5. `scripts/deploy-prod.sh`. Script nhận ra unit hệ thống, kiểm tra `sudo -n` trước khi build, rồi trong lúc đổi: chép tệp user unit cũ vào `~/happy_wedding-backups/happy-wedding.service.user.<thời điểm>`, dừng và disable user unit (dev server), kiểm port 3200 đã trống, khởi động unit hệ thống. Tệp user unit vẫn ở chỗ cũ, ở trạng thái disabled. Cache ảnh đã tối ưu được chuyển sang bundle mới. Script in `OOM score adjustment of PID …: -900`.
6. Chạy các lệnh "Kiểm tra" ở mục systemd system unit, rồi kiểm tra qua domain: trang thiệp đã xuất bản, đăng nhập khách và admin, tải một ảnh rồi mở nó.
7. Đổi nginx theo mục trên, `sudo nginx -t && sudo systemctl reload nginx`. Có thể đóng port 3200 trên firewall: app không còn nghe ở địa chỉ public.

**`.next-prev` sau lần đầu:** lần deploy đầu đổi tên `.next` của `next dev` (khoảng 1 GB, không phải bundle production) thành `.next-prev`. Nó chỉ dùng để quay về `next dev` (mục Rollback). Khi bản mới đã kiểm xong ở bước 6 và 7, xóa nó bằng `rm -rf .next-prev` để lấy lại chỗ trên đĩa; nếu không, lần deploy sau cũng xóa nó trước khi build.

### Deploy thường lệ

```bash
cd ~/happy_wedding
git pull                          # hoặc merge nhánh đã duyệt
scripts/deploy-prod.sh            # kiểm tra → build → (migrate) → đổi bundle
scripts/deploy-prod.sh --build-only   # chỉ kiểm tra và build, không đổi gì
```

Thứ tự trong script, dừng ngay ở bước đầu tiên lỗi:

1. **Kiểm tra** (chưa đổi gì): công cụ cần thiết, khóa chống chạy hai deploy, không có `next build` nào khác, RAM, unit chạy `next start` với `NODE_ENV=production` từ đúng checkout; với unit hệ thống thêm: systemd đã nạp unit, unit chạy với user hiện tại, `sudo -n` được phép `systemctl stop`/`start` unit, và user unit cùng tên còn chạy hay còn enable thì được ghi nhận để dừng lúc đổi; với user unit: không có unit hệ thống cùng tên đang chạy hay enable; cấu hình production hợp lệ, `prisma migrate status`, Prisma client đã sinh khớp `prisma/schema.prisma`, `node_modules` khớp dependency trực tiếp trong `pnpm-lock.yaml`.
2. **Build** vào `.next-staging` với `NEXT_DIST_DIR`, trong khi server vẫn phục vụ từ `.next` (khoảng 30 giây và 1,2 GB RAM trên máy hiện tại; bundle khoảng 30 MB). `tsconfig.json` và `next-env.d.ts` mà Next sửa lúc build được trả lại.
3. **Khởi động thử** bundle mới trên `127.0.0.1:3290` (`DEPLOY_CHECK_PORT`), chờ `/robots.txt` trả 200. Server chỉ lên được khi cấu hình production hợp lệ.
4. **Đổi** (bắt đầu downtime): dừng unit (unit hệ thống qua `sudo -n systemctl`); lần chuyển đầu thì chép tệp user unit cũ vào thư mục backup rồi dừng và disable nó; kiểm port 3200 đã trống; nếu có migration thì sao lưu DB (`scripts/backup.py --db-only` vào `~/happy_wedding-backups`) rồi `pnpm db:migrate`, lỗi thì chạy lại bundle cũ; đổi tên `.next` → `.next-prev`, `.next-staging` → `.next`; giữ cache ảnh; khởi động unit và chờ 200. Script in số giây downtime và BUILD_ID.

Script không chạy `pnpm install` hay `prisma generate`. Cài đặt khác qua environment: `DEPLOY_SERVICE`, `DEPLOY_UNIT_SCOPE` (`auto`, `system` hoặc `user`), `DEPLOY_PORT`, `DEPLOY_CHECK_PORT`, `DEPLOY_BACKUP_DIR`, `DEPLOY_MIN_MEMORY_MB`, `DEPLOY_MIN_DISK_MB` (mặc định ở đầu script). Request đang chạy lúc dừng (ví dụ upload đang mã hóa) bị cắt, nên deploy lúc ít khách.

### Schema change

Khi `prisma/schema.prisma` đổi, hoặc dependency trực tiếp trong `pnpm-lock.yaml` đổi, script dừng ở bước kiểm tra. Prisma client và `node_modules` dùng chung với server đang chạy, nên chỉ được sinh lại khi server đã dừng và DB đã migrate. Script chỉ so dependency trực tiếp (mục `importers`); bản cập nhật chỉ đổi phụ thuộc gián tiếp thì tự làm theo mục này. Downtime bằng thời gian install/generate cộng build:

```bash
cd ~/happy_wedding
sudo -n systemctl stop happy-wedding.service
python3 scripts/backup.py --db-only ~/happy_wedding-backups
pnpm db:migrate
pnpm install --frozen-lockfile    # chỉ khi pnpm-lock.yaml đổi
pnpm exec prisma generate
scripts/deploy-prod.sh            # build rồi khởi động lại unit
```

Không chạy `prisma generate` trước `pnpm db:migrate`: nếu server khởi động lại giữa hai bước, nó nạp client mới trên DB cũ.

### Rollback

Bundle trước nằm trong `.next-prev` cho tới lần deploy sau.

```bash
cd ~/happy_wedding
sudo -n systemctl stop happy-wedding.service
mv .next .next-failed && mv .next-prev .next
sudo -n systemctl start happy-wedding.service
```

- Nếu lần deploy đó đã migrate: trước khi start, chép bản backup mà script in ra đè lên tệp DB của DATABASE_URL (mặc định `prisma/dev.db`) và xóa `dev.db-wal`, `dev.db-shm` cạnh nó. Mọi ghi từ lúc deploy tới lúc rollback sẽ mất.
- Nếu lỗi nằm ở `next.config.ts` (`next start` đọc lại tệp này), `git checkout` về commit trước rồi mới start.
- Quay về user unit (`next dev`) sau lần chuyển đầu, khi `.next-prev` vẫn là `.next` của dev:

  ```bash
  cd ~/happy_wedding
  sudo -n systemctl stop happy-wedding.service
  sudo systemctl disable happy-wedding.service   # hỏi mật khẩu: sudoers chỉ mở start/stop/restart
  mv .next .next-failed && mv .next-prev .next
  systemctl --user enable --now happy-wedding.service
  ```

  Tệp user unit vẫn ở `~/.config/systemd/user/`; nếu đã bị sửa, chép lại bản `happy-wedding.service.user.<thời điểm>` trong `~/happy_wedding-backups` rồi `systemctl --user daemon-reload` trước lệnh cuối. Khi `/etc/systemd/system/happy-wedding.service` còn đó, script deploy vẫn chọn unit hệ thống: ở lại user unit thì chạy deploy với `DEPLOY_UNIT_SCOPE=user`, hoặc gỡ hẳn unit hệ thống: `sudo rm /etc/systemd/system/happy-wedding.service /etc/systemd/system/system.slice.d/50-happy-wedding-memory-low.conf /etc/sudoers.d/happy-wedding && sudo systemctl daemon-reload`.

- Xóa `.next-failed` khi đã xem xong.

### Khác biệt sau khi bỏ `next dev`

- Cookie phiên khách và admin có cờ `Secure`, nên trình duyệt không lưu chúng qua `http://<IP>:3200`: đăng nhập qua HTTP không còn chạy (và app chỉ nghe `127.0.0.1`). Dùng domain HTTPS; kiểm tra Origin chỉ nhận `CANONICAL_ORIGIN` hoặc `NEXT_PUBLIC_APP_URL`.
- CSP không còn `unsafe-eval`, trang lỗi không có overlay/stack trace, không có HMR.
- Ảnh và MP3 tải lên sau khi khởi động được route `src/app/uploads/weddings/[file]/route.ts` phục vụ, kể cả qua `/_next/image` ([ADR 0011](adr/0011-runtime-uploads-under-next-start.md)). Gỡ hẳn một ảnh: xóa tệp trong `public/uploads/weddings/` và xóa `.next/cache/images`.
- Thử tính năng mới bằng worktree riêng với port khác, không chạy `pnpm dev` trong checkout chính.

### Lần đầu dựng một server mới

Sau các bước trên: `pnpm db:migrate`, `pnpm db:seed` (không ghi đè catalog đã sửa), cho thư mục `public/uploads` quyền ghi và đưa vào backup, rồi kiểm tra đăng ký → mua gói → tiền sandbox → xuất bản → RSVP → CSV qua domain HTTPS.

### `next dev` (chỉ để thử)

`pnpm dev` lắng nghe `0.0.0.0:3200` và `allowedDevOrigins` gồm IP công khai để xem thử từ xa. Dev server không phải môi trường an toàn: có overlay lỗi kèm stack trace, `unsafe-eval`, và không có Redis/secret production. Chỉ dùng với dữ liệu thử, chặn port của nó bằng firewall khi không xem thử.

Xem thiệp dev qua domain khác (ví dụ nginx HTTPS chuyển tới port dev): Next chặn request cross-origin tới tài nguyên dev (`/_next/*`, HMR) từ hostname không có trong `allowedDevOrigins`, nên trang qua domain đó sẽ hỏng. Thêm hostname vào `.env` bằng ALLOWED_DEV_ORIGINS, cách nhau bằng dấu phẩy, không scheme, không port, ví dụ `ALLOWED_DEV_ORIGINS="thiep.example.com"` (nhận ký tự đại diện như `*.example.com`). Danh sách này cộng thêm vào `127.0.0.1` và IP công khai; mục có scheme/port/đường dẫn làm `next dev` dừng khi nạp config. Đặt luôn NEXT_PUBLIC_APP_URL là `https://` của domain đó để link chia sẻ, canonical và OpenGraph dùng domain; CANONICAL_ORIGIN có thể giữ origin IP, vì kiểm tra origin (`src/server/http/origin.ts`) tin cả hai. Khởi động lại dev server sau khi đổi `.env`. nginx trước `next dev` cần thêm header `Upgrade`/`Connection "upgrade"` cho HMR.

## Backup & ảnh

`python3 scripts/backup.py <thư-mục-backup>` tạo SQLite snapshot bằng backup API (an toàn với WAL), sau đó lưu ảnh upload trong tar. `--db-only` bỏ phần ảnh, dùng ngay trước migration (`scripts/deploy-prod.sh` tự gọi khi có migration). Mặc định đọc DATABASE_URL từ `.env`; có thể đưa DATABASE_URL qua environment. Chạy cùng quyền tài khoản vận hành, backup chứa dữ liệu cá nhân nên không phục vụ qua web. Để có snapshot DB/ảnh đồng nhất hoàn toàn, tạm dừng ghi lúc backup.

Ảnh upload giữ nguyên độ phân giải, được chuyển WebP chất lượng 90, giới hạn 40 MB input/64 megapixel/cạnh 16.383 px, bỏ metadata và tên tệp gốc ([ADR 0008](adr/0008-full-resolution-uploads.md)). Reverse proxy phải cho body tới 40 MB trên `/api/wedding/upload` (nginx mặc định `client_max_body_size 1m`) và chờ đủ lâu (nên ≥ 90 giây: request có thể xếp hàng tới 60 giây rồi mới mã hóa). Số đo là **JPEG 8-bit** 5464×8192: khoảng 6 giây và 350 MB RAM trên máy thử, 470 MB nếu phải xoay theo EXIF; file lưu khoảng 15–19 MB. RAM đi theo khung ảnh thô chứ không theo dung lượng tệp. Vì vậy route đọc header và từ chối trước khi decode mọi ảnh có khung ước lượng vượt 200 MiB, trả 400 “Ảnh quá lớn để xử lý, vui lòng dùng ảnh JPEG 8-bit” (`MAX_UPLOAD_DECODE_BYTES`). Khung = rộng × cao × kênh × 1 hoặc 2 byte; ảnh có alpha luôn tính 8 byte/điểm ảnh. Nhờ ngân sách này, JPEG RGB 8-bit vẫn được nhận tới 64 megapixel, còn ảnh có alpha chỉ tới khoảng 26 megapixel. Trường hợp xấu nhất còn được nhận là PNG RGBA 16-bit khoảng 26 megapixel: đo được khoảng **780 MiB cho một ảnh** (27 MB/megapixel cộng khoảng 70 MB nền). Trước khi có ngân sách, con số này là 1,8 GB. Mỗi tiến trình chỉ mã hóa 2 ảnh cùng lúc, ảnh khác chờ (tối đa 10 ảnh, 60 giây); hàng đầy thì trả 503 và ghi log `wedding_upload_busy`. Khách đóng kết nối khi đang chờ thì request rời hàng ngay; hủy sau khi đã được cấp slot hoặc trong lúc mã hóa thì ảnh không được lưu và không trừ quota (route trả 499, khách không nhận). Khách ngắt giữa lúc gửi body cũng trả 499, không ghi `wedding_upload_error`; lỗi DB hay ghi file (ví dụ ENOSPC) vẫn trả 500 và ghi log đó dù khách vừa hủy. Next chỉ biết khách đã hủy khi kết nối tới Node đóng, nên sau reverse proxy cần proxy đóng kết nối upstream khi client hủy (nginx mặc định `proxy_ignore_client_abort off`). Ảnh qua kiểm tra header nhưng mã hóa lỗi trả 400 “Tệp ảnh không hợp lệ hoặc quá lớn” và ghi log warn `wedding_upload_encode_failed` (correlationId, format, width, height, bytes, errorClass, errorCode, errorMessage ≤200 ký tự; không có nội dung ảnh hay tên tệp); xuất hiện thường xuyên với ảnh hợp lệ thì kiểm tra phiên bản sharp/libvips. Đỉnh xấu nhất là khoảng **1,6 GB** cho 2 slot, cộng tối đa 400 MB body đang chờ. Nên để dư khoảng 2 GB RAM cho tiến trình Node ngoài mức nền, hoặc hạ ngân sách/số slot. URL ảnh là công khai; không tải tài liệu riêng. Bảng `WeddingUpload` ghi mọi file đã lưu và giới hạn 120 ảnh/thiệp, 150 ảnh/account/24 giờ, nên dung lượng đĩa mỗi tài khoản có trần (với ảnh gốc, tới khoảng 2,3 GB/thiệp ở mức 19 MB/ảnh); file trước migration `20261022000000_wedding_upload_quota` không có bản ghi. Không có cơ chế xóa dữ liệu tự động hoặc cleanup file mồ côi trong bản này; cần vận hành retention và khả năng xóa trước khi tăng quy mô.

Phục hồi: dừng app, khôi phục DB vào đúng DATABASE_URL và ảnh vào `public/uploads/weddings`, kiểm tra quyền đọc/ghi, chạy app và kiểm tra một thiệp đã xuất bản.

## Test isolation

Vitest chỉ ghi `prisma/prisma/test.db`. E2E chỉ reset `prisma/e2e.db`, không sử dụng dev.db. E2E server port 3201, build cache `.next-e2e`, thông tin admin test chỉ áp dụng cho server test. Không bật các biến môi trường test trên server thật.

## Các giới hạn đã biết

Không có OTP/xác minh số điện thoại hoặc quên mật khẩu tự phục vụ. Không có gửi SMS/email/Zalo, tên miền riêng mỗi thiệp, video, trình kéo-thả, object storage, hoàn tiền tự động hoặc analytics lượt truy cập. Khách tự gửi link; QR mừng cưới/QR dịch vụ dựa trên VietQR ngoài hệ thống. Chính sách hiện là bản dự thảo. Các dữ liệu của anh trai chưa được cung cấp.
