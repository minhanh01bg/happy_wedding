# Kết quả kiểm tra — 03/10/2026

- `pnpm check`: lint, TypeScript, 13 file / **111 bài kiểm tra qua**.
- `pnpm build`: build production thành công, tạo toàn bộ route của website/khách/admin/API.
- `pnpm test:e2e`: **2 kịch bản Chromium qua**, trên DB test riêng.
- `pnpm run setup`: chạy lại thành công, không ghi đè catalog; migration status cập nhật đầy đủ.
- Backup bằng SQLite backup API: `PRAGMA integrity_check = ok`, có 6 mẫu trong snapshot.
- Kiểm tra production thiếu cấu hình: instrumentation từ chối chuẩn bị ứng dụng với lỗi môi trường; không phục vụ ứng dụng khi thiếu Redis, HMAC, proxy và origin công khai.
- Kiểm tra desktop/mobile bằng Playwright; màn hình chính và thiệp mẫu không có lỗi console.

## Những đường đi được kiểm tra trên trình duyệt

Đăng ký → dashboard → tạo thiệp → tải ảnh từ thiết bị → lưu → thử xuất bản khi chưa thanh toán (bị từ chối) → mua gói → báo chuyển khoản (vẫn pending) → admin đăng nhập/xác nhận giao dịch → khách kiểm tra trạng thái → xuất bản → tạo lời mời cho Chị Lan → khách mở link cá nhân → RSVP hai người/lời chúc → chủ thiệp duyệt → lời chúc xuất hiện công khai → xuất CSV.

Kịch bản khác kiểm tra trang chủ ở 390×844, lọc mẫu theo phong cách, chi tiết mẫu và bản preview hoàn chỉnh. Preview khóa chức năng gửi RSVP. Kiểm tra không có cuộn ngang trên điện thoại; mutation không có phiên khách trả 401.

## Kiểm tra miền nghiệp vụ

Quyền sở hữu thiệp, cập nhật version, trùng slug, gói hết hạn, mẫu cao cấp, tài khoản/thiệp bị khóa; snapshot giá/quyền lợi; idempotency mua gói và webhook; sai số tiền, sai auth, sai ngân hàng, tiền ra, đơn đã hủy; gia hạn; RSVP không nhân đôi theo lời mời; lời chúc mặc định chờ duyệt; không xóa/thêm tiệc khi đã có phản hồi; lọc token lời mời/API Key khỏi log.

## React Doctor

Bản quét đầy đủ đầu tiên sau khi stage toàn bộ mã mới: 60/100, 39 gợi ý. Sau rà soát: **72/100, 8 gợi ý**, không còn gợi ý performance. Đã đổi API Zod sang API v4, tách trình sửa thiệp thành các phần, bảo vệ request tải ảnh, dùng ref cho version, ổn định key tiệc/ảnh, gom formatter, gom query độc lập và tách hàm điều hướng khỏi component.

8 gợi ý còn lại đã được xem:

- 5 lần preventDefault trong form: **false positive với luồng hiện tại, confidence cao**. Các form chủ động gửi JSON qua API, có trạng thái pending/error và giữ nội dung khi lỗi; native submit sẽ điều hướng sai. E2E xác nhận các form hoạt động. Chưa chuyển toàn bộ sang form actions vì việc reset input sẽ đổi hành vi này.
- 2 cấu trúc bảng lặp: **gợi ý maintainability, confidence cao**. Bảng nhật ký và bảng khách hàng có miền dữ liệu khác nhau; có thể trích table shell khi mở rộng giao diện.
- AuthForm nhiều nhánh: **gợi ý maintainability, confidence cao**. Ba chế độ register/customer login/admin login; các luồng đã được E2E và kiểm tra session bao phủ. Có thể tách presentation theo vai trò trong đợt tiếp theo.

Không tắt hoặc suppress rule để thay đổi điểm.

## Chưa xác minh / cần thông tin thật

Chưa chạy giao dịch tiền thật hoặc tài khoản SePay thật; chưa triển khai domain/HTTPS production. Ngân hàng nhận tiền chưa cấu hình, giá là dữ liệu khởi tạo. Thiệp mẫu không phải thiệp của anh trai. Cần tên, ngày/giờ, địa điểm, ảnh và thông tin nhận tiền để hoàn thiện nội dung thật. Xem [hướng dẫn vận hành](OPERATIONS.md).

## Animation và album — 03/10/2026

Giữ nguyên palette, thêm hero xuất hiện lần lượt, ảnh bìa zoom chậm, trang trí theo layout, nội dung và thẻ hiện khi cuộn, phản hồi nút/RSVP/nhạc. Album dùng native dialog với chuyển ảnh, Escape, focus trap và trả focus về thumbnail. Nội dung không bị ẩn khi JavaScript chưa chạy; reduced motion tắt cả CSS và Web Animations API.

Kiểm tra mới: `pnpm check` đạt lint/TypeScript và 111 tests; `pnpm build` đạt; `pnpm test:e2e` đạt 3/3 kịch bản, gồm album trên viewport 390×844, phím mũi tên, Escape, focus restoration, không cuộn ngang và đổi reduced motion. Không thay API, quyền công khai hoặc dữ liệu thanh toán.

## Mở cửa thiệp — 03/10/2026

Thêm màn mở thiệp bằng hai cánh cửa xoay, theo palette/layout của mẫu; tên cặp đôi, ngày cưới và tên khách riêng khi có. Native dialog khóa focus/scroll trong lúc mở, nút Mở thiệp hoặc Escape mở cửa; sau đó focus tiêu đề và bắt đầu animation nội dung. Reduced motion mở tức thì; không JavaScript vẫn xem được thiệp. Đã xem giao diện ở 390×844 và 1440×900.

`pnpm check` đạt lint/TypeScript và 111 tests; `pnpm build` đạt; `pnpm test:e2e` đạt 4/4. Kịch bản mới kiểm tra mở bằng Enter/Escape, focus/scroll sau mở, tải lại, reduced motion và fallback không JavaScript. Kịch bản RSVP/album chờ cửa đóng trước khi tương tác.

## Responsive theo UI UX Pro Max — 03/10/2026

Áp dụng skill local `my_task/.agents/skills/ui-ux-pro-max/SKILL.md`: tra cứu domain UX (responsive/table handling/touch friendly) và stack Next.js (responsive images). Giữ màu và phong cách hiện tại; menu chính hiển thị trên điện thoại, control có vùng bấm lớn hơn, form 16px ở ≤800px, grid xử lý tên dài, ảnh bìa/QR/countdown/album co theo màn hình, cửa mở thu gọn ở landscape. Header workspace xuống dòng và không sticky trên mobile.

