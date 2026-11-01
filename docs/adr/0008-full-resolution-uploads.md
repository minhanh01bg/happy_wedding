# ADR 0008 — Ảnh upload giữ độ phân giải gốc

Date: 2026-11-01. Status: Accepted / implemented.

## Context

Ảnh cưới của khách (thiệp `/w/vu-tu-nguyen-ngoc`) là JPEG dọc tới 5464×8192 (44,8 megapixel), 5–30 MB mỗi ảnh. Khách yêu cầu rõ không thu nhỏ ảnh. Pipeline cũ của `POST /api/wedding/upload` không nhận được các ảnh này:

- stream bị cắt ở 5 MiB (413 “Ảnh tối đa 5 MB”);
- Sharp `limitInputPixels: 40_000_000` từ chối 44,8 megapixel (400);
- ảnh lọt qua thì bị `resize({ width: 1600 })` rồi mã hóa WebP quality 85.

`/uploads/weddings/` là thư mục công khai, không cần đăng nhập. Ảnh điện thoại/máy ảnh thường có GPS, model máy, thời gian chụp trong EXIF/XMP. `imageSchema` trong `src/lib/wedding.ts` chỉ nhận `/uploads/weddings/<uuid>.webp`.

## Decision

1. **40 MiB/ảnh** (`MAX_UPLOAD_IMAGE_BYTES` trong `src/lib/wedding-upload.ts`), dùng chung cho route và kiểm tra trước ở editor; lỗi “Ảnh tối đa 40 MB”. Route vẫn đọc body theo stream, đếm byte và hủy reader ngay khi vượt, không buffer không giới hạn. Body là raw bytes, không multipart, nên không cộng phần dư. Đọc xong thì ghép thành một `Buffer` và bỏ danh sách chunk, để không giữ hai bản body trong lúc chờ và mã hóa.
2. **Không resize.** Chỉ `rotate()` theo EXIF orientation, sau đó giữ nguyên số điểm ảnh.
3. **Vẫn mã hóa lại sang WebP**, quality 90, effort 2, không lossless. Khi không gọi `keepMetadata`/`withMetadata`, Sharp bỏ toàn bộ metadata (EXIF, GPS, XMP) và chuyển màu theo ICC về sRGB; quy tắc đường dẫn `.webp` giữ nguyên.
4. **`limitInputPixels: 64_000_000`.** Ảnh có cạnh dài hơn 16.383 px (giới hạn của WebP) bị từ chối trước khi decode với lỗi “Ảnh có cạnh dài hơn 16.383 px. Vui lòng chọn ảnh nhỏ hơn”. Tệp hỏng và ảnh trên 64 megapixel giữ lỗi cũ “Tệp ảnh không hợp lệ hoặc quá lớn”.
5. **effort 2 thay vì mặc định 4.** Đo trên ảnh 5464×8192 tạo bằng nhiễu (27,6 MiB): effort 4 tốn 33 giây và 725 MB RSS; effort 2 tốn 6 giây và 338 MB, cùng kích thước output (18,9 MiB) và cùng PSNR (36,62 so với 36,63 dB trên vùng cắt 1024×1024). Effort 3 giống effort 4.
6. **Mỗi tiến trình mã hóa tối đa 2 ảnh cùng lúc** (`createSlots` trong `src/server/wedding/slots.ts`, tạo ở cấp module của route). Route lấy slot sau khi đã đọc xong body và trước khi Sharp decode. Request thứ ba trở đi chờ theo thứ tự đến, hàng chờ tối đa 10 request, mỗi request chờ tối đa 60 giây. Chỉ khi hàng đầy hoặc hết thời gian chờ mới trả 503 “Máy chủ đang bận, vui lòng thử lại sau” và ghi log `wedding_upload_busy`. Editor gửi từng ảnh một (input không có `multiple`, bị khóa trong lúc tải), nên một cặp tải 8–12 ảnh chỉ chiếm 1 slot.
7. **Kiểm tra định dạng theo nội dung tệp** sau `metadata()`: chỉ nhận `jpeg`, `png`, `webp`. Content-Type chỉ là nhãn; TIFF, GIF, SVG, HEIF... khai báo `image/jpeg` vẫn bị trả 400 “Chỉ nhận ảnh JPEG, PNG hoặc WebP”.
8. **`images.deviceSizes` của `next/image` dừng ở 2048** (`[640, 750, 828, 1080, 1200, 1920, 2048]`: danh sách mặc định của Next, bỏ 3840). `imageSizes` giữ mặc định 32–384. `sizes` của ảnh bìa (`(max-width: 760px) 95vw, 75vw`) và lightbox (`95vw`) không đổi; srcset của chúng giờ là 640–2048w. Điện thoại 390 px DPR 3 cần khoảng 1.110 px nên vẫn đủ nét; màn hình retina rộng 1.440 px mở lightbox cần khoảng 2.740 px và nhận bản 2048.

## Alternatives

