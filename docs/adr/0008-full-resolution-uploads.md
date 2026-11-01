# ADR 0008 — Ảnh upload giữ độ phân giải gốc

Date: 2026-11-01. Status: Accepted / implemented.

## Context

Ảnh cưới của khách (thiệp `/w/vu-tu-nguyen-ngoc`) là JPEG dọc tới 5464×8192 (44,8 megapixel), 5–30 MB mỗi ảnh. Khách yêu cầu rõ không thu nhỏ ảnh. Pipeline cũ của `POST /api/wedding/upload` không nhận được các ảnh này:

- stream bị cắt ở 5 MiB (413 “Ảnh tối đa 5 MB”);
- Sharp `limitInputPixels: 40_000_000` từ chối 44,8 megapixel (400);
- ảnh lọt qua thì bị `resize({ width: 1600 })` rồi mã hóa WebP quality 85.

`/uploads/weddings/` là thư mục công khai, không cần đăng nhập. Ảnh điện thoại/máy ảnh thường có GPS, model máy, thời gian chụp trong EXIF/XMP. `imageSchema` trong `src/lib/wedding.ts` chỉ nhận `/uploads/weddings/<uuid>.webp`.

## Decision

1. **40 MiB/ảnh** (`MAX_UPLOAD_IMAGE_BYTES` trong `src/lib/wedding-upload.ts`), dùng chung cho route và kiểm tra trước ở editor; lỗi “Ảnh tối đa 40 MB”. Route vẫn đọc body theo stream, đếm byte và hủy reader ngay khi vượt, không buffer không giới hạn. Body là raw bytes, không multipart, nên không cộng phần dư.
2. **Không resize.** Chỉ `rotate()` theo EXIF orientation, sau đó giữ nguyên số điểm ảnh.
3. **Vẫn mã hóa lại sang WebP**, quality 90, effort 2, không lossless. Khi không gọi `keepMetadata`/`withMetadata`, Sharp bỏ toàn bộ metadata (EXIF, GPS, XMP) và chuyển màu theo ICC về sRGB; quy tắc đường dẫn `.webp` giữ nguyên.
4. **`limitInputPixels: 64_000_000`.** Ảnh có cạnh dài hơn 16.383 px (giới hạn của WebP) bị từ chối trước khi decode với lỗi “Ảnh có cạnh dài hơn 16.383 px. Vui lòng chọn ảnh nhỏ hơn”. Tệp hỏng và ảnh trên 64 megapixel giữ lỗi cũ “Tệp ảnh không hợp lệ hoặc quá lớn”.
5. **effort 2 thay vì mặc định 4.** Đo trên ảnh 5464×8192 tạo bằng nhiễu (27,6 MiB): effort 4 tốn 33 giây và 725 MB RSS; effort 2 tốn 6 giây và 338 MB, cùng kích thước output (18,9 MiB) và cùng PSNR (36,62 so với 36,63 dB trên vùng cắt 1024×1024). Effort 3 giống effort 4.

## Alternatives

- **Lưu nguyên byte gốc:** lộ GPS và thông tin máy qua URL công khai, phải đổi quy tắc `.webp`, và muốn bỏ metadata mà không mã hóa lại thì phải viết thêm bộ lọc segment JPEG/PNG/WebP. Không chọn.
- **WebP lossless:** file lớn hơn nhiều lần ảnh gốc. Không chọn.
- **Giữ 1600 px:** trái yêu cầu của khách.
- **`sharp.concurrency(1)`:** trên Linux glibc không jemalloc, Sharp đã mặc định 1 thread; đặt 6 thread chỉ đổi RSS từ 338 lên 349 MB. Đây là cấu hình toàn tiến trình (ảnh hưởng cả `next/image`), nên không đặt.

## Consequences

- Vẫn là một lần nén lossy (q90), không giống từng byte với file gốc; kích thước điểm ảnh giữ nguyên.
- Ảnh cũ đã lưu ở 1600 px không thay đổi; muốn bản đầy đủ thì tải lại.
- Đĩa: 15–19 MiB/ảnh với ảnh thử dạng nhiễu (ảnh thật thường mượt hơn nên nhỏ hơn). Quota 120 ảnh/thiệp nghĩa là tới khoảng 2,3 GB/thiệp trong trường hợp xấu.
- Mỗi upload 44,8 megapixel tốn khoảng 6 giây CPU và 340–350 MB RAM trên máy thử. Editor tải từng ảnh một, nhưng nhiều tài khoản tải cùng lúc thì RAM cộng dồn. Reverse proxy phải cho body 40 MB và timeout đủ dài.
- Hiển thị không đổi: thiệp công khai và preview dùng `next/image` với optimizer mặc định, trình duyệt nhận bản WebP thu nhỏ theo `sizes`. Đo bằng `optimizeImage` của Next trên output 19 MiB: rộng 828 mất 2,2 giây, 1080 mất 2,4 giây, 1920 mất 3,0 giây, 3840 mất 6,0 giây; timeout mặc định là 7 giây. Khi tối ưu lỗi hoặc quá giờ, Next trả **file gốc** (khoảng 19 MB) thay cho bản thu nhỏ. Bước này không đổi cấu hình hiển thị.

## Evidence

Xem mục “Ảnh upload giữ độ phân giải gốc — 01/11/2026” trong [VERIFICATION](../VERIFICATION.md) và `tests/server/wedding/upload-route.test.ts`.

## Revisit when

Đĩa hoặc RAM của máy chủ không đủ cho ảnh gốc; optimizer hiển thị chạm timeout 7 giây trong thực tế (cân nhắc giới hạn `images.deviceSizes`, tăng `imgOptTimeoutInSeconds` hoặc tạo sẵn bản hiển thị); hoặc khách cần tải về đúng file gốc để in.