`pnpm check` đạt lint/TypeScript và 111 tests; `pnpm build` đạt. `pnpm test:e2e` đạt 10/10: sáu viewport 320×568, 390×844, 844×390, 768×1024, 1024×768, 1440×900; trang chủ/kho mẫu/bảng giá/login, ba layout editorial/botanical/classic, tên dài, cửa mở và nút đóng album nằm trong màn hình, không tràn ngang. Đã xem ảnh chụp mobile và landscape. Kiểm tra bằng Chromium mô phỏng viewport; chưa xác minh trên thiết bị iOS/Android thật.

Sau bổ sung kiểm tra vùng đăng nhập, chạy lại `pnpm test:e2e --grep 'customer buys'` đạt 1/1: workspace khách hàng và danh sách đơn admin không tràn ngang ở 320/768/1024px, nút đăng xuất luôn hiển thị; luồng thanh toán, xuất bản, RSVP và duyệt lời chúc vẫn đạt.

## Hai tài khoản mừng cưới — 03/10/2026

Migration additive giữ tài khoản cũ ở nhà trai và thêm ba trường nhà gái mặc định rỗng. Đã chạy toàn bộ migrations trên DB mới ở `/tmp`, kiểm tra giữ tài khoản cũ bằng fixture SQLite, áp dụng migration vào `prisma/dev.db` của dự án (không dùng DB `my_task`). Server tests kiểm tra lưu/xuất bản hai bên, ngân hàng nhà gái thiếu dữ liệu, ownership và input từ client cũ.

`pnpm check` đạt lint/TypeScript và 114 tests; `pnpm build` đạt. Chín kịch bản preview/responsive E2E đạt; sau sửa locator ngân hàng theo role combobox, `pnpm test:e2e --grep 'customer buys'` đạt toàn luồng với hai tài khoản, fallback khi chủ động chặn QR nhà trai, thông tin tài khoản vẫn hiện và RSVP vẫn hoạt động. Test phải cuộn đến QR để kích hoạt ảnh lazy-load. Tiền mừng không tạo payment/order hoặc cộng doanh thu; chưa thử chuyển khoản thật.

## Dashboard và thống kê khách — 03/10/2026

Thêm báo cáo 7/30/90 ngày với tám chỉ số, tiền thực nhận toàn thời gian/trong kỳ, kỳ trước, biểu đồ đường tương tác và bảng ngày, tổng theo gói snapshot, trạng thái catalog/khách/thiệp và tác vụ vận hành. Danh sách khách có bộ lọc hoạt động/khóa, tổng theo trạng thái và số tiền gói đã thanh toán. Role/session được xác minh lại ở dashboard trước lấy số liệu.

`pnpm check` đạt 116 tests/lint/typecheck, `pnpm build` đạt. E2E toàn bộ 10/10 đạt cho QR và dashboard; sau thêm danh sách khách, chạy lại `pnpm test:e2e --grep 'customer buys'` đạt 1/1 với biểu đồ/bảng, đổi kỳ 7→90, số tiền khách và bộ lọc tài khoản khóa. Server regression xác minh ranh giới 17:00 UTC thành ngày VN mới, loại demo/pending, tiền theo ngày/kỳ/gói và dữ liệu 0. Đã xem screenshot dashboard 390/1440px và xác nhận không cuộn ngang. Tiền này chưa trừ chi phí; chưa có hoàn tiền/đối soát hai kênh ngoài luồng hiện có.

## Cấu hình thanh toán dịch vụ — 05/10/2026

Chọn ngân hàng theo tên, xem trước tài khoản/QR, lưu liên hệ điện thoại/email có link trực tiếp từ đơn. QR lỗi giữ hướng dẫn chuyển khoản và có thử lại. API và đọc cấu hình dùng chung schema; dữ liệu cũ không có hai trường liên hệ vẫn đọc được. SePay ngừng kích hoạt khi chưa lưu hoặc tài khoản đã đổi không khớp máy chủ.

`pnpm check` đạt lint/typecheck và 121 tests; `pnpm build` đạt. `pnpm test:e2e` đạt 10/10, gồm lưu cấu hình qua phiên admin, khách tải lại đơn thấy liên hệ tel/mailto và vẫn chờ xác nhận, sau đó xác nhận/xuất bản/RSVP. Tests server kiểm tra đổi tài khoản không kích hoạt, thiếu merchant trả 503, tương thích cấu hình cũ, liên hệ không hợp lệ, secret ngắn và tài khoản lệch. Chưa thử giao dịch ngân hàng thật; trạng thái cấu hình khớp không khẳng định bank live đã hoạt động.

## So sánh gói và xem mẫu trực tiếp — 05/10/2026

Bảng giá và bước mua dùng cùng bảng so sánh từ ServicePlan active, thể hiện giá/thời hạn/ảnh/mẫu/branding. Nội dung tiện ích chung và FAQ giải thích tạo nháp, mừng cưới hai bên, RSVP, tự gửi lời mời, duyệt lời chúc, CSV, thanh toán và gia hạn. Chi tiết mẫu không phụ thuộc tên gói cố định. Mỗi thẻ mẫu có link xem thiệp đầy đủ; banner minh họa vẫn giữ.

`pnpm check` đạt lint/typecheck/121 tests, `pnpm build` đạt. `pnpm test:e2e` đạt 11/11: mới kiểm bảng ở checkout và pricing 320px, focus vùng cuộn, giữ query gói qua login, FAQ gia hạn và preview trực tiếp. Sau thêm link xem nhanh, locator cũ trùng các link trên catalog khi chuyển trang; đã dùng exact name cho link trên trang chi tiết, kiểm album/focus đạt lại. Đã xem screenshot so sánh ở 390px và cấu hình admin 390px, không tràn ngang. Bảng có chỉ dẫn vuốt đặt trước bảng. Một lượt chạy lint đồng thời lúc Playwright xóa test-results gặp ENOENT; chạy gate tuần tự sau browser gate đạt. Chưa kiểm trên điện thoại thật hoặc xác nhận giá/chính sách thương mại chính thức.

## Đa dạng bố cục và preview trong editor — 05/10/2026

Bổ sung minimal (thư mời, ảnh ngang) và cinematic (ảnh khổ lớn, bảng lời mời nền đặc), bốn mẫu mới trên màu hiện có. Kho seed có mười mẫu/năm layout; đã seed vào DB wedding dev và kiểm đếm mỗi layout hai mẫu. Không migration hay ghi đè catalog cũ. Editor có link mở mẫu đang chọn trong tab mới và nói rõ minh họa.

