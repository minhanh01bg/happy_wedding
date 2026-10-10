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

### Dropdown trạng thái đơn dùng template — 07/10/2026

Ô trạng thái ở `/admin/orders` dùng lại `DropdownField` và `Select` từ template my_task, trên Base UI 1.8.0. Popup nằm trong portal, cùng màu/font Hỷ Studio, có tick lựa chọn, highlight bàn phím, Escape/return focus và hiệu ứng tôn trọng reduced motion. Form GET giữ tên `status` qua hidden input, các giá trị pending/paid/cancelled và giá trị rỗng cho tất cả; xóa bộ lọc khôi phục lựa chọn. Không thay truy vấn, quyền hoặc xử lý thanh toán.

Dropdown trạng thái tài khoản ở `/admin/customers` dùng cùng `DropdownField` của template với đơn dịch vụ. Form GET giữ `status=all|active|disabled`, tên truy cập “Trạng thái tài khoản”, lựa chọn theo URL và truy vấn/phân trang hiện có.

### Album và nhạc thiệp mẫu — 07/10/2026

Mẫu mới dùng sáu ảnh thật cùng cặp đôi, album hai cột so le và ảnh ngang rộng mỗi ba ảnh. Demo lưu từ baseline với đúng ba ảnh stock cũ được nâng album lúc render; demo có musicUrl rỗng dùng piano Lời hẹn. Nhạc bắt đầu khi bấm mở thiệp, có tắt/bật/âm lượng; skip vẫn yên lặng. Thiệp khách và album demo tùy chỉnh giữ dữ liệu đã chọn, không ghi đè DB. Guard công khai/entitlement không đổi.

Phần Câu chuyện dùng bố cục ảnh in giấy chữ nhật nghiêng nhẹ, kèm ảnh nhỏ so le khi album có ảnh khác. Ưu tiên ảnh album khác ảnh bìa; album rỗng dùng ảnh bìa. Khung vòm phần đầu giữ nguyên, ảnh câu chuyện tiếp tục hỗ trợ motion/reduced motion và responsive.

Toàn bộ select ứng dụng chuyển sang DropdownField/Select của template: admin catalog/category/palette/layout, ngân hàng dịch vụ, khoảng báo cáo/ngày biểu đồ; editor mẫu/nhạc/ngân hàng; RSVP attendance/eventIndex/partySize. Hidden input giữ tên và giá trị form; controlled state nhận onValueChange; ngân hàng BIN cũ ngoài danh mục vẫn hiển thị. Popup cuộn với danh sách dài và nhãn dài xuống dòng; không đổi hợp đồng payload/authorization/validation.

07/10/2026: hiệu ứng lấy cảm hứng từ public preview Layers được viết bằng CSS/WAAPI và RAF theo sự kiện, không thêm thư viện animation. Nội dung SSR không bị ẩn chờ JavaScript; reduced motion hủy reveal và reset pointer/parallax; touch dùng native scroll. Không đổi cấu hình template hoặc concurrency.

Hộp quà demo dùng isDemo thay vì kết hợp preview/isDemo để bản demo công khai có cùng trải nghiệm. Không mở fallback minh họa cho thiệp khách thông thường.

Gift reveal dùng native dialog cho top layer/focus trap và CSS keyframes một lần cho lid/glow/confetti. Không thêm dependency, không dùng random lúc SSR; preference giảm motion bỏ animation. Dialog cuộn độc lập và khôi phục overflow nền/focus khi đóng.

### Landing studio — 08/10/2026

Trang chủ bổ sung showcase năm ảnh cưới minh họa ghim theo cuộn, ảnh mở thành hình quạt; bốn thẻ lợi ích, FAQ dùng native details và bố cục editorial. Tham khảo preview công khai Showcase Equator / Carousel Spotlight của https://www.getlayers.ai/; không dùng mã nguồn/prompt Premium. Nội dung catalog vẫn đọc server, animation chỉ tăng cường client qua HomeMotion, giữ HTML hiển thị khi không có JS. Reduced motion bỏ ghim và chuyển động. Các CTA dẫn tới catalog, thiệp mẫu và tạo bản nháp; không thay API, giá, entitlement hay dữ liệu khách hàng.