- **Lưu nguyên byte gốc:** lộ GPS và thông tin máy qua URL công khai, phải đổi quy tắc `.webp`, và muốn bỏ metadata mà không mã hóa lại thì phải viết thêm bộ lọc segment JPEG/PNG/WebP. Không chọn.
- **WebP lossless:** file lớn hơn nhiều lần ảnh gốc. Không chọn.
- **Giữ 1600 px:** trái yêu cầu của khách.
- **Trả 503 ngay khi 2 slot đều bận:** hai cặp tải cùng lúc hoặc một lần thử lại sẽ thấy lỗi dù chỉ cần chờ vài giây. Không chọn; hàng chờ có giới hạn đủ chặn dồn RAM.
- **Giữ 3840 trong `deviceSizes`:** màn hình retina lớn nét hơn, nhưng mỗi lần tối ưu một ảnh 45 megapixel tốn 6 giây và 526 MB, sát timeout 7 giây; quá giờ thì Next trả cả file gốc khoảng 19 MB.
- **`sharp.concurrency(1)`:** trên Linux glibc không jemalloc, Sharp đã mặc định 1 thread; đặt 6 thread chỉ đổi RSS từ 338 lên 349 MB. Đây là cấu hình toàn tiến trình (ảnh hưởng cả `next/image`), nên không đặt.

## Consequences

- Vẫn là một lần nén lossy (q90), không giống từng byte với file gốc; kích thước điểm ảnh giữ nguyên.
- Ảnh cũ đã lưu ở 1600 px không thay đổi; muốn bản đầy đủ thì tải lại.
- Đĩa: 15–19 MiB/ảnh với ảnh thử dạng nhiễu (ảnh thật thường mượt hơn nên nhỏ hơn). Quota 120 ảnh/thiệp nghĩa là tới khoảng 2,3 GB/thiệp trong trường hợp xấu.
- RAM và CPU. Mọi số đo ở trên là **JPEG 8-bit** 44,8 megapixel: khoảng 6 giây và 340–350 MB khi không phải xoay; JPEG lưu ngang 8192×5464 có orientation 6 (29 MiB, phải xoay 90°) tốn 6,3 giây và 472 MB. Trường hợp xấu nhất mà giới hạn hiện tại vẫn nhận là **PNG RGBA 16-bit gần 64 megapixel phải xoay**: PNG kiểu này nén rất nhỏ (ảnh 32 megapixel chỉ 8,5 MiB) nên giới hạn 40 MB không chặn. Đo PNG RGBA 16-bit xoay 90° ở 8, 16, 32 megapixel được peak RSS 287, 505, 944 MB, tăng khoảng 27 MB mỗi megapixel, nên một ảnh 64 megapixel ngoại suy khoảng **1,8 GB** (lớn hơn mức ~1 GB ước lượng ban đầu; chưa đo trực tiếp để tránh làm sập máy thử). Với 2 slot, đỉnh lý thuyết khoảng 3,6 GB, cộng tối đa 10 body đang chờ (≤ 400 MB).
- Upload phải qua hàng chờ: lúc đông, request có thể chờ tới 60 giây trước khi mã hóa. Reverse proxy phải cho body 40 MB và timeout đủ cho cả chờ lẫn mã hóa. Semaphore chỉ có hiệu lực trong một tiến trình Node.
- <a id="hien-thi-va-file-goc"></a>Hiển thị: thiệp công khai và preview dùng `next/image`, nên trình duyệt **thường** nhận bản WebP thu nhỏ theo `sizes`, rộng tối đa 2048. Đo bằng `optimizeImage` của Next trên output 19 MiB: rộng 828 mất 2,2 giây, 1080 mất 2,4 giây, 1920 mất 3,0 giây, 2048 mất 3,0 giây (846 KiB, peak RSS 349 MB); bản 3840 (6,0 giây) đã bị bỏ. Timeout mặc định là 7 giây. **Khi tối ưu lỗi hoặc quá giờ, Next trả file gốc** (khoảng 19 MB) thay cho bản thu nhỏ, nên máy chủ chậm hoặc bận vẫn có thể gửi file gốc cho khách xem thiệp.

## Evidence

Xem mục “Ảnh upload giữ độ phân giải gốc — 01/11/2026” trong [VERIFICATION](../VERIFICATION.md) và `tests/server/wedding/upload-route.test.ts`.

## Revisit when

Đĩa hoặc RAM của máy chủ không đủ cho ảnh gốc, nhất là nếu gặp PNG 16-bit lớn (cân nhắc hạ `limitInputPixels`, từ chối ảnh 16-bit hoặc chỉ dùng 1 slot); log `wedding_upload_busy` xuất hiện thường xuyên; chạy nhiều tiến trình Node (semaphore chỉ đếm trong một tiến trình); optimizer vẫn chạm timeout 7 giây với bản 2048 trong thực tế (tăng `imgOptTimeoutInSeconds` hoặc tạo sẵn bản hiển thị lúc upload); hoặc khách cần tải về đúng file gốc để in.