`pnpm check` đạt lint/typecheck/121 tests, `pnpm build` đạt; `pnpm test:e2e` đạt 11/11. Sáu viewport kiểm cả năm layout, tên dài, album, opening và không tràn ngang. Luồng mua chọn mẫu mới, giữ tên đã nhập và kiểm link preview, sau đó lưu/thanh toán/xuất bản/RSVP đạt. Đã xem ảnh minimal 390px, cinematic 390/1440px. Ảnh bìa khai báo sizes theo bố cục; cinematic dùng nền đặc cho bảng chữ nên không phụ thuộc độ sáng ảnh. Chưa thử trên điện thoại thật.

## Thiệp dễ đọc và lối tắt nội dung — 05/10/2026

Đổi nhãn tiếng Anh trên thiệp và quyền mẫu sang tiếng Việt. Thêm nút mở tức thì không chạy animation; Escape cũng bỏ qua, giữ focus/sự kiện mở nội dung. Điều hướng anchor tới lịch tiệc, RSVP, album và mừng cưới chỉ hiện mục có dữ liệu. Chữ nội dung/form 16px ở mọi viewport, giờ tiệc 18px; đoạn văn không còn opacity 0.8. Chữ phối màu đất đậm hơn, contrast trên nền card/tint vượt 4.5:1 (tint 4.72:1); các cặp màu chữ/card và chữ/tint còn lại đã tính đạt >4.5:1. Không phải chứng nhận WCAG toàn trang.

`pnpm check` đạt lint/typecheck/121 tests, `pnpm build` đạt; `pnpm test:e2e` đạt 12/12. Test mới xác minh mở bỏ hiệu ứng, trả focus, lối tắt lịch tiệc và chữ địa điểm 16px trên 320px; sáu viewport kiểm năm bố cục, form 16px, reduced motion, album và tên dài. Một rule mobile cũ ưu tiên cao khiến địa điểm vẫn 14px đã được sửa sau test thất bại. Đã xem lịch tiệc ở 390px. Thử CSS zoom 200% trên viewport 640px phát hiện countdown vượt 15px; sau co flex theo container, scrollWidth=innerWidth=640. Đây là mô phỏng CSS, chưa thay thế browser zoom native hoặc khảo sát người lớn tuổi/thiết bị thật. Cache Next local cũ từng phục vụ rule CSS trước sửa; đã chuyển cache sang `/tmp` và khởi động lại, xác minh local đọc đúng 16px.

## Hướng dẫn và hỗ trợ trước khi mua — 05/10/2026

Thêm `/support` cho người mua và khách mời, hướng dẫn tạo/xem nháp/thanh toán/xuất bản/chia sẻ/RSVP/mừng cưới, FAQ các lỗi thao tác và liên hệ lấy từ merchant đã lưu. Có liên kết từ footer, bảng giá và workspace khách. Giữ nội dung hỗ trợ cũ; khi chưa có phone/email trực tiếp hiển thị trạng thái chưa công bố. Không tạo cơ chế khôi phục mật khẩu hoặc hứa hoàn tiền chưa tồn tại.

`pnpm check` đạt lint/typecheck/121 tests, `pnpm build` đạt; `pnpm test:e2e` đạt 12/12. Luồng chính lưu liên hệ qua admin rồi mở trang hỗ trợ bằng trang không đăng nhập, kiểm tel/mailto và HTML không chứa ngân hàng/account name/number dịch vụ. Sáu viewport kiểm `/support` không tràn ngang, workspace vẫn thao tác được sau thêm liên kết. Sau bổ sung kiểm BIN không xuất trong HTML, chạy lại `customer buys` đạt 1/1. Không thay API mutation, payment hoặc public invitation guard.

Sau khi xem screenshot mobile trang hỗ trợ, tăng riêng đoạn văn liên hệ, giới thiệu, link và nút lên 16px để không kế thừa chữ nhỏ từ CSS chung. Browser local 390px xác minh computed font 16px, không tràn ngang; đã xem screenshot sau sửa. Chạy lại `pnpm test:e2e --grep 'responsive pages'` đạt 6/6 trên cả sáu viewport. `pnpm check && pnpm build` vẫn đạt 121 tests/lint/typecheck/build.

## Lịch riêng cho tiệc hai nhà — 05/10/2026

Mỗi tiệc có link lịch với ngày giờ và địa điểm riêng. Link ngày cưới chung chỉ dùng địa điểm của tiệc trùng đúng thời điểm; không gán địa điểm tiệc đầu tiên vào ngày khác. Timestamp UTC giữ đúng thời điểm từ giờ Việt Nam. Giờ kết thúc sau ba giờ được ghi rõ tạm tính trong mô tả lịch, không khẳng định thời lượng tiệc thật. Không truyền guest token.

`pnpm check` đạt lint/typecheck/122 tests, `pnpm build` đạt; `pnpm test:e2e` đạt 12/12. Test unit dùng 11:00 +07:00 và xác minh 04:00Z, title/location tiếng Việt, mô tả tạm tính. Browser xác minh hai link riêng ngày 14/02 và 13/02, tương ứng Hà Nội/Bắc Ninh, đồng thời năm layout ở sáu viewport không tràn ngang. Kiểm URL được tạo, chưa tạo sự kiện trong tài khoản Google Calendar thật.

## Chuyển động ảnh tham khảo OnePlus — 05/10/2026

- Đã quan sát Tri-Chips và Photography trên trang OnePlus thật bằng Chromium 1440×900, đối chiếu ảnh chụp trước/sau cuộn và sticky/transform trong DOM.
- `pnpm check`: lint, TypeScript, **122/122 bài kiểm tra**, 15 file, qua trên mã cuối.
- `pnpm build`: qua trên mã cuối.
- `pnpm test:e2e`: **13/13 ca Chromium** qua; sau điều chỉnh quan sát từng ảnh album độc lập, chạy lại hai ca album/bàn phím và ảnh theo cuộn: **2/2 qua**.
- Ca mới kiểm tra khung ảnh mở rộng theo vị trí cuộn và đổi ngay về ảnh tĩnh khi bật reduced motion trong phiên.
- Đã xem ảnh chụp thiệp Khoảnh khắc 1440×900 và 390×900: không cuộn ngang, ảnh nổi bật có tiến trình khung/zoom thực tế. Các viewport 320–1440 và năm layout được kiểm tra trong bộ E2E.
- Không xác minh hiệu năng trên điện thoại thật, Safari hay tích hợp production trong lượt này; không thêm thư viện hoặc sao chép ảnh/mã OnePlus.

## Chuyển cảnh hai ảnh và tương tác album — 05/10/2026

