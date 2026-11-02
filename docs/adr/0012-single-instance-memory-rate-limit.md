# ADR 0012 — Rate limit trong tiến trình cho một instance (`RATE_LIMIT_STORE=memory`)

Date: 2026-11-02. Status: Accepted / implemented. Sửa điểm "production cần Redis" của [ADR 0001](0001-clone-and-single-node-runtime.md); mọi điểm khác của ADR 0001 giữ nguyên.

## Context

Site chạy đúng một tiến trình `next start` trên một máy, với SQLite và ảnh local (ADR 0001 đã cấm nhiều instance cùng SQLite). Chủ dự án quyết định production **không dùng Docker và không dùng Redis**. Trước đây `src/config/env.ts` bắt buộc `UPSTASH_REDIS_REST_URL`/`TOKEN` ở production, nên thiếu Redis là site không khởi động.

Mã đã có một store trong bộ nhớ, nhưng chỉ cho dev/test và không có giới hạn: map chỉ xóa khóa khi chính khóa đó được dùng lại. Mỗi IP mới tạo khóa mới, và với IPv6 một máy có thể dùng vô số địa chỉ trong dải /64 của nó. Ví dụ `/api/csp-report` không cần đăng nhập, có bucket theo IP (60 giây) và theo phiên/IP (1 giờ). Map như vậy tăng mãi, trong khi mục tiêu chính của lượt này là tiến trình site không bị OOM-kill.

## Decision

1. **Biến `RATE_LIMIT_STORE`** nhận `upstash` hoặc `memory`, **không có mặc định**. Ở production, khi thiếu biến hoặc giá trị là `upstash`, vẫn bắt buộc `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` như cũ. Chỉ khi đặt rõ `memory` thì không cần Upstash. Các kiểm tra production khác (RATE_LIMIT_KEY_SECRET, proxy, origin, URL công khai, hash admin) giữ nguyên. Giá trị rỗng hoặc giá trị lạ làm server dừng lúc khởi động.
2. **Placeholder lúc build không bật `memory`.** Dummy của `next build` không đặt `RATE_LIMIT_STORE` và chỉ tồn tại trong lần parse lúc build. `next start` parse lại môi trường thật, nên bundle build không có Upstash vẫn từ chối chạy cho tới khi operator tự chọn `memory`.
3. **Chọn store** (`resolveDefaultStore` trong `src/server/security/rate-limit.ts`). Dev/test luôn dùng store trong tiến trình. Production dùng nó khi `RATE_LIMIT_STORE=memory` (kể cả khi có biến Upstash), dùng Upstash khi có URL/TOKEN, còn lại thì không có store: policy failClosed từ chối, như trước. Mỗi tiến trình có một `MemoryRateLimitStore` duy nhất. Khóa vẫn qua `deriveRateLimitKey` (HMAC-SHA256 với RATE_LIMIT_KEY_SECRET), nên bộ nhớ và log không có IP hay số điện thoại thô.
4. **Store có giới hạn:**
   - Đếm theo cửa sổ cố định, giống script Lua của Upstash: lần đầu đặt hạn `windowSeconds`, các lần sau tăng đếm, hết hạn thì đếm lại từ 1.
   - Khi có truy cập, khóa đã hết hạn được quét bỏ, tối đa mỗi 60 giây. Một lần quét đi qua toàn map, tối đa 50.000 khóa, cỡ mili giây.
   - Trần **50.000 khóa** (`MEMORY_STORE_MAX_KEYS`). Một khóa HMAC kèm bộ đếm chiếm khoảng 240 byte heap, nên store đầy khoảng 12 MB. Lưu lượng bình thường của một site thiệp cưới chỉ cỡ vài nghìn khóa.
   - **Khi đầy:** store quét lại (tối đa mỗi giây một lần). Nếu vẫn đầy thì từ chối **khóa mới** bằng `RateLimitStoreFullError`; khóa đang có vẫn đếm tiếp, và khóa hết hạn vẫn được dùng lại chỗ cũ. Limiter coi lỗi này là "limiter unavailable". Với policy failClosed (đăng nhập khách, đăng nhập admin, RSVP, upload và `csp-report` qua `mutationLimit`), client mới nhận 503. Policy fail-open thì cho qua. Không bộ đếm nào bị xóa trước khi hết cửa sổ, nên không thể làm đầy store để tự xóa bộ đếm của mình.
   - Trong lúc đầy, log warn `rate_limit_memory_store_full` (`keys`, `maxKeys`) tối đa mỗi phút một lần.
5. **Log một lần** mỗi tiến trình, qua logger của ứng dụng (không dùng console): info `rate_limit_store_in_process` với `store: "memory"`, `validFor: "a single instance only"`, `maxKeys`. Log ghi lúc limiter được dùng lần đầu, không ghi lúc import `env.ts`, vì `scripts/check-prod-env.ts` cũng import `env.ts` và stdout của nó chỉ được có một dòng `DATABASE_URL=`. Script đó in một dòng nhắc ra stderr khi chọn `memory`.

## Alternatives

