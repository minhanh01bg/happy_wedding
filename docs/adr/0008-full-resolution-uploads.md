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
6. **Mỗi tiến trình mã hóa tối đa 2 ảnh cùng lúc** (`createSlots` trong `src/server/wedding/slots.ts`, tạo ở cấp module của route). Route lấy slot sau khi đã đọc xong body và kiểm tra xong header (mục 7 và 9), trước khi Sharp decode. Request thứ ba trở đi chờ theo thứ tự đến, hàng chờ tối đa 10 request, mỗi request chờ tối đa 60 giây. Chỉ khi hàng đầy hoặc hết thời gian chờ mới trả 503 “Máy chủ đang bận, vui lòng thử lại sau” và ghi log `wedding_upload_busy`. `acquire` nhận `request.signal`: client đóng kết nối khi đang chờ thì request rời hàng ngay, không làm lệch thứ tự hay số slot. Route kiểm lại signal sau khi được cấp slot và sau khi mã hóa, nên request đã hủy không được mã hóa (hoặc bị bỏ bản mã hóa), không lưu file, không trừ quota, trả 499. Editor gửi từng ảnh một (input không có `multiple`, bị khóa trong lúc tải), nên một cặp tải 8–12 ảnh chỉ chiếm 1 slot.
7. **Kiểm tra định dạng theo nội dung tệp** sau `metadata()`: chỉ nhận `jpeg`, `png`, `webp`. Content-Type chỉ là nhãn; TIFF, GIF, SVG, HEIF... khai báo `image/jpeg` vẫn bị trả 400 “Chỉ nhận ảnh JPEG, PNG hoặc WebP”.
8. **`images.deviceSizes` của `next/image` dừng ở 2048** (`[640, 750, 828, 1080, 1200, 1920, 2048]`: danh sách mặc định của Next, bỏ 3840). `imageSizes` giữ mặc định 32–384. `sizes` của ảnh bìa (`(max-width: 760px) 95vw, 75vw`) và lightbox (`95vw`) không đổi; srcset của chúng giờ là 640–2048w. Điện thoại 390 px DPR 3 cần khoảng 1.110 px nên vẫn đủ nét; màn hình retina rộng 1.440 px mở lightbox cần khoảng 2.740 px và nhận bản 2048.
9. **Ngân sách RAM giải mã 200 MiB/ảnh** (`MAX_UPLOAD_DECODE_BYTES` và `decodeCostBytes` trong `src/lib/wedding-upload.ts`). Sau `metadata()` (chỉ đọc header, chưa decode điểm ảnh), route ước lượng khung ảnh thô = rộng × cao × số kênh × byte mỗi mẫu (1 với 8-bit, 2 với 16-bit). Vượt 200 MiB thì trả 400 “Ảnh quá lớn để xử lý, vui lòng dùng ảnh JPEG 8-bit”. **Ảnh có kênh alpha luôn tính 8 byte/điểm ảnh** (như RGBA 16-bit), kể cả khi là 8-bit. Lý do: RAM của ảnh có alpha tăng theo số điểm ảnh chứ không theo độ sâu bit. Đo PNG RGBA 8-bit 7200×7200 (51,8 megapixel, khung 198 MiB, lọt công thức thuần) cần 1.255 MiB, nhiều hơn mọi ảnh khác dưới ngân sách. Mọi kiểm tra header (định dạng, cạnh 16.383 px, 64 megapixel, ngân sách) chạy trước khi lấy slot, nên ảnh bị từ chối không chiếm slot và không bao giờ được decode. Kết quả:
   - JPEG RGB 8-bit qua được tới trần 64 megapixel, gồm ảnh 5464×8192 của khách (khung 128 MiB).
   - RGB 16-bit qua được tới khoảng 34,9 megapixel.
   - Ảnh có alpha qua được tới khoảng 26,2 megapixel.
   - RGBA 16-bit từ 32 megapixel trở lên bị từ chối.

## Alternatives

- **Lưu nguyên byte gốc:** lộ GPS và thông tin máy qua URL công khai, phải đổi quy tắc `.webp`, và muốn bỏ metadata mà không mã hóa lại thì phải viết thêm bộ lọc segment JPEG/PNG/WebP. Không chọn.
- **WebP lossless:** file lớn hơn nhiều lần ảnh gốc. Không chọn.
- **Giữ 1600 px:** trái yêu cầu của khách.
- **Trả 503 ngay khi 2 slot đều bận:** hai cặp tải cùng lúc hoặc một lần thử lại sẽ thấy lỗi dù chỉ cần chờ vài giây. Không chọn; hàng chờ có giới hạn đủ chặn dồn RAM.
- **Giữ 3840 trong `deviceSizes`:** màn hình retina lớn nét hơn, nhưng mỗi lần tối ưu một ảnh 45 megapixel tốn 6 giây và 526 MB, sát timeout 7 giây; quá giờ thì Next trả cả file gốc khoảng 19 MB.
- **Ngân sách chỉ theo khung thô, không tính riêng alpha:** cho lọt PNG RGBA 8-bit tới 52 megapixel, đo được 1.255 MiB/slot. Không chọn.
- **Từ chối mọi ảnh 16-bit hoặc hạ `limitInputPixels`:** không chặn được ảnh RGBA 8-bit lớn, mà lại từ chối cả ảnh 16-bit nhỏ vô hại. Ngân sách theo header chặn đúng thứ làm tốn RAM.
- **`sharp.concurrency(1)`:** trên Linux glibc không jemalloc, Sharp đã mặc định 1 thread; đặt 6 thread chỉ đổi RSS từ 338 lên 349 MB. Đây là cấu hình toàn tiến trình (ảnh hưởng cả `next/image`), nên không đặt.