- `pnpm check`: lint, TypeScript, **122/122 bài kiểm tra** trong 15 file qua; `pnpm build` qua. Sau sửa selector của test cũ để kiểm tra cả hai ảnh, ESLint/TypeScript chạy lại qua.
- `pnpm test:e2e`: **15/15 ca Chromium qua** trên mã cuối. Lượt đầu 14 ca qua, một ca cũ lỗi strict locator vì nay có hai ảnh; đã sửa thành kiểm tra cả hai ảnh, không bỏ kiểm tra reduced motion.
- Hai ca mới kiểm tra chuyển cảnh đảo chiều khi cuộn ngược, cleanup nghiêng ảnh khi đổi reduced motion, vuốt bằng CDP touch thật, thao tác trước/sau nhanh, Escape và focus phục hồi. Các ca responsive 320–1440 và cả năm layout tiếp tục qua.
- Xem trực tiếp ảnh chụp chuyển cảnh desktop 1440×900/mobile 390×900: khung ở top 72px tránh thanh preview, không cuộn ngang. Trên mobile đoạn cuộn rút xuống 125svh; JavaScript tắt vẫn là ảnh tĩnh, cảnh phụ không hiện và không cuộn ngang.
- Kiểm tra lightbox thực tế: ArrowRight chạy wedding-photo-next, ArrowLeft chạy wedding-photo-previous. Reduced motion không chạy animation ảnh.
- Nguồn nghiên cứu thêm OxygenOS/Design: trang thật OnePlus bằng Chromium, ảnh chụp và transform/opacity trong DOM. Không xác minh Safari hoặc điện thoại vật lý; không tuyên bố hiệu năng production.

## Ảnh cưới stock mới — 05/10/2026

- Đã xem ba ứng viên ảnh thật, chọn Martin Baron/Unsplash; đối chiếu trang nguồn và giấy phép, ghi credit trong public/images/CREDITS.md. File mới 1600×2400 JPEG, khoảng 429 KiB.
- `pnpm check`: lint, TypeScript, **122/122 bài kiểm tra**, 15 file qua. `pnpm build`: qua. `pnpm test:e2e`: **15/15 ca Chromium qua**, gồm sáu viewport và năm bố cục.
- Kiểm tra thực tế sau restart dev: 390×900 và 1440×900 dùng URL stock mới, ảnh decode thành công và không cuộn ngang. Cinematic mobile dùng ảnh relative 420px phía trên panel, thấy rõ hai khuôn mặt; desktop giữ ảnh nền toàn khung. Đã xem ảnh chụp cả hai.
- Tên asset mới tránh cache stock cũ; không đổi DB, URL ảnh upload, API hoặc guards. Không xác minh thiết bị vật lý/Safari hay triển khai production trong lượt này.

### Chương ảnh có phối cảnh — 05/10/2026

- `pnpm check`: ESLint, TypeScript và 122/122 tests đạt; lint lại các file TS/TSX sau bổ sung regression đạt.
- `pnpm build`: đạt trên CSS cuối, gồm khung absolute cho ảnh trang trí khi reduced motion.
- `pnpm test:e2e`: 15/15 Chromium đạt (3.4 phút), sáu viewport 320–1440px và năm layouts; regression kiểm tra orbit hiện ở đầu, biến mất giữa cảnh, cuộn ngược khôi phục và reduced motion ẩn orbit.
- Xem ảnh chụp runtime tại 390/1440px ở tiến trình 0, .45, .95: phối cảnh hai tấm ảnh, mở rộng và wipe; không tràn ngang. Các ảnh chụp kiểm tra nằm `/tmp/wedding-depth-final-*.png`, không phải tài sản sản phẩm.
- Chưa xác minh Safari hoặc tốc độ trên điện thoại vật lý.

### Font và dấu tiếng Việt — 06/10/2026

- `pnpm check`: ESLint, TypeScript và 122/122 tests đạt. `pnpm build`: đạt với font local, không phụ thuộc tải Google lúc build.
- `pnpm test:e2e`: 15/15 Chromium đạt (2.9 phút), gồm sáu viewport 320–1440px, năm layouts, mở thiệp/album/reduced motion và các luồng khách/admin.
- fontTools kiểm tra cmap của cả sáu WOFF2 có các ký tự tiếng Việt nhiều dấu và combining tone marks, giữ toàn bộ glyph khi chuyển từ TTF.
- Runtime 390/1440px: document.fonts ghi nhận bodyFont normal 400/600/700 và headingFont variable normal/italic loaded; computed font-family đúng, không tràn ngang. Xem ảnh tên dài “Nguyễn Hoàng Bảo Anh / Trần Thị Ngọc Ánh”, màn mở và các tiêu đề sau animation: dấu hiển thị rõ. Ảnh kiểm tra tạm `/tmp/wedding-font-*.png`.
- Không kết luận toàn bộ máy/OS đã được thử; Safari và thiết bị vật lý chưa xác minh.

### Nhạc nền và chương câu chuyện — 06/10/2026

- `pnpm check`: exit 0, ESLint/TypeScript và 124/124 tests (16 files) đạt; thêm kiểm tra chỉ chấp nhận đúng bản nhạc local, từ chối local path khác/traversal/HTTP/javascript.
- `pnpm build`: exit 0 trên CSS cuối cùng, gồm thanh nhạc mobile thu gọn.
- `pnpm test:e2e`: 17/17 Chromium đạt (2.7 phút), sáu viewport 320–1440px/năm layouts. Hai bài mới phát file MP3 thật: mở kèm nhạc, currentTime tăng, volume 0.15, pause, reload/skip im lặng rồi bật thủ công; 404 nhạc có thông báo/thử lại, thiệp vẫn mở và trả focus đúng.
- Lượt E2E đầu bị lỗi nội bộ Turbopack HMR sau chỉnh CSS, đã dừng; giữ cache cũ trong /tmp và chạy toàn bộ lại bằng .next-e2e sạch. Chỉ kết quả lượt sạch được dùng để báo đạt.
- Manual runtime 390/1440px: audio paused=false, thời gian tăng, duration 43.04975s, volume 0.35; xem screenshot chương câu chuyện/lịch tiệc; không tràn ngang, không có cảnh báo hydration trong hai trang kiểm tra. Thanh nhạc mobile rộng 92px, settings/slider nằm trong viewport; mô phỏng visibilitychange hidden dừng audio. Ảnh kiểm tra `/tmp/wedding-zen-*.png`.
- Đúng thiệp ZenLove trả HTML công khai 200 nhưng trình duyệt tự động bị redirect, chưa xác minh toàn bộ animation live của thiệp tham khảo. Safari/autoplay trên iPhone vật lý và chất lượng âm thanh loa thực chưa kiểm chứng.

### 06/10/2026 — ảnh studio và cửa mở mềm hơn