- **Redis/Valkey tự chạy trên máy:** thêm một dịch vụ cần RAM và vận hành trên máy đã thiếu bộ nhớ. Chủ dự án đã loại.
- **Upstash (dịch vụ ngoài):** thêm phụ thuộc tài khoản và mạng bên ngoài, mỗi lần kiểm tra thêm một round-trip. Chủ dự án không dùng. Mã vẫn hỗ trợ, nên có thể quay lại bằng cấu hình.
- **Dùng memory làm mặc định khi thiếu Upstash:** một cấu hình thiếu sẽ thành giới hạn yếu mà không ai biết, nhất là khi sau này có hai instance. Như vậy là trái nguyên tắc fail closed. Vì thế `memory` phải được đặt rõ.
- **Đầy thì xóa khóa cũ nhất (LRU):** client mới không bị chặn, nhưng kẻ tấn công có dải IPv6 có thể lấp store để đẩy bộ đếm dùng chung ra ngoài và đặt lại nó. Ví dụ `global-attempts` của đăng nhập admin (30 lần mỗi 15 phút) sẽ thành không giới hạn nếu cứ vài chục nghìn request lại lấp store một lần. Từ chối khóa mới thì không bao giờ đếm thiếu. Cái giá là từ chối dịch vụ cho client mới, nêu ở Consequences.
- **SQLite làm store:** bền qua restart, nhưng mỗi request rate-limit thêm một lần ghi vào writer duy nhất, dùng chung pool một kết nối với nghiệp vụ.
- **Chỉ dùng `limit_req` của nginx:** hợp để chặn flood, nhưng không thay được giới hạn theo số điện thoại hay phiên mà app tính sau khi đọc body.

## Consequences

- Bộ đếm mất khi tiến trình khởi động lại (deploy, restart, OOM). Sau mỗi lần như vậy mọi client có lại đủ hạn mức. Chấp nhận được với vài lần deploy; site chạy dưới unit systemd có bảo vệ OOM (OPERATIONS, "Production") để restart hiếm.
- Chỉ đúng với **một** tiến trình. Hai instance (hay cluster mode) thì mỗi instance cho đủ hạn mức. Đang dùng `memory` thì không chạy thêm instance; muốn chạy nhiều instance thì chuyển sang Upstash.
- Nếu có flood từ rất nhiều client khác nhau (50.000 khóa còn hạn), **client mới** nhận 503 ở route failClosed cho tới khi khóa hết hạn (60 giây tới 1 giờ tùy bucket); client đã có khóa không bị ảnh hưởng. Đây là đánh đổi đã chọn để không bao giờ cho vượt giới hạn, và log `rate_limit_memory_store_full` báo khi nó xảy ra. Bộ nhớ của store tối đa khoảng 12 MB.
- Dev và test dùng cùng lớp store nên cũng có trần.

## Evidence

- `tests/server/security/rate-limit-memory-store.test.ts` (9 test): đếm và hết hạn cửa sổ, quét khóa hết hạn tối đa mỗi phút, trần mặc định 50.000; khi đầy thì khóa mới bị từ chối còn khóa cũ đếm tiếp; báo đầy tối đa mỗi phút; khóa hết hạn được dùng lại chỗ, có chỗ trống lại sau khi quét; với store đầy, policy failClosed trả `limiter_unavailable` cho client mới, client vượt hạn mức vẫn bị `rate_limited`, policy fail-open cho qua.
- `tests/server/security/rate-limit-store-selection.test.ts` (6 test, `NODE_ENV=production`): `memory` dùng một store chung cho mọi limiter và không tạo client Redis, kể cả khi có biến Upstash; log `rate_limit_store_in_process` đúng một lần qua logger, không qua `console.info`; khóa trong store là HMAC, không chứa IP; reset được; thiếu biến hoặc `upstash` thì dùng Upstash; không có store nào thì failClosed từ chối.
- `tests/server/security/rate-limit-store-env.test.ts` (9 test): production vẫn bắt buộc Upstash khi thiếu `RATE_LIMIT_STORE` hoặc khi là `upstash`; chỉ `memory` mới bỏ được Upstash; RATE_LIMIT_KEY_SECRET vẫn bắt buộc; giá trị rỗng hoặc lạ bị từ chối; không có mặc định; build không có Upstash vẫn qua nhưng `RATE_LIMIT_STORE` không được đặt, và cùng cấu hình đó bị từ chối lúc chạy cho tới khi đặt `memory`.
- `NODE_ENV=production node --import tsx scripts/check-prod-env.ts` với cấu hình giả: có `RATE_LIMIT_STORE=memory` và không có `UPSTASH_*` thì in `DATABASE_URL=...`, thoát 0. Không có cả hai, hoặc `RATE_LIMIT_STORE=upstash` mà thiếu biến, thì liệt kê `UPSTASH_REDIS_REST_URL`/`TOKEN` và thoát 1.
- Đo ngày 2026-11-02 (`node --expose-gc`, Node 22): 100.000 khóa dạng `rl:v1:<policy>:<bucket>:<dimension>:<32 hex>` kèm `{ count, expiresAt }` chiếm 22,6 MB heap, khoảng 237 byte mỗi khóa.

## Revisit when

Chạy nhiều instance hoặc nhiều máy: bỏ `RATE_LIMIT_STORE` (hoặc đặt `upstash`) và cấu hình Upstash. Thấy `rate_limit_memory_store_full` trong log: thêm `limit_req` ở nginx hoặc chuyển sang Upstash. Site phải restart thường xuyên.