## Consequences

- Vẫn là một lần nén lossy (q90), không giống từng byte với file gốc; kích thước điểm ảnh giữ nguyên.
- Ảnh cũ đã lưu ở 1600 px không thay đổi; muốn bản đầy đủ thì tải lại.
- Đĩa: 15–19 MiB/ảnh với ảnh thử dạng nhiễu (ảnh thật thường mượt hơn nên nhỏ hơn). Quota 120 ảnh/thiệp nghĩa là tới khoảng 2,3 GB/thiệp trong trường hợp xấu.
- RAM và CPU. Ảnh **JPEG 8-bit** 44,8 megapixel của khách tốn khoảng 6 giây và 340–350 MB khi không phải xoay. JPEG lưu ngang 8192×5464 có orientation 6 (29 MiB, phải xoay 90°) tốn 6,3 giây và 472 MB. RAM khi mã hóa đi theo khung ảnh thô, không theo dung lượng tệp. PNG nén rất nhỏ (RGBA 16-bit 32 megapixel chỉ 8,5 MiB), nên giới hạn 40 MB không chặn được. Đo PNG RGBA 16-bit xoay 90° ở 8, 16, 32 megapixel được peak RSS 287, 505, 944 MB: khoảng 27 MB mỗi megapixel cộng khoảng 70 MB nền. Trước khi có ngân sách giải mã, ngoại suy cho ảnh gần 64 megapixel là khoảng 1,8 GB/slot (3,6 GB với 2 slot). Với ngân sách 200 MiB (mục 9), đây là ảnh lớn nhất còn được nhận ở mỗi loại (xoay 90°, effort 2, mỗi ảnh một tiến trình mới):

  | Ảnh còn được nhận                   | Khung tính ngân sách | Peak RSS (MiB) | Thời gian |
  | ----------------------------------- | -------------------- | -------------- | --------- |
  | PNG RGBA 16-bit 5100×5100 (26 MP)   | 198 MiB              | 780            | 2,6 s     |
  | PNG RGBA 8-bit 5100×5100 (26 MP)    | 198 MiB (alpha × 8)  | 675            | 2,3 s     |
  | JPEG RGB 8-bit 8000×8000 (64 MP)¹   | 183 MiB              | 641            | 10 s      |
  | PNG xám 16-bit 8000×8000 (64 MP)    | 122 MiB              | 483            | 3,7 s     |
  | JPEG CMYK 8-bit 7200×7200 (51,8 MP) | 198 MiB              | 461            | 6,1 s     |
  | PNG RGB 16-bit 5900×5900 (34,8 MP)  | 199 MiB              | 426            | 2,3 s     |

  ¹ Ảnh nhiễu 41,8 MiB, vượt giới hạn 40 MB, dùng làm cận trên cho JPEG 64 megapixel.

  **Trường hợp xấu nhất mỗi slot là ảnh có alpha sát ngân sách (khoảng 26,2 megapixel): đo được khoảng 780 MiB**, khớp với 27 MB/MP × 26,2 + 70 MB ≈ 780 MB. **Với 2 slot, đỉnh khoảng 1,6 GB**, cộng tối đa 10 body đang chờ (≤ 400 MB), tổng khoảng 2 GB trên nền tiến trình Node. Ảnh RGBA 8-bit 51,8 megapixel (1.255 MiB) và RGBA 16-bit từ 32 megapixel (944 MB trở lên) bị từ chối.

- Upload phải qua hàng chờ: lúc đông, request có thể chờ tới 60 giây trước khi mã hóa. Reverse proxy phải cho body 40 MB và timeout đủ cho cả chờ lẫn mã hóa. Semaphore chỉ có hiệu lực trong một tiến trình Node.
- <a id="hien-thi-va-file-goc"></a>Hiển thị: thiệp công khai và preview dùng `next/image`, nên trình duyệt **thường** nhận bản WebP thu nhỏ theo `sizes`, rộng tối đa 2048. Đo bằng `optimizeImage` của Next trên output 19 MiB: rộng 828 mất 2,2 giây, 1080 mất 2,4 giây, 1920 mất 3,0 giây, 2048 mất 3,0 giây (846 KiB, peak RSS 349 MB); bản 3840 (6,0 giây) đã bị bỏ. Timeout mặc định là 7 giây. **Khi tối ưu lỗi hoặc quá giờ, Next trả file gốc** (khoảng 19 MB) thay cho bản thu nhỏ, nên máy chủ chậm hoặc bận vẫn có thể gửi file gốc cho khách xem thiệp.

## Evidence

Xem mục “Ảnh upload giữ độ phân giải gốc — 01/11/2026” trong [VERIFICATION](../VERIFICATION.md) và `tests/server/wedding/upload-route.test.ts`.

## Revisit when

Đĩa hoặc RAM của máy chủ không đủ cho ảnh gốc: đỉnh khoảng 1,6 GB khi 2 slot cùng mã hóa ảnh có alpha sát ngân sách (cân nhắc hạ `MAX_UPLOAD_DECODE_BYTES` hoặc chỉ dùng 1 slot). Khách hợp lệ gặp lỗi “Ảnh quá lớn để xử lý”, ví dụ PNG có nền trong suốt trên 26 megapixel (cân nhắc bỏ alpha khi nền đặc). Hoặc khi: log `wedding_upload_busy` xuất hiện thường xuyên; chạy nhiều tiến trình Node (semaphore chỉ đếm trong một tiến trình); optimizer vẫn chạm timeout 7 giây với bản 2048 trong thực tế (tăng `imgOptTimeoutInSeconds` hoặc tạo sẵn bản hiển thị lúc upload); hoặc khách cần tải về đúng file gốc để in.