Thay alias ảnh stock mặc định bằng hai ảnh chụp thật cùng cặp đôi của Nam Nguyen (nguồn/Unsplash License ở public/images/CREDITS.md), giữ URL ảnh upload. Cinematic desktop tách bảng chữ khỏi vùng ảnh; opening dùng phối cảnh chung, dấu sáp và hoa SVG, chuyển động 1870ms tổng cộng. `pnpm check` exit 0: 124/124 tests, 16 files; `pnpm build` exit 0. Log: /tmp/wedding-refined-check.log và /tmp/wedding-refined-build.log. Playwright thủ công trên dev tại 320×740, 390×844, 844×390 và 1440×1000: không lỗi page/hydration, không tràn ngang, hero/album tải đầy đủ, nhạc phát sau bấm mở, reduced motion + Escape chuyển focus về H1. Đã xem screenshot opening mobile/landscape và hero desktop; ảnh /tmp/wedding-final-opening-_.png, /tmp/wedding-final-photo-_.png. Chưa kiểm tra thiết bị iPhone/Safari thật.

Browser gate `pnpm test:e2e` exit 0: 17/17 Chromium tests (3.6 phút), gồm sáu viewport/all five layouts, opening/focus/no-JS, scroll ảnh, album swipe, nhạc/volume/skip và retry khi MP3 lỗi. Log /tmp/wedding-refined-e2e.log. Local dev được chạy lại ở port 3200; không triển khai production.

### 06/10/2026 — hộp quà mở QR và thêm lá rơi

Mừng cưới đổi sang hộp quà details/summary mở nắp và hiện các QR có sẵn theo tài khoản cặp đôi. Preview trống tài khoản có hai QR local chỉ mã hóa thông báo minh họa, ghi rõ không dùng chuyển khoản. Tăng hiệu ứng trang trí từ 7 lên 24 lá/cánh, nhịp deterministic, giữ reduced motion/print và pointer-events none. `pnpm check` exit 0 (124/124 tests, 16 files), `pnpm build` exit 0; log /tmp/wedding-gift-check.log và /tmp/wedding-gift-build.log. Playwright thủ công ở 390/1440px: hộp mở hai thẻ, không tràn ngang, DOM có 24 lá. Đã xem ảnh /tmp/wedding-gift-closed-390.png và /tmp/wedding-gift-open-1440.png. Context no-JS vẫn mở hộp và đọc hai thẻ QR. Không tạo tài khoản nhận tiền cho demo, không xác minh chuyển khoản ngân hàng thật.

`pnpm test:e2e` exit 0: 18/18 Chromium tests (2.6 phút), log /tmp/wedding-gift-e2e.log. Luồng thiệp thật mở hộp trước khi kiểm tra hai tài khoản/QR lỗi; test mới xác nhận demo có hai QR tải được, đóng/mở qua Enter/Space, focus giữ trên summary và không tràn ngang. Local dev port 3200 được chạy lại; không deploy production.

### 07/10/2026 — responsive admin và sidebar

Áp dụng skill UI UX Pro Max source `/home/ccgram/my_task/.agents/skills/ui-ux-pro-max/SKILL.md`; focused UX search responsive navigation/sidebar (tránh tràn ngang, focus bàn phím) và Next.js active links (Link/pathname), đối chiếu installed Next docs layouts/client boundary/usePathname. Sidebar desktop 248px, drawer native dưới 901px, active route; bộ lọc/select đồng bộ font/màu; bảng đơn/khách/thiệp/audit thành thẻ <=600px. Form/mẫu/gói/stats/cấu hình co theo nội dung. Không đổi quyền/DB/validation mutation.

`pnpm check` exit 0: 124/124 tests, 16 files; `pnpm build` exit 0. Log /tmp/admin-sidebar-check.log, /tmp/admin-sidebar-build.log. Playwright thủ công đăng nhập bằng cấu hình local hiện có, đọc cả 8 trang admin ở 320,375,768,1024,1440px: không tràn ngang hoặc page error, drawer Escape trả focus về nút mở; drawer 375px rộng 320px ở x=0. Đã xem screenshot /tmp/admin-home-375.png, /tmp/admin-home-1440.png, /tmp/admin-orders-375.png, /tmp/admin-drawer-final-375.png. Dev dùng canonical URL đã được chủ cấu hình, không đổi allowlist origin. Không kiểm tra Safari/iPhone thật hay production deploy.

Sau khi bổ sung accessible name chính xác cho dropdown trạng thái đơn/tài khoản, `pnpm check` exit 0 (124/124) và `pnpm build` exit 0, log /tmp/admin-sidebar-check-final.log và /tmp/admin-sidebar-build-final.log. Lần browser đầu phát hiện nhãn select bị gộp với option; lần thứ hai phát hiện giả định sai trong test Shift+Tab của dialog native, sửa test dùng Tab tới mục đầu và Escape/return-focus. Lần hoàn chỉnh cuối `pnpm test:e2e` exit 0: 19/19 Chromium, log /tmp/admin-sidebar-e2e-complete.log. Test admin xác nhận active sidebar, lọc paid/tên khách/xóa bộ lọc, drawer chọn trang, focus khi Tab/Escape, reduced motion, tự đóng khi resize, 7 trang ở 320/375/844-landscape/1024px không tràn ngang. `eslint e2e/wedding.spec.ts` exit 0 sau sửa test. Dev port 3200 chạy lại với cấu hình canonical hiện có; không deploy production.

### 07/10/2026 — dropdown trạng thái đơn dùng component template

Port `src/components/kit/dropdown-field.tsx` và `src/components/ui/select.tsx` từ my_task; dùng Base UI 1.8.0 giống template, đổi icon sang Lucide và nối màu Hỷ Studio trong cả popup portal. Ô trạng thái đơn có tick, highlight, mở/đóng bằng bàn phím, Escape trả focus, chuyển động giảm theo preference. Hidden input giữ form GET và reset lựa chọn khi xóa bộ lọc.

`pnpm check` exit 0: 124/124 tests, lint/typecheck; `pnpm build` exit 0. ESLint các component/trang/test và typecheck sau chỉnh test đều exit 0. `pnpm test:e2e` exit 0: 19/19 Chromium (2.8m), bao gồm chọn paid, lọc/xóa, mở bằng ArrowDown, Escape/focus và popup không tràn 375px. Logs `/tmp/admin-dropdown-check.log`, `/tmp/admin-dropdown-build.log`, `/tmp/admin-dropdown-e2e.log`. Playwright thủ công trên canonical dev URL tại 320/375/1440px xác nhận menu nằm trong viewport, hidden value paid và rỗng sau xóa, không page errors; đã xem screenshot `/tmp/admin-dropdown-375.png` và `/tmp/admin-dropdown-1440.png`. Không deploy production hoặc kiểm tra Safari/iPhone thật.

### 07/10/2026 — dropdown trạng thái tài khoản dùng template