### 08/10/2026 — hoàn thiện 10 mẫu thiệp

`invitationDesign` chọn composition theo cặp layout/palette hiện có, dùng chung cho thumbnail và thiệp đầy đủ: Lời yêu (editorial/rose), Vườn thương (botanical/sage), Song hỷ (classic/wine), Ngày chung đôi (editorial/sand), Đêm sao (classic/midnight), Nắng thu (botanical/terracotta), Lời hẹn (minimal/sand), Thư tình (minimal/rose), Khoảnh khắc (cinematic/midnight), Bên nhau (cinematic/terracotta). Mỗi composition có hero và chi tiết câu chuyện/lịch tiệc riêng; giữ đầy đủ countdown, lịch/bản đồ, gia đình, album/lightbox, RSVP, lời chúc được duyệt, nhạc, hộp quà QR và branding theo quyền lợi. Thumbnail phản ánh khung ảnh/chữ của composition.

Mở đầu dùng cửa cho rose/garden/traditional/night/autumn, thư cho editorial/sand và minimal, rèm cho cinematic. Skip/Escape/reduced motion vẫn đóng ngay, đưa focus tới h1 và không tự phát nhạc khi skip. Modal QR và preview RSVP disabled giữ nguyên semantics. Không đổi schema, giá, auth, API hay bank data. Tổ hợp mới ngoài 10 cặp được render fallback theo layout; admin đổi layout/palette làm composition đổi tương ứng, không khóa preset theo slug.

### Bố cục câu chuyện và album theo mẫu — 08/10/2026

Lượt hoàn thiện hero trước đây vẫn dùng cùng cấu trúc câu chuyện và album. Thay thế bằng `InvitationStory` với mười cây bố cục riêng, dùng chung dữ liệu Invitation và giữ nguyên authorization. `InvitationAlbum` giữ một lightbox native, nhưng trình bày ảnh theo từng mẫu:

| Mẫu            | Câu chuyện                                              | Album / chuyển động ảnh                                                     |
| -------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lời yêu        | Hai ảnh in so le cạnh lời kể                            | Mosaic so le, chương ảnh ghim/cuộn gom ảnh                                  |
| Vườn thương    | Chân dung trong vòng hoa, ảnh phụ và gia đình phía dưới | Khung vòm, ảnh ngang và khung tròn cho ảnh dọc, reveal từ tâm               |
| Song hỷ        | Gia đình trước ảnh nghi lễ, dấu song hỷ                 | Khung đôi đối xứng, mở ảnh theo trục Y                                      |
| Ngày chung đôi | Trang tạp chí, ảnh chủ đạo lớn, chân trang riêng        | Lưới 12 cột, ảnh panorama xen kẽ, wipe ngang                                |
| Đêm sao        | Chân dung tròn và ảnh vệ tinh                           | Ảnh spotlight đổi bằng hover/focus thumbnail, reveal blur/zoom              |
| Nắng thu       | Nhật ký có dòng kẻ, ảnh dán băng giấy                   | Polaroid nghiêng, chuyển động rơi/xoay                                      |
| Lời hẹn        | Thư hai cột, ảnh ngang, tên gia đình cuối               | Filmstrip cuộn ngang có scroll snap, mở ảnh từ đường giữa                   |
| Thư tình       | Giấy thư cùng hai bản in, gia đình trong thư            | Album hai trang, nút chuyển trang, rotateY                                  |
| Khoảnh khắc    | Khung ảnh lớn với chữ chồng ảnh, đoạn kể riêng          | Các ảnh sticky xếp lớp khi cuộn; reduced motion chuyển thành danh sách tĩnh |
| Bên nhau       | Diptych cao thấp, lời kể và gia đình chia đôi           | Accordion ngang mở rộng khi hover/focus, điện thoại dùng khung dọc          |

