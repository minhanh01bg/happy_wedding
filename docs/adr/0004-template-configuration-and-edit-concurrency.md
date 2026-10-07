# ADR 0004 — Mẫu cấu hình, version editor và tiệc theo index

Date: 2026-10-03. Status: Accepted / implemented baseline.

## Context

Cần bán nhiều mẫu mà không làm một trình kéo-thả tự do. Chủ thiệp có thể mở nhiều cửa sổ; lịch tiệc và lựa chọn RSVP phải thống nhất.

## Decision

Template chọn một trong 3 layout và 6 palette. Nội dung sử dụng Zod schema dùng chung. Event/photo arrays lưu JSON trong Invitation. Mỗi mutation nội dung/publish tăng version; cập nhật nội dung so khớp version, publish còn kiểm tra không suspended. RSVP dùng eventIndex và chặn thay số lượng tiệc sau khi có phản hồi. Editor dùng key ổn định và không cho save chạy chồng upload.

## Alternatives

- HTML tự do/kéo-thả: linh hoạt hơn nhưng tăng diện kiểm tra/XSS, preview và bảo trì.
- Last write wins: đơn giản nhưng có thể mất nội dung khi hai tab sửa.
- WeddingEvent thành bảng có UUID ngay: định danh tốt hơn khi đổi thứ tự, thêm migration/UI và logic quan hệ.

## Consequences

Admin tạo biến thể trên layout có sẵn, không thể upload template tùy ý. eventsJson phải parse/validate khi đọc; không có FK event của RSVP. Số lượng tiệc ổn định chưa bảo vệ đổi thứ tự; người sửa phải giữ thứ tự sau RSVP. Template có published invitation không đổi premium. Đổi thiết kế global có thể tác động các thiệp đang dùng, vì chưa snapshot template cho từng thiệp.

## Evidence / revisit

`src/lib/wedding.ts`, `saveInvitation`, `publishInvitation`; `src/components/wedding/invitation-editor.tsx`, `editor-fields.tsx`. Xem xét bảng WeddingEvent với stable ID nếu cần xóa/thêm/đổi thứ tự sau RSVP; migration phải ánh xạ phản hồi cũ, không chỉ đổi UI key.

## Trình bày catalog — 05/10/2026

Thẻ mẫu dẫn trực tiếp tới preview hiện có ngoài trang chi tiết. Trang chi tiết mô tả yêu cầu quyền mẫu cao cấp thay vì tên gói cố định, vì admin có thể đổi catalog. So sánh gói đọc ServicePlan active tại server và được dùng ở cả pricing lẫn checkout; không duy trì một bảng quyền lợi tĩnh khác với quyền bán thực tế. Bảng cuộn trong vùng riêng, có caption, header row/column và focus bàn phím.

## Hai bố cục bổ sung — 05/10/2026

Minimal và cinematic vẫn dùng cùng nội dung thiệp, thay cấu trúc trình bày hero qua CSS. Cinematic dùng bảng chữ nền đặc để tương phản không phụ thuộc ảnh khách tải lên. Seed chỉ upsert-create bốn mẫu mới và không sửa catalog đã chỉnh; không cần migration schema. Ảnh xem trước cinematic dùng ảnh minh họa sẵn có, không lấy ảnh khách hàng.

### Font tiếng Việt — 06/10/2026

Nội dung dùng Be Vietnam Pro, tiêu đề/tên dùng Lora, tải local qua next/font/local với WOFF2 đầy đủ ký tự và font italic thực. Nới line-height tên/tiêu đề và mask animation để giữ dấu; font swap có fallback. Nguồn/giấy phép nằm src/app/fonts/. Không thay trường dữ liệu, API hay quyền truy cập.

### Âm nhạc và nhịp kể chuyện — 06/10/2026

`musicUrl` giữ là string: rỗng để tắt, HTTPS MP3/OGG như trước hoặc duy nhất `/audio/loi-hen.mp3` cho nhạc đóng gói. Không mở rộng arbitrary local paths, không sửa DB/migration; thiệp đang lưu giữ giá trị cũ. Demo/nội dung khởi tạo mới chọn piano, editor có chọn không nhạc/piano/bài riêng. Mở kèm nhạc gọi play trong user gesture trước await animation; skip/Escape không yêu cầu phát. Nút pause/âm lượng phản ánh media events, lỗi phát có thông báo/thử lại và không chặn mở thiệp; rời tab/unmount dừng nhạc. Chương câu chuyện dùng ảnh/tên/headline thật của thiệp; hoa SVG trang trí và ngày watermark lịch tiệc aria-hidden. Motion là progressive enhancement, reduced motion/no-JS vẫn đọc và dùng nội dung. Không đổi quyền truy cập hay RSVP/payment.

### Ảnh studio và mở thiệp — 06/10/2026

Hai ảnh stock cùng cặp đôi của Nam Nguyen thay alias minh họa couple.jpg/celebration.jpg; ghi nguồn và giấy phép trong public/images/CREDITS.md. Không thay URL ảnh khách tải lên hay dữ liệu DB. Cinematic desktop chia vùng ảnh 56% và bảng lời mời riêng để không che gương mặt; mobile giữ ảnh trên lời mời. Mở thiệp dùng phối cảnh chung 1800px, hoa SVG nét mảnh, dấu sáp hình tim; bảng tên nhấc nhẹ 520ms rồi hai cánh mở 1650ms sau trễ 220ms, giữ độ đục trong đầu chuyển động. Lớp sáng radial tắt khi kết thúc. Skip/Escape/reduced motion, focus, nhạc theo user gesture và no-JS giữ hành vi hiện có. Không đổi API/quyền truy cập.

### Hộp quà và lá rơi — 06/10/2026

Mục mừng cưới dùng details/summary bàn phím và no-JS mở được: nhấn hộp quà mở nắp, hiện QR theo một/hai tài khoản đã cấu hình; sao chép/lưu QR và fallback lỗi vẫn giữ. Preview demo chưa có tài khoản hiện hai QR SVG local mã hóa thông báo minh họa nhà trai/nhà gái, ghi rõ không dùng chuyển khoản; không tạo QR ngân hàng hay bịa tài khoản nhận tiền. Nội dung mở có animation nhẹ, reduced motion bỏ animation. Tăng lá/cánh rơi hero từ 7 lên 24, vị trí/kích thước/nhịp deterministic và delay âm để rải sẵn; decorative aria-hidden, pointer-events none, reduced motion/print ẩn. Không thay API, DB, thanh toán hay quyền truy cập.

### Admin sidebar và responsive — 07/10/2026

Shell admin chuyển từ tab ngang sang sidebar 248px cho desktop trên 900px, active route theo pathname (kể cả trang chi tiết đơn). Màn hình nhỏ dùng drawer dialog native có Escape, focus trap/return, tự đóng khi chọn mục hoặc resize desktop. Topbar giữ website/logout; skip link tới nội dung. Guard phiên/role server chạy trước khi render shell, không thay quyền/API/mutation. Bộ lọc GET giữ semantics, native select có chevron/màu/font thống nhất, nút xóa bộ lọc đơn. Bảng đơn/khách/thiệp/nhật ký ở <=600px hiện thẻ có nhãn cột; bảng desktop giữ cấu trúc ngữ nghĩa, panel rộng cuộn nội bộ. Form, stats, mẫu/gói và cấu hình co theo diện tích nội dung. Áp dụng UI UX Pro Max từ skill source my_task: focused UX responsive navigation và Next.js active links; dùng palette/font hiện có và Lucide đồng nhất.