`/admin/customers` dùng chung DropdownField với đơn dịch vụ, giữ GET all/active/disabled và remount theo trạng thái URL. `pnpm check` exit 0 (124/124, lint/typecheck), `pnpm build` exit 0, `pnpm test:e2e` exit 0 (19/19 Chromium, 2.8m). Luồng khách xác nhận lọc disabled không có tài khoản, active tìm đúng khách kiểm thử, all giữ hidden input. Logs `/tmp/customer-dropdown-check.log`, `/tmp/customer-dropdown-build.log`, `/tmp/customer-dropdown-e2e.log`. Playwright thủ công tại 320/375/1440px xác nhận popup trong viewport, chọn disabled, submit và reset all, không page errors; đã xem screenshot `/tmp/customer-dropdown-375.png`. Không thay quyền/mutation hoặc deploy production.

### 07/10/2026 — album sáu ảnh và nhạc cho mẫu cũ

Xem screenshot tham khảo người dùng; xác nhận demo DB `thiep-mau` còn ba ảnh stock cũ và musicUrl rỗng. Thêm bốn JPEG thật Nam Nguyen, cùng cặp đôi với studio/moment, credit Unsplash; DEMO_CONTENT có sáu ảnh. Demo legacy đúng ba ảnh được nâng lúc render; nhạc demo rỗng dùng Lời hẹn. Không ghi DB hay thay album/nhạc khách. Album hai cột so le, ảnh ngang rộng xen kẽ, lightbox/swipe/motion hiện có giữ nguyên.

`pnpm check` exit 0: 126/126 tests, 17 files, lint/typecheck; regression bảo vệ album khách/demo tùy chỉnh/album rỗng. `pnpm build` exit 0. `pnpm test:e2e` exit 0: 20/20 Chromium (2.7m), thêm luồng nhạc cho `/w/thiep-mau` bên cạnh preview: phát sau mở, time tiến, tắt/âm lượng, skip yên lặng và bật thủ công. Logs `/tmp/wedding-media-check.log`, `/tmp/wedding-media-build.log`, `/tmp/wedding-media-e2e.log`. Playwright dev đọc demo thực chưa có nhạc trong DB và preview tại 375/1440px: có sáu ảnh, nhạc currentTime >2s, ảnh cuối lightbox tải thành công, không tràn ngang/page error. Đã xem screenshot `/tmp/wedding-media-w-thiep-mau-375.png`; không deploy production hoặc kiểm tra thiết bị iOS thật.

### 07/10/2026 — ảnh Câu chuyện khác khung cổng

Ảnh Câu chuyện chuyển từ vòm sang ảnh in giấy chữ nhật nghiêng -3 độ và ảnh nhỏ so le +7 độ, ưu tiên ảnh album khác ảnh bìa; một ảnh/rỗng vẫn có fallback. Giữ khung đầu thiệp và animation cuộn/reduced motion. `pnpm check` exit 0: 126/126; `pnpm build` exit 0; `pnpm test:e2e` exit 0: 20/20 Chromium (2.6m), gồm responsive, story scroll/reduced motion, album và nhạc. Sau kiểm tra browser, tinh chỉnh CSS bỏ caption bị ảnh nhỏ che và tăng vùng ảnh; Playwright thủ công kiểm tra lại 320/375/1440px không tràn ngang/page errors, border radius 2px, hai ảnh, đã xem screenshot `/tmp/story-print-375.png`; build cuối exit 0. Logs `/tmp/story-print-check.log`, `/tmp/story-print-e2e.log`, `/tmp/story-print-build-final.log`, `/tmp/story-print-review-clean.log`. Dev cache cũ gây preview 404 dù catalog DB hợp lệ; di chuyển cache .next sang /tmp và khởi động lại đã trả 200, không sửa DB. Không deploy production.

### 07/10/2026 — áp dụng dropdown template toàn ứng dụng

Rà soát `rg '<select' src`: thay tất cả select còn lại bằng DropdownField (editor mẫu/nhạc/ngân hàng; admin catalog/merchant/report/chart; RSVP attendance/event/party size). BankSelect dùng cùng template, giữ BIN chưa nằm trong danh mục; hidden input giữ FormData và controlled callbacks cập nhật editor/chart/attendance. Nhãn dài xuống dòng trong popup, trigger ellipsis, danh sách dài cuộn.

`pnpm check` exit 0: 126/126 tests, 17 files, lint/typecheck; `pnpm build` exit 0. Sau chỉnh test, ESLint e2e exit 0. Lần đầu phát hiện selector biểu đồ `.revenue-chart svg` gộp cả icon dropdown; đổi test tìm biểu đồ theo role/name; sửa giá trị palette trong test về midnight đúng catalog. Lần hoàn chỉnh `pnpm test:e2e` exit 0: 20/20 Chromium (2.9m). Luồng chính kiểm tra đổi mẫu/link preview, chế độ nhạc, ngân hàng hai nhà/dịch vụ, lưu và QR, attendance ẩn/hiện party size, chọn tiệc/party size/gửi RSVP, đổi kỳ báo cáo; admin test chọn category/palette/layout và FormData đúng. `rg '<select|selectOption' src e2e` không còn kết quả. Logs `/tmp/all-dropdown-check.log`, `/tmp/all-dropdown-build.log`, `/tmp/all-dropdown-e2e-complete.log`, `/tmp/all-dropdown-e2e-lint-final.log`.

Playwright dev kiểm tra RSVP 320/375px, attendance từ chối ẩn số người; menu ngân hàng có cuộn, chọn BIN 970436; form mẫu nhận Hiện đại/midnight/cinematic, không submit dữ liệu vào DB. Không page errors; đã xem `/tmp/all-dropdown-rsvp-320.png`, `/tmp/all-dropdown-bank-375.png`. Popup ngân hàng cao 320px; listbox nội dung dài bên trong không phải kích thước popup. Không thay authorization/payload, không deploy production.

### 07/10/2026 — spotlight và lớp ảnh từ tham khảo Layers

Xem public preview Cards Cascade/Carousel Spotlight; viết HomeMotion riêng với spotlight theo pointer, parallax native scroll, reveal thẻ mẫu từ chiều sâu và nâng photo chapter lên tối đa bốn lớp ảnh. Không dùng asset/source premium. `pnpm check` exit 0 (126/126 tests, 17 files, lint/typecheck); `pnpm build` exit 0; ESLint e2e exit 0; `pnpm test:e2e` exit 0 (21/21 Chromium, 2.9m). Test mới xác nhận pointer tạo ánh sáng, reduced motion xóa class/biến tương tác và trang 375px không tràn. Logs `/tmp/layers-check.log`, `/tmp/layers-build.log`, `/tmp/layers-e2e.log`.

Playwright thủ công ở 1440/375px: homepage có spotlight, preview mở kèm nhạc, bốn ảnh phụ với transform 3D, không page errors/overflow. Đã xem screenshots `/tmp/layers-home.png`, `/tmp/layers-album.png`, `/tmp/layers-depth-mobile.png`. Khởi động lại dev 3200 với cache mới sau build; preview trả 200. Không deploy production; chưa kiểm tra Safari/iPhone thật.

