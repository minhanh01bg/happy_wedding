# ADR 0010 — Chủ thiệp tải MP3 riêng làm nhạc nền

Date: 2026-11-01. Status: Accepted / implemented.

## Context

Khách gửi một tệp MP3 và muốn thiệp phát đúng bài đó. Trước đây `musicUrl` chỉ nhận chuỗi rỗng, nhạc đóng gói `/audio/loi-hen.mp3` hoặc link HTTPS MP3/OGG trên tên miền. Khách thường không có chỗ lưu tệp riêng có HTTPS, và link từ dịch vụ chia sẻ thường là trang HTML chứ không phải tệp âm thanh, nên trình duyệt không phát được. Đường duy nhất là dự án tự lưu tệp như đã làm với ảnh upload.

## Decision

1. **Route riêng `POST /api/wedding/upload-music?invitationId=<id>`** thay vì mở rộng `POST /api/wedding/upload`. Route ảnh gắn chặt với Sharp (kiểm tra, mã hóa WebP, hàng chờ slot); MP3 không cần giải mã nên tách ra giữ cả hai đơn giản và không đổi hành vi ảnh.
2. **Cùng guard và quota với ảnh:** safe origin, phiên khách hàng, ownership qua `Invitation.ownerId`, `mutationLimit` scope `upload`, body raw đọc theo stream với giới hạn, rồi `reserveUpload` (120 tệp/thiệp, 150 tệp/account/24 giờ) trước khi ghi file. Lỗi ghi file xóa bản ghi vừa tạo. Lỗi không mong đợi trả 500 kèm correlationId và log `wedding_upload_music_error`.
3. **Giới hạn 15 MB** (`MAX_UPLOAD_MUSIC_BYTES` = 15×1024×1024), đủ cho một bài 5–6 phút ở 320 kbps. Vượt giới hạn thì hủy reader giữa chừng và trả 413.
4. **Kiểm byte, không tin tên hay Content-Type.** `isMp3` nhận thẻ ID3v2 (phiên bản 2–4, kích thước syncsafe) rồi một header MPEG Layer III trong 4.096 byte sau thẻ, hoặc header Layer III ngay byte đầu. Header phải đúng frame sync, phiên bản, layer, chỉ số bitrate 1–14, tần số mẫu và emphasis hợp lệ. Nếu tệp còn đủ dài, frame kế tiếp phải bắt đầu đúng chỗ frame đầu kết thúc, để chuỗi ngẫu nhiên tình cờ có `0xFFF` khó lọt.
5. **Tên tệp do server tạo:** `public/uploads/weddings/<uuid>.mp3`, lưu nguyên byte, không bao giờ dùng tên tệp của client.
6. **Schema chỉ nhận đúng mẫu đó:** `musicUrl` thêm đúng regex `/uploads/weddings/<uuid chữ thường>.mp3`; không nhận đường dẫn local khác, `..`, query hay đuôi khác.
7. **Phục vụ như mọi file trong `public/`:** Next trả `Content-Type: audio/mpeg`, `Accept-Ranges: bytes`, 206 cho Range, kèm `X-Content-Type-Options: nosniff`. CSP `media-src 'self' https:` đã cho phát âm thanh cùng origin nên không đổi CSP.
8. **Editor:** dưới “Dùng bài hát riêng” có nút “Tải nhạc MP3 lên”, kiểm kích thước trước khi gửi, báo tiến trình và lỗi bằng tiếng Việt, đặt `musicUrl` bằng URL trả về và nghe thử được; chủ thiệp phải lưu thiệp để áp dụng.

## Alternatives

- **Mở rộng route ảnh:** phải rẽ nhánh trong pipeline Sharp và hàng chờ slot, dễ làm hỏng upload ảnh vừa sửa ở ADR 0008.
- **Multipart:** route ảnh đã dùng raw body; multipart cần parser và giới hạn riêng mà không thêm gì cho một tệp.
- **Chuyển mã bằng ffmpeg:** đảm bảo tệp phát được và loại siêu dữ liệu, nhưng thêm binary, tốn CPU/RAM trên máy vốn thiếu bộ nhớ, và là bề mặt tấn công lớn hơn nhiều so với đọc vài header.
- **Bắt khách tự host:** giữ nguyên rule cũ, nhưng không giải quyết được nhu cầu thật.

## Consequences

- **Bản quyền là trách nhiệm của chủ thiệp.** Editor ghi “Chỉ dùng bài hát bạn có quyền sử dụng.” Dự án không kiểm tra bản quyền; khi có khiếu nại, quản trị viên phải xóa tệp trong `public/uploads/weddings/` bằng tay.
- Tệp có URL công khai không đoán được nhưng không bí mật, như ảnh upload; ai có link đều tải được.
- Byte được lưu nguyên, gồm cả thẻ ID3 (tên bài, ảnh bìa) khách gửi. `isMp3` chỉ chặn tệp rõ ràng không phải MP3, không đảm bảo mọi frame phía sau đều phát được; tệp polyglot không chạy được vì phục vụ dưới `audio/mpeg` + `nosniff`.
- Dùng chung quota với ảnh, và thông báo quota hiện vẫn nói “ảnh”.
- Không có cleanup orphan tự động: tải lên rồi không lưu, hoặc đổi bài, để lại tệp cũ.
- `next dev` thấy tệp mới ngay; `next start` chỉ phục vụ file `public/` có lúc khởi động, cùng giới hạn với ảnh upload. Reverse proxy phải cho body tới 15 MB trên route này.
- Không có Prisma migration: `musicUrl` vẫn là string, `WeddingUpload` dùng lại như ảnh.

## Evidence

`tests/lib/wedding-music.test.ts` (schema nhận đường dẫn upload, từ chối đường dẫn local khác và `..`; `isMp3` nhận ID3 + frame, frame trần, MPEG-2, từ chối PNG/văn bản/HTML, header sai, frame thứ hai lệch) và `tests/api/upload-music.test.ts` (MP3 giả nhận được và lưu `<uuid>.mp3`, đúng 15 MB nhận, PNG/văn bản đổi đuôi bị 400, stream 64 MB bị 413 và hủy sớm, người khác 404, chưa đăng nhập 401, origin lạ 403, quota đầy 409, lỗi ghi 500 kèm correlationId). Tất cả chỉ dùng tệp giả tạo trong bộ nhớ, không có bài hát thật. `serveStatic` của Next trả `audio/mpeg` và 206 cho `Range: bytes=0-9`.

## Revisit when

Cần chuyển sang `next start`/CDN (phục vụ upload qua route hoặc thư mục ngoài `public/`), cần dọn tệp mồ côi, cần thêm định dạng khác (AAC/OGG), hoặc có khiếu nại bản quyền đòi quy trình gỡ chính thức.