Ảnh demo được chọn theo bố cục; thiệp khách dùng ảnh đã cung cấp, không suy diễn mốc chuyện tình hoặc thêm thông tin gia đình. Mẫu còn dùng layout/palette để resolve thiết kế, không đổi schema/catalog ID. Không thêm thư viện animation; WAAPI có cleanup/reduced motion. Preview vẫn miễn phí, khóa gửi RSVP. Hộp quà, nhạc và quyền truy cập giữ hợp đồng hiện tại.

Album nhận diện ảnh ngang sau khi tải để dành khung rộng hoặc giữ toàn bộ ảnh trong trang sách/spotlight/cinema; ảnh demo ngang có cấu hình trước để ổn định bố cục. Accordion desktop giãn ảnh đủ chiều cao khung và mở rộng bằng hover hoặc focus bàn phím; trên điện thoại dùng các khung dọc. Không đổi payload hoặc dữ liệu ảnh lưu.

## Bìa và nhịp đọc riêng — 08/10/2026

Hero chuyển từ một cây HTML chung sang mười cấu trúc server riêng trong `InvitationHero`: chân dung lãng mạn, vòm vườn, báo hỷ nghi lễ, trang báo, chân dung quỹ đạo, scrapbook, lời hẹn tối giản, thư/phong bì, màn phim và diptych. CSS Modules giới hạn phong cách trong thiệp; không phụ thuộc thứ tự CSS global để dựng lại cùng một cây HTML. Tên, ngày, lời mời và ảnh vẫn lấy từ Invitation; ảnh thứ hai lấy từ album đã có, fallback cover nếu không có ảnh khác.

Count­down, story, events và album được sắp lại trong DOM theo từng design, giữ RSVP và hành động chính dễ tìm bằng điều hướng đầu trang. Không dùng CSS order để làm thứ tự đọc của trình đọc màn hình khác thứ tự hiển thị. Mở thiệp có thêm chuyển động theo design, giữ native dialog, bỏ qua/Escape, reduced motion và yêu cầu phát nhạc ngay trong thao tác người dùng.

Bìa demo stock chọn ảnh từ chính album demo theo thiết kế, đặc biệt ảnh ngang cho Lời hẹn và Khoảnh khắc. Chỉ thay lựa chọn trình bày nếu isDemo, cover là stock mặc định và ảnh nằm trong photos đã đọc; không ghi DB hay thay cover khách tùy chỉnh.

## Lịch tiệc và artwork mở đầu — 10/10/2026

`InvitationEvents` dựng mười cấu trúc lịch tiệc bằng server components, giữ eventIndex/nội dung/sắp thứ tự eventsJson. Maps và calendar dùng địa điểm/thời gian thật, không suy diễn lịch trình lễ từ mẫu đối thủ. Khung ngày/giờ dùng múi giờ Asia/Ho_Chi_Minh. Lịch tháng của weddingDate là bảng Monday-first có caption/header và đánh dấu ngày cưới; không phải lịch chọn ngày hay lịch âm. Hàm pure trong wedding-date-calendar resolve ngày VN trước khi dựng tháng bằng UTC, tránh lệch ngày/múi giờ SSR.

Opening giữ native dialog/skip/Escape/reduced motion/nhạc trong click. Artwork SVG/CSS gốc theo design thay hình hoa chung ở các phong cách báo/đêm/nhật ký/thư/phim/diptych. Các preset chuyển động nội suy từ trạng thái giữa đến trạng thái cuối thay vì dùng cùng endpoint ở 55% và 100%. CSS Modules giới hạn khung lịch và artwork, giữ những class semantic cần cho progressive enhancement và test. Nút skip dùng nền trong suốt và màu kế thừa để đọc được trên giấy/thư và màn tối.