### 07/10/2026 — hộp quà trên demo công khai

Sửa điều kiện mục/link Mừng cưới từ preview && isDemo thành isDemo: `/w/thiep-mau` không có tài khoản cũng có hộp hai QR minh họa như preview. Không thay thiệp khách hoặc dữ liệu ngân hàng. `pnpm check` exit 0 (126/126, 17 files, lint/typecheck), `pnpm build` exit 0, `pnpm test:e2e` exit 0 (22/22 Chromium, 3.3m). Regression mở hộp, hai QR tải, reduced motion, bàn phím đóng trên cả preview và public demo. Logs `/tmp/gift-demo-check.log`, `/tmp/gift-demo-build.log`, `/tmp/gift-demo-e2e.log`. Playwright dev 375px mở hộp public có hai thẻ, đã xem `/tmp/gift-demo-public.png`. Dev 3200 khởi động lại với cache mới; không deploy production.

### 07/10/2026 — hộp quà tưng bừng và QR modal

Thay details inline bằng button/native dialog: backdrop blur, nắp bật/glow/40 confetti và trái tim, QR reveal sau nhịp mở, hai cột desktop/một cột cuộn riêng mobile, đóng nút/Escape/backdrop, focus trap/return focus, khóa và khôi phục cuộn nền. QR thật/copy/retry và QR demo giữ nguyên. Reduced motion bỏ animation.

Lần E2E đầu phát hiện Math.sin có sai số chuỗi CSS giữa Node và Chromium; dừng chạy, làm tròn tọa độ nguyên và thêm bắt console hydration trong test hai route. `pnpm check` cuối exit 0 (126/126, 17 files, lint/typecheck), `pnpm build` cuối exit 0; `pnpm test:e2e` cuối exit 0 (22/22 Chromium, 3.2m), log không có hydrated. Luồng QR thật xác nhận dữ liệu/fallback tải lỗi rồi đóng modal trước RSVP; demo hai route xác nhận QR, autofocus close, Escape/return focus, mở lại reduced motion không animation, backdrop đóng. Logs `/tmp/gift-modal-check-final.log`, `/tmp/gift-modal-build-final.log`, `/tmp/gift-modal-e2e-final.log`.

Playwright dev 1440/375px mở hộp, xem ảnh burst/modal, không page errors; modal mobile width347/height731 và nội dung cuộn1403, Escape trả focus. Đã xem screenshots `/tmp/gift-modal-burst.png`, `/tmp/gift-modal-desktop.png`, `/tmp/gift-modal-mobile.png`; sửa vị trí hộp tránh che eyebrow và kiểm tra lại. Dev 3200 đã khởi động lại từ cache mới sau build; không deploy production hoặc kiểm tra iPhone thật.

### 08/10/2026 — nâng cấp landing studio

- Tham khảo trực tiếp preview công khai GetLayers Showcase Equator và hướng Carousel Spotlight; xây showcase ảnh ghim theo cuộn và hình quạt bằng CSS/RAF riêng, không dùng source/prompt Premium. Bổ sung thẻ lợi ích, FAQ native details, typography, khoảng cách và CTA.
- `pnpm check`: exit 0, 126/126 tests trong 17 files; lint có một warning đã tồn tại tại `music.tsx:55`, không có lỗi. `pnpm build`: exit 0.
- `pnpm test:e2e`: lượt gate cuối exit 0, **23/23 passed (3.4m)**. Trước đó đã sửa test đọc vị trí trước khi smooth scroll xong bằng instant scroll. Một lượt có timeout 120s ở luồng nghiệp vụ dài nhất; retry riêng exit 0, sau đó chạy lại full gate và tất cả đều đạt. `pnpm exec tsc --noEmit` trên test cuối: exit 0.
- Manual Chromium ở 375/768/1024/1440 px: ảnh hero decode, không tràn ngang; xem screenshot và chỉnh căn giữa album mobile. Kiểm tra pageerror/console và hydration: không lỗi trong landing review. Tắt JavaScript ở public URL: HTTP 200, h1, năm ảnh và bốn FAQ vẫn hiện; không tràn ngang.
- Native FAQ hỗ trợ Enter; scroll làm thay đổi transform ảnh; reduced motion xóa biến cuộn, bỏ sticky và giữ nội dung đọc được. Regression mới chứng minh các hành vi này.
- Ảnh bằng chứng: `docs/previews/home-desktop.png`, `home-mobile.png`, `home-showcase.png`. Dev preview port 3200 đã khởi động lại sau build bằng cache mới. Không deploy production; chưa kiểm tra Safari/iPhone thật.

### 08/10/2026 — hoàn thiện 10 mẫu thiệp trong catalog

- Mười cặp layout/palette đã có composition riêng cho thiệp đầy đủ và thumbnail, được chọn thống nhất tại `src/lib/invitation-designs.ts`. Không đổi schema/API/price/auth hoặc nội dung cá nhân. Admin đổi layout/palette vẫn được áp dụng; tổ hợp khác dùng fallback theo layout.
- `pnpm check`: exit 0, **126/126 tests, 17 files**. `pnpm build`: exit 0. `pnpm test:e2e` lượt cuối: exit 0, **25/25 passed (3.9m)**. Lượt trước 24 passed, một bài quản trị gặp Chromium `ERR_INSUFFICIENT_RESOURCES`; chạy lại full không có browser manual song song đã qua.
- Regression mới duyệt cả **10** preview: xác nhận **10** signature bố cục desktop khác nhau, hai gia đình/hai tiệc/sáu ảnh, RSVP demo disabled, không hydration/pageerror, không tràn ngang ở 1280 và 375 px; mở/đóng hai QR minh họa, trả focus cho trigger ở cả hai kích thước.
- Regression mở thư và kéo rèm kiểm tra keyframes chuyển động thực, dialog đóng, focus về h1 và body được trả quyền cuộn. Các bài hiện có về mở cửa, music gesture/pause/quiet skip/retry, album swipe/reduced motion vẫn qua.
- Manual Chromium: xem cả 10 hero desktop/mobile và catalog 10 thumbnail; decode cover image, xem câu chuyện Lời yêu/Song hỷ, sửa foliage và panorama tràn ngang. Script duyệt 19/20 viewport-case xong rồi timeout đợi hydration của lượt cuối; kiểm tra riêng Bên nhau 375 px qua và không tràn/pageerror. Không dùng lượt manual dang dở để khẳng định cả script exit 0; full regression 10 mẫu trên hai kích thước là bằng chứng cuối.
- Ảnh catalog: `docs/previews/templates-catalog.png`. Dev port 3200 đã khởi động lại sau build với cache mới. Chưa kiểm tra Safari/iPhone thật; không deploy production.

## Câu chuyện và album theo thiết kế — 08/10/2026

- `pnpm check`: lint không lỗi (còn cảnh báo cleanup ref có sẵn ở Music), TypeScript và **126/126 bài test, 17 file** qua.
- `pnpm build`: production build thành công.
- Rà soát ảnh chụp câu chuyện/album của mười mẫu ở desktop 1280px; kiểm tra mobile 375px không cuộn ngang. Bố cục câu chuyện khác cấu trúc, album khác hình học/tương tác.
- Test scroll chapter cũ được chuyển sang Lời yêu vì chương gom ảnh nay thuộc riêng thiết kế này. Khoảnh khắc dùng album sticky xếp lớp. Thêm kiểm tra chuyển trang Thư tình (mở đúng ảnh/focus return), spotlight Đêm sao và filmstrip Lời hẹn; bài kiểm tra mười mẫu so sánh cây cấu trúc câu chuyện thay vì chỉ chữ/màu.
- Truy cập tham khảo: OnePlus 15 và public preview Cards Cascade trên Layers mở được; Zenlove chuyển sang trang kiểm tra truy cập từ máy thử nghiệm, không có chứng cứ đối chiếu lại toàn bộ trang đó trong lượt này.
- Kiểm tra cuối **29 kịch bản Chromium** trên DB/cổng test riêng: lượt đầy đủ 28 bài qua; bài accordion thất bại vì test dùng programmatic focus trong ngữ cảnh chuột thay cho Tab. Đổi test sang Tab thật, `pnpm test:e2e --last-failed` chạy lại 1/1 qua (15,7 giây). Bài mới đo chiều rộng trên từng frame trong 1,4 giây animation đầu thiệp của đủ mười mẫu ở 390×844.
- Lượt đầu bắt được zoom ảnh hero Khoảnh khắc làm tràn ngang tạm thời; đã giới hạn hiệu ứng trong khung cảnh. Class ảnh câu chuyện được tách khỏi class trang chủ để tránh min-height cũ ép ảnh mobile rộng hơn cột. Sau sửa, kiểm tra/build qua; kết quả từng lượt E2E được ghi ở trên.
- Một lượt chạy lại bị ENOSPC khi ghi cache; dọn các bản `.next` tạm đã cũ trong `/tmp` và cache E2E rồi chạy đủ 27 bài thành công. Không xóa dữ liệu ứng dụng/ảnh tải lên.

- Ảnh ngang được nhận diện bằng kích thước ảnh đã tải (ảnh demo có cấu hình ban đầu), dành khung rộng hoặc object-fit contain trong album sách/spotlight/cinema. Thêm test ảnh ngang Vườn thương và Thư tình. Accordion được kiểm tra chiều cao, mở rộng bằng hover/Tab, mở đúng lightbox và trả focus. Khung ảnh bên trong picture giữ đúng yêu cầu Image fill khi nút bên ngoài sticky.
- Ảnh đối chiếu cuối: `docs/previews/template-story-compositions.jpg` và `docs/previews/template-album-compositions.jpg`.

## Bìa và nhịp đọc riêng — 08/10/2026

Tự đặt câu hỏi nghiệm thu:

- **Bỏ màu đi có nhận ra mẫu không?** Hero dùng mười cây HTML khác nhau: vòm, báo hỷ, masthead báo, quỹ đạo, scrapbook, letterhead, phong bì, màn phim, diptych và chân dung/lời hứa. E2E so sánh cây DOM thay vì chỉ chữ/màu/CSS.
- **Toàn trang có còn cùng một nhịp đọc không?** Mỗi mẫu có thứ tự riêng cho countdown/câu chuyện/lịch tiệc/album trong DOM; điều hướng và các anchor chính giữ nguyên. RSVP ở sau phần thông tin và album.
- **Ảnh có phải của khách không?** Hero nhận cover và album đã lưu, không suy diễn mốc chuyện tình hoặc thay nội dung khách. Diptych chọn ảnh album khác cover, fallback cover nếu không có ảnh khác.
- **Animation có ảnh hưởng người dùng bàn phím/ít chuyển động không?** Opening vẫn dùng native dialog, focus h1 sau đóng, Escape/skip và reduced motion bỏ animation; yêu cầu nhạc nằm trong click trước await.
- **Có thể gọi là hoàn thành 95% một cách đo được không?** Không có thang chấm khách quan cho tỷ lệ này. Báo cáo các tiêu chí và kết quả kiểm tra thực tế thay cho số phần trăm tự ước lượng.

`pnpm check`: lint không lỗi (cảnh báo ref Music có sẵn), TypeScript và 126/126 test qua. `pnpm build`: thành công. Bằng chứng trình duyệt và ảnh đối chiếu được bổ sung sau lượt kiểm tra cuối.

Lượt đầy đủ `pnpm test:e2e`: **29/29 qua (4,5 phút)**. Rà soát Chromium mười bìa desktop, chụp mobile 375px và kiểm tra 320/375/844px: 30/30 trường hợp không tràn ngang, không pageerror; ghi nhận mười thứ tự DOM khác nhau. Ảnh đối chiếu: `docs/previews/template-hero-compositions.jpg`.

Đối chiếu ảnh phát hiện bìa Lời hẹn cắt ảnh chân dung quá nhiều trong khung panorama. Đã chọn ảnh ngang từ album demo; các bìa demo còn lại phối ảnh theo phong cách (nghi lễ/vườn/polaroid/phim). Chỉ áp dụng khi là demo, cover vẫn là ảnh stock mặc định và ảnh được chọn đã có trong album; cover khách hoặc cover demo đã tùy chỉnh giữ nguyên. Gate cuối chạy lại check/build và nhóm E2E liên quan sau điều chỉnh ảnh.

Sau chỉnh ảnh: `pnpm check` 126/126 qua; `pnpm build` thành công; nhóm E2E liên quan **7/7 qua (1,3 phút)** gồm mười mẫu, intro mobile, letter/curtain, nhạc và QR. Manual Chromium cuối chạy đủ mười mẫu, 30/30 kiểm tra chiều rộng và không pageerror; ảnh đối chiếu được chụp lại. Dev preview port 3200 khởi động từ cache mới. Chưa kiểm tra Safari/iPhone thật; chưa deploy production.

Rà soát mobile bổ sung phát hiện panorama vẫn cắt mép người ở 375px. Khung mobile Lời hẹn đổi sang tỷ lệ 3:2 và object-fit contain; ảnh chụp cuối giữ cả hai người. E2E mười mẫu thêm assertion object-fit contain ở 375px và chạy lại **1/1 qua (32 giây)**. Manual cuối đủ mười mẫu/30 viewport-case qua, không pageerror. Gate check/build được chạy lại sau chỉnh CSS.
