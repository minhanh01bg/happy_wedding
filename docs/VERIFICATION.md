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

## Hoàn thiện lịch tiệc và mở đầu — 10/10/2026

- Kiểm kê: catalog hiện có mười mẫu, không phải 29 mẫu. 29 là số bài E2E ở lượt trước. Đã hỏi người dùng bộ/danh sách 29 mẫu cần đối chiếu; chưa đủ dữ liệu để xác nhận 29 mẫu riêng biệt. Các thay đổi và bằng chứng dưới đây áp dụng cho mười mẫu hiện có.
- Chromium mở trực tiếp bốn mẫu sang trọng/nhẹ nhàng/Korea/hiện đại của Thắng VN và thiệp Mạnh Hùng–Phạm Hằng; quan sát nội dung công khai và ảnh chụp. Zenlove bị redirect tới kiểm tra truy cập; Bac–Minh có metadata nhưng body chưa render trong thời gian quan sát. Không dùng hai lượt đó để khẳng định đã xem đầy đủ giao diện. RESEARCH ghi matrix áp dụng/khoảng trống.
- `pnpm check`: 129/129 test, 18 file qua; lint không lỗi (còn cảnh báo ref Music có sẵn), TypeScript qua. Ba test mới xác minh giờ VN qua ranh giới tháng UTC, ngày nhuận và tháng sáu hàng bắt đầu Chủ nhật.
- `pnpm build`: thành công.
- Manual Chromium đủ mười mẫu: chụp mở đầu và lịch tiệc desktop/mobile; kiểm tra 320/375/844px, **30/30 không tràn ngang**, không pageerror. Lượt đầu timeout chờ load audio ở Thư tình; chuyển điều kiện chờ sang DOMContentLoaded, chạy lại đủ mười mẫu exit 0. Screenshot đặt caret initial để tránh công cụ chụp ảnh đổi style input trong khi hydration.
- Đã sửa thêm độ tương phản nút skip trên màn giấy/thư/đêm, và nhịp trung gian của animation cửa. Thời gian/date/maps/calendar đọc dữ liệu thật; không lấy timeline/trang phục của thiệp tham khảo để điền cho khách.
- Ảnh đối chiếu: `docs/previews/template-event-compositions.jpg` và `docs/previews/template-opening-compositions.jpg`. Bài E2E mười mẫu bổ sung so sánh mười cây DOM lịch tiệc, hai artwork mở đầu và ngày cưới/lịch tháng đúng dữ liệu demo.

- Lượt đầy đủ `pnpm test:e2e`: **29/29 qua (5,3 phút)** trên DB/cổng E2E riêng. Sau đối chiếu CSS phát hiện global cũ ẩn mọi SVG của Song hỷ/Đêm sao: thêm rule scoped cho artwork mới và assertion SVG thực sự visible trong bài mười mẫu. Nhóm opening/mười mẫu và check/build được chạy lại sau sửa cuối này.

- Gate cuối sau sửa SVG: `pnpm check` 129/129 qua, `pnpm build` thành công; `pnpm test:e2e --grep 'all ten catalog|letter and curtain|opening doors'` **3/3 qua (1,0 phút)**. Manual chụp lại đủ mười mẫu từ dev cache mới, 30/30 viewport-case qua, không pageerror; cập nhật cả hai ảnh đối chiếu. Preview port 3200 hoạt động. Chưa kiểm tra Safari/iPhone thật, không deploy production.

## Gia cố bảo mật 22/10/2026

Quyết định tại [ADR 0005](adr/0005-security-hardening-2026-10.md). Mỗi mục là một commit riêng.

- **Bỏ qua xác thực trang admin qua RSC (nghiêm trọng).** Trước sửa: `curl -L -H 'RSC: 1' -H 'Next-Router-State-Tree: <cây admin/plans>' -H 'Cookie: pos_session=bogus' /admin/audit` trả 200 kèm các dòng `settings.save` thật; tương tự customers/orders/settings/invitations. Sau sửa: cookie giả nhận `NEXT_REDIRECT;replace;/login` và 0 dòng dữ liệu; phiên hợp lệ vẫn nhận 5 dòng. `tests/server/auth/require-admin-page.test.ts`: không cookie/token giả → redirect, owner/manager qua, role ngoài danh sách → redirect, và test tĩnh mọi admin page gọi `requireAdminPage` đầu tiên.
- **Timing oracle đăng nhập khách.** Trước sửa, số chưa đăng ký bỏ qua scrypt (N=16384) nên phản hồi nhanh hơn rõ rệt. Sau sửa, `tests/server/customer-auth/password.test.ts` đo ba lần verify cho hash thật và cho tài khoản không tồn tại; nhánh không tồn tại tốn thời gian tương đương (>40% nhánh thật, thực tế ~100%).
- **Cờ Secure cookie khách.** `tests/server/customer-auth/password.test.ts` xác minh HTTPS trực tiếp và qua `x-forwarded-proto` đều Secure, HTTP khớp chính sách admin; login/logout dùng chung hàm.
- **DoS/log flooding qua `/api/csp-report`.** Trước sửa route gọi `request.json()` không giới hạn, không rate-limit và ghi nguyên chuỗi dài vào log. `tests/server/security/csp-report-route.test.ts`: báo cáo hợp lệ được log với directive ≤300 ký tự và query đã lược; body 20 KB và `text/plain` bị bỏ không log; 80 request liên tiếp chỉ log một phần.
- **404 và race giới hạn khách.** `tests/server/wedding/admin-api.test.ts`: `admin/invitation-status` và `admin/customer-status` với id không tồn tại trả 404, không correlationId, không audit. `tests/server/wedding/service.test.ts` “Personal guest invitations”: account khác nhận 404; 1.998 khách sẵn có + 6 request đồng thời → đúng 2 thành công, tổng 2.000.
- **Manager đổi tài khoản nhận tiền.** `tests/server/wedding/admin-api.test.ts`: manager gửi `admin/settings` nhận 403, không ghi Setting; owner nhận 200 và có một audit.
- **Quota upload.** `tests/server/wedding/service.test.ts` “Upload quotas”: account khác nhận 404, thiệp đủ 120 ảnh nhận 409, account đủ 150 ảnh trong 24 giờ nhận 429 và được tải lại khi các bản ghi quá 24 giờ. Migration `20261022000000_wedding_upload_quota` sinh bằng `prisma migrate diff` từ schema trước đó.
- **Host nhạc.** `tests/lib/wedding-music.test.ts` từ chối `https://192.168.1.1/…`, `https://localhost/…`, `https://[::1]/…`; vẫn nhận `https://example.com/song.mp3`. Dữ liệu dev hiện có: 0 thiệp bị ảnh hưởng.
- **PBKDF2 admin.** `tests/server/auth/session.test.ts`: hash mới có tiền tố `600000:`, hash cũ 100k vẫn đúng/sai đúng mật khẩu, số vòng 1.000/không phải số/quá nhiều phần bị từ chối, và `validateEnv` production nhận cả hai định dạng, từ chối giá trị khác.
- E2E `customer buys…` và `admin sidebar…` 2/2 qua với hash định dạng mới (lần đầu lỗi do cấu hình E2E vẫn dùng 100k với tiền tố 600000; đã sửa).
- **CSP.** `tests/server/security/csp.test.ts`: `script-src` production chỉ còn `'self' 'unsafe-inline'`, có nonce thì bỏ `unsafe-inline`; `connect-src` chỉ là `'self'`, thêm origin Sentry khi có DSN. Enforce/nonce chưa bật (xem ADR 0005 mục 10).
- **Dependency.** `pnpm audit`: trước 60 cảnh báo (32 high), sau 2 high đã chấp nhận (ADR 0005 mục 11); `pnpm audit --prod` chỉ còn `deepmerge-ts` của Prisma CLI. `pnpm check` (154 test) và `pnpm build` qua với lockfile mới. `pnpm test:e2e` (cache `.next-e2e` đã xóa vì cache cũ làm dev server treo ở “Compiling /”): 27/29 qua; 2 test admin lỗi `page.goto: Page crashed` (renderer Chromium crash khi máy còn ~2 GB RAM), chạy lại riêng `-g "customer buys|admin sidebar"` qua 2/2.

## Chuyển động theo cuộn không dùng JavaScript — 22/10/2026

Quyết định tại [ADR 0006](adr/0006-css-scroll-driven-motion.md). Phạm vi: thiệp mẫu `/w/thiep-mau` (Lời yêu) và cơ chế reveal dùng chung cho mọi mẫu.

- **Đo độ giật.** Dùng `scripts/perf/scroll-trace.ts` của worker perf (Chromium, CPU chậm 4×, cuộn 100 lần × 100px/50ms tới đáy), cùng dev server cho bản cũ và bản mới:

  | Viewport         | Chỉ số                  | Trước        | Sau        |
  | ---------------- | ----------------------- | ------------ | ---------- |
  | Mobile 390×844   | Frame >33 ms            | 66,8%        | 40,9%      |
  | Mobile 390×844   | Long task               | 23 / 1420 ms | 5 / 312 ms |
  | Mobile 390×844   | Recalc Style            | 1089 ms      | 540 ms     |
  | Mobile 390×844   | Paint                   | 823 ms       | 253 ms     |
  | Mobile 390×844   | Ép style/layout đồng bộ | 171 / 603 ms | 3 / 1,2 ms |
  | Desktop 1440×900 | p50 frame               | 33,4 ms      | 16,7 ms    |
  | Desktop 1440×900 | Frame >33 ms            | 66,3%        | 38,2%      |
  | Desktop 1440×900 | Ép style/layout đồng bộ | 201 / 701 ms | 2 / 5,9 ms |

  Ba lần ép layout còn lại đến từ `next/image` khi ảnh tải xong, không từ mã thiệp. Phần còn tốn là React dev dispatch sự kiện và hit-test khi lăn chuột; số đo là dev server trên máy chung đang tải cao (load 4,8–8,5 trên 6 CPU, RAM trống dưới 1 GB), không phải production hay điện thoại thật.

- **Hành vi chương ảnh.** Script Playwright đọc style tính toán và chụp ảnh ở tiến trình 0 → 1 tại 390×844 và 1440×900: khung chân dung scale 0,72 → 1 (mobile) và 0,44 → 1 (desktop), bốn ảnh in tản ra rồi mờ, cảnh hai quét ngang trong khoảng 50–85%, nhãn/caption đổi theo cảnh; mọi animation gắn `ViewTimeline`/`ScrollTimeline`. Không phần tử nào kẹt `data-reveal="wait"`, `scrollWidth` bằng viewport, không lỗi console.
- **E2E viết lại.** Hai bài chương ảnh dùng helper `scrollChapter` cuộn tới một tỉ lệ của quãng ghim: frame scale <0,8 ở 2% và >0,99 ở 50%; stage `sticky`; cảnh hai translate <5% ở 95% và >95% ở 2%; orbit hiện ở 2%, mờ hẳn ở 50%; hover album đặt `--tilt-x`; reduced motion đổi stage về `relative`, bỏ scale/transform và ẩn orbit, cảnh hai.
- **Cổng e2e.** `pnpm test:e2e` (29 bài, chromium, dev server 3201) trên máy chung đang thiếu RAM: lần đầu 17 qua, 12 lỗi đều do môi trường (renderer bị kill "Target crashed"/"Page crashed", server 3201 chết sau đó nên `ERR_CONNECTION_REFUSED`); lần thứ hai server treo ngay ở request đăng nhập admin. Chạy lại `pnpm test:e2e --last-failed` khi máy bớt tải: 12/12 qua (4,2 phút), gồm hai bài chương ảnh và bài hiệu ứng ảnh trên mobile. Tổng cộng 29/29 qua trên cùng mã.

## Lá thư tình cho Lời yêu — 22/10/2026

Quyết định tại [ADR 0004](adr/0004-template-configuration-and-edit-concurrency.md) (mục “Lá thư tình cho Lời yêu”), nguồn tham khảo tại RESEARCH. Phạm vi: Lời yêu (`/w/thiep-mau`, `/preview/loi-yeu`); các mẫu khác chỉ nhận lại hiệu ứng ảnh mặc định như trước.

- **Ảnh chụp thủ công.** Chromium trên dev server của worktree, mở thiệp rồi cuộn qua hero, countdown, lịch, lịch tiệc, RSVP, lời cảm ơn ở 1440×900, 390×844, 320×568 và 844×390. Mọi viewport `scrollWidth` bằng viewport, không lỗi console. Chuỗi khung hình khi mở thiệp cho thấy ảnh vòm lộ từ dưới lên trong đúng khung vòm, rồi hai tên được ký lần lượt. Đổi class palette sang wine (desktop) và midnight (mobile): chữ vẫn đọc được, dải countdown đảo nền sáng.
- **Trường hợp hẹp.** Ở 320/360/390px, dòng “CHÚNG MÌNH KẾT HÔN” cao 19px, ngày “14 . 02 . 2027” cao 35px (một dòng). Tên giả dài bảy dòng trên 390px vẫn nằm trong ảnh vì ảnh cao theo khối tên. Nút CTA 320px và chữ ký lời cảm ơn không còn chữ mồ côi.
- **Font.** `font-family` tính toán của tên là `scriptFont`. Hai font chỉ tải khi trang có rule Lời yêu đọc biến font. Không có request font ngoài origin.
- **Độ mượt.** Script Playwright đo frame khi cuộn (390×844, CPU chậm 4×, cuộn tới đáy; script tạm, không commit), chạy trên main trước lượt này (3200) và bản mới (worktree):

  | Chỉ số          | Trước   | Sau     |
  | --------------- | ------- | ------- |
  | p50 / p95 frame | 16,7 ms | 16,7 ms |
  | Frame dài nhất  | 33,4 ms | 33,3 ms |
  | Frame rớt       | 0,6%    | 0,6%    |
  | Long animation  | 0       | 0       |
  | Recalc Style    | 384 ms  | 454 ms  |
  | Layout (số lần) | 8       | 12      |

  Không có hồi quy về độ mượt. Recalc/layout tăng nhẹ do có thêm phần tử trang trí và animation một lần; số đo là dev server trên máy chung đang thiếu RAM, không phải production hay điện thoại thật.

- **Review độc lập.** Một subagent đọc diff mà không nhận kết luận của tôi, tìm ra bốn lỗi giao diện. Cả bốn đã sửa và kiểm tra lại trong trình duyệt:
  - Hiệu ứng vòm áp nhầm cho ảnh câu chuyện/album. Đã tách `heroEntrances`; ghi lại `Element.animate` thì thấy chỉ ảnh hero dùng `clip-path` vòm, ảnh câu chuyện và album dùng keyframe mặc định.
  - Rule tiêu đề trúng cả `h2` của hộp quà. Đã giới hạn bằng `> h2`; `h2` của hộp quà giữ 36px.
  - Link ở dải countdown không đổi màu khi hover (hồng trên nền mận). Màu hover giờ là champagne sáng, tương phản khoảng 4,75:1.
  - Cánh hoa bay đè lên chữ trên hero mobile. `z-index` của cánh hoa là 1, chữ là 2.
  - Ngoài ra dòng eyebrow 11px được nâng lên 12px.
- **Gate.** `pnpm check` qua: lint không lỗi (còn cảnh báo ref Music có sẵn), TypeScript qua, 154/154 test. `pnpm build` thành công. Prettier sạch. `pnpm test:e2e` **30/30 qua (5,5 phút)**, gồm bài mới “Lời yêu signs the couple's names and circles the wedding day”. Bài này chạy với cả `no-preference` và `reduce`, kiểm tra font viết tay, hai tên, vòng khoanh hiện và tim bị ẩn, `signName`/`ringDraw` chạy hoặc không có `data-entrance` và animation.
- **Sau khi merge.** `main` fast-forward và push lên origin; dev server 3200 trả 200 cho `/w/thiep-mau` với markup mới. Chụp lại từ 3200 ở 1440×900 và 390×844: không tràn ngang, không lỗi console. Ảnh đối chiếu: `docs/previews/loi-yeu-letter.jpg` (hàng trên là desktop: hero và lịch; hàng dưới là mobile: hero, lịch, lịch tiệc, lời cảm ơn).
- Cảnh báo dev của next/image về ảnh `fill` cao 0 trên mobile đã có ở bản trước (đối chiếu trang 3200 cũ và các log E2E cũ), không do lượt này. Chưa kiểm tra Safari hay iPhone thật, không deploy production.

## Phong bì, kỷ vật và độ mượt của thiệp mẫu — 22/10/2026

Nguồn tham khảo được mở lại trong lượt này, xem [RESEARCH](RESEARCH.md) mục “Mở lại trang tham khảo cho thiệp mẫu”. Quyết định chuyển động ở [ADR 0006](adr/0006-css-scroll-driven-motion.md) mục 6, nội dung mẫu ở [ADR 0004](adr/0004-template-configuration-and-edit-concurrency.md). Phạm vi: Lời yêu (`/w/thiep-mau`, `/preview/loi-yeu`). Các mẫu khác giữ hai cánh cửa và không có phần tử mới.

- **Ảnh chụp thủ công.** Dùng Chromium trên dev server của worktree. Chụp chuỗi khung hình khi mở thiệp ở 390×844, 1440×900, 320×568, 844×390 và ở 390×844 với reduced motion:
  - Dấu sáp vỡ, nắp lật, lá thư trượt lên, tim bay, rồi phong bì mờ đi để lộ ảnh vòm.
  - Ở 320×568, khối nút kết thúc tại 552px, vẫn trong màn hình.
  - Khi xoay ngang, phong bì nằm bên trái chữ và lá thư không bị cắt khi trượt lên.
  - Với reduced motion, thiệp mở ngay và focus vào tiêu đề.
  - Cuộn qua hero, ruy băng, câu chuyện và lịch tiệc: con dấu, ruy băng, chữ “Thương” và sợi tơ hiện đúng chỗ. Với reduced motion, cả bốn đứng yên ở trạng thái hoàn chỉnh.
  - Mọi viewport có `scrollWidth` bằng viewport và không lỗi console.
  - Ảnh đối chiếu: `docs/previews/loi-yeu-keepsakes.jpg`. Hàng trên là màn mở thiệp trên mobile; hàng dưới là con dấu, ruy băng, chữ “Thương” và sợi tơ.
- **Lỗi có sẵn đã sửa.** Trên mobile, cụm ảnh in của câu chuyện co về bề rộng 0 vì thiếu `width`. Giờ cụm ảnh rộng 100%, tối đa 450px. E2E kiểm tra ảnh chính rộng hơn 200px.
- **Độ mượt.** Một script Playwright đo frame khi cuộn (390×844, CPU chậm 4×, cuộn tới đáy; script tạm, không commit). Script chạy trên cùng máy với main (3200) và với worktree. Bản nháp đầu làm trang giật hẳn, nên từng phần tử được tắt lần lượt (chèn CSS `display:none`) để tìm nguyên nhân:

  | Bản đo                                     | Frame >25 ms | Layout |
  | ------------------------------------------ | ------------ | ------ |
  | main (trước lượt này)                      | 1,8–3,0%     | 12–13  |
  | Bản nháp: con dấu quay vô hạn trên `<svg>` | 56–63%       | 213+   |
  | Bọc SVG trong `span`, vẫn quay vô hạn      | 12%          | 35     |
  | Chỉ quay vô hạn, không quay theo cuộn      | 11,9%        | —      |
  | Chỉ quay theo cuộn                         | 4,6%         | 13     |
  | Bản cuối (mọi trang trí chạy theo cuộn)    | 3,0% / 3,7%  | 15–17  |

  Ruy băng chạy marquee vô hạn làm thêm khoảng 2–3% frame dài, nên cũng được chuyển sang chạy theo cuộn. Bản cuối có p95 16,8 ms, ngang main.

  Sau các sửa lỗi review bên dưới, chữ “Thương” thực sự chạy theo cuộn, nên phép đo được chạy lại, xen kẽ hai trang:
  - Bản mới: 3,9 / 4,0 / 4,9 / 7,8%. Main: 2,4 / 3,0 / 3,3 / 4,6%.
  - Cả hai có p95 16,8 ms (riêng lần 7,8% là 33,3 ms) và 0–3 long animation frame.
  - Khi tắt riêng hiệu ứng chữ “Thương”, bản mới đo được 4,0% và 9,2%, tức không tốt hơn. Phần chênh còn lại nằm trong độ dao động của máy, không do hiệu ứng này.

  Ở desktop 1440×900 với CPU chậm 4×, số đo dao động quá rộng để kết luận: main 21–37%, bản mới 29–34%. Mọi số đo là dev server trên máy chung đang thiếu RAM (swap đầy), không phải production hay điện thoại thật.

- **Review độc lập.** Một subagent đọc diff và CSS đã biên dịch mà không nhận kết luận của tôi. Mỗi phát hiện được kiểm lại trên trình duyệt trước khi sửa:
  - **Lỗi thật: chữ “Thương” không chạy theo cuộn.** `.story-composition` có `overflow: hidden`, nên section trở thành scroll container và `view()` bám vào section, vốn không bao giờ cuộn. Đo trước khi sửa:
    - Desktop 1440×900 kẹt ở tiến độ 0,49, chữ bị cắt mất nửa phải ở mọi vị trí cuộn.
    - Mobile kẹt ở 1, không có hiệu ứng viết.

    Đã đổi section Lời yêu sang `overflow: clip`. Sau khi sửa, nguồn timeline là `html` và tiến độ chạy 0 → 0,53 → 1 khi chữ đi vào màn hình, trên cả hai viewport. E2E giờ kiểm tra `timeline.source === document.scrollingElement`.

  - **Ruy băng bị cắt đầu.** Ở 600–760px và từ khoảng 1425px trở lên, góc phải của dải sẫm nghiêng bị cắt phẳng. Đã đổi sang `overflow-x: clip; overflow-y: visible`. Chụp lại ở 320, 390, 600, 760 và 1500px: hai đầu đủ, không đè lên nút, không tràn ngang.
  - **Test có thể flaky.** Trong bài reduced motion, Escape được bấm trước khi dialog chắc chắn mở. Đã thêm bước chờ dialog hiện.
  - **Id SVG cố định.** Đã đổi sang `useId()`. `href` của `textPath` trỏ đúng path và vòng chữ vẫn hiện.
  - **Comment cũ** của ruy băng đã được sửa.
  - Ba điểm không đổi gì, vì đo lại không thấy lỗi:
    - Nghi nét chữ “Thương” bị cắt ở trạng thái cuối. So ảnh có và không có `clip-path` ở 390 và 1440 thì trùng nhau từng pixel.
    - Tên khách cộng tên cặp đôi rất dài ở 320×568. Nút “Mở thiệp” ban đầu thấp hơn mép màn hình 22px, nhưng khối phong bì cuộn được và chạm vào phong bì cũng mở thiệp. Ghi nhận là giới hạn nhỏ.
    - Tên rất dài làm chữ trên vòng nhỏ đi. Đây chỉ là trang trí (`aria-hidden`).

- **Gate.** Kết quả trên mã cuối, đã gồm các sửa lỗi review:
  - `pnpm check` qua: lint không lỗi (còn cảnh báo ref Music có sẵn), TypeScript qua, 154/154 test. Prettier sạch.
  - `pnpm build` thành công, không cảnh báo.
  - `pnpm test:e2e` **31/31 qua (5,4 phút)**, gồm bài mới “Lời yêu opens a sealed envelope and keeps its keepsakes still when motion is reduced”. Bài này kiểm tra:
    - Không còn cánh cửa; phong bì `aria-hidden`. Bấm nút thì nắp chạy `rotateX` và lá thư trượt tới `-58%`. Chạm phong bì cũng mở thiệp. Focus về tiêu đề.
    - Vòng chữ có tên cặp đôi; ruy băng `aria-hidden`.
    - `sealTurn`, `ribbonRun`, `scriptWrite` và `threadDrop` được gắn đúng chỗ, và timeline của chữ “Thương” là trang.
    - Ảnh in mobile rộng hơn 200px.
    - Với reduced motion, Escape mở thiệp và cả bốn chi tiết không có animation hay `clip-path`.
  - Hai lần chạy trước đó bị môi trường cản:
    - Trước các sửa lỗi review: 30/31. Bài mua, kích hoạt, xuất bản và kiểm duyệt hết 120 giây khi dev server biên dịch nguội lúc máy thiếu RAM. Chạy lại `--last-failed` thì 1/1 qua.
    - Một lần chạy sau sửa lỗi review bị dừng giữa chừng khi load máy lên 136, rồi chạy lại khi máy bớt tải và cho kết quả 31/31 ở trên.
- **Sau khi merge.** `main` đã fast-forward và push lên origin. Dev server 3200 trả 200 cho `/w/thiep-mau`, cả qua `127.0.0.1` lẫn IP công khai, với markup mới: phong bì, ruy băng, vòng chữ, chữ “Thương” và không còn cánh cửa. Mở thiệp và cuộn trên 3200 ở 390×844 và 1440×900: `scrollWidth` bằng viewport, không lỗi console, timeline của chữ “Thương” là trang và chữ đang viết dở khi đi qua giữa màn hình.
- **Đo lại với Chrome mặc định.** Script đo ở trên bật cờ `CompositeClipPathAnimation`, nên có thể đánh giá thấp chi phí `clip-path` của chữ “Thương”. Đo lại trên 3200 không có cờ, lúc máy bớt tải (390×844, CPU chậm 4×):
  - Trang đầy đủ: 1,2% và 1,5% frame >25 ms.
  - Tắt riêng chữ “Thương”: 0,6% và 1,2%.
  - Cả hai p95 16,7–16,8 ms, 0–1 long animation frame.

  Hiệu ứng viết chữ không làm giật thêm đáng kể.

- **Chưa làm.** Chưa kiểm tra Safari (chưa hỗ trợ scroll-driven animation, nên sẽ thấy trạng thái tĩnh) hay iPhone/Android thật. Chưa deploy production.

## Cảnh báo hydration trên Chrome iOS — 31/10/2026

- **Nguyên nhân.** Chrome trên iOS ghi thêm thuộc tính vào DOM trước khi React hydrate: `__gcrremoteframetoken` trên `<html>` và `__gcruniqueid` trên `form`, `input`, `textarea`, `select`. React so với HTML server, thấy thuộc tính thừa và báo “A tree hydrated but some attributes of the server rendered HTML didn't match the client properties” khi mở `/` và `/w/thiep-mau`. Markup của app không sai.
- **Sửa.** Chỉ thêm `suppressHydrationWarning`, không đổi hành vi, markup hay style. Thuộc tính này chỉ bỏ qua thuộc tính và text của chính phần tử đó, không lan xuống con (tài liệu Next “Understanding suppressHydrationWarning”; `@types/react` khai báo nó trong `HTMLAttributes`), nên phải gắn trên từng ô nhập.
- **36 phần tử đã gắn:**
  - `src/app/layout.tsx`: `<html>`.
  - Thiệp công khai: `rsvp-form.tsx` (form, input `name`, textarea `message`), `music.tsx` (thanh âm lượng `type="range"`).
  - Trang mẫu: `template-catalog.tsx` (ô “Tìm mẫu thiệp”).
  - Đăng nhập, đăng ký: `auth-form.tsx` (form, input `displayName`, `phone`, `password`, checkbox đồng ý).
  - Editor, để chủ thiệp sửa trên iPhone: `invitation-editor.tsx` (form), `editor-fields.tsx` (16 ô input/textarea, gồm ô file và ô URL).
  - Thanh toán: `checkout.tsx` (2 form, radio, checkbox, ô ghi chú).
  - Khách mời trong dashboard: `guest-form.tsx` (form, input `name`, `group`).
  - Không cần gắn: `DropdownField` dùng Base UI Select, vốn đã đặt `suppressHydrationWarning` trên input ẩn của nó.
  - Chưa gắn: form trang admin (`src/app/admin/*`, `admin-form.tsx`), vì ngoài phạm vi bước này.
- **Test hồi quy.** `e2e/chrome-ios-hydration.spec.ts` giả lập Chrome iOS bằng `page.addInitScript`. Script gắn token lên `<html>` và dùng MutationObserver gắn `__gcruniqueid` lên `form, input, textarea, select` ngay khi parser tạo chúng. Ở 390×844 và 1440×900, test:
  - mở `/`, rồi `/w/thiep-mau`, kiểm tra các thuộc tính giả lập đã có mặt trên html và form RSVP;
  - bấm “Mở thiệp”, cuộn hết trang, cuộn tới RSVP và gõ tên;
  - yêu cầu không có console error/warning hay pageerror nào chứa “hydrat” hoặc “didn't match”.
- **Trước và sau sửa.** E2E chưa chạy được trong sandbox (xem dưới), nên bằng chứng trước/sau lấy từ một check tạm, không commit. Check này render server `RsvpForm`, `Music` và `RootLayout`, gắn `__gcr*` như Chrome iOS, rồi `hydrateRoot` trong jsdom:
  - Trước sửa: 3/3 fail với đúng cảnh báo trên, chỉ ra `__gcruniqueid="1"`, `"2"`, `"6"` (form, input tên, textarea RSVP), `"1"` trên thanh âm lượng, và token trên `<html>`.
  - Sau sửa: 3/3 qua.
- **Gate.**
  - `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check` **qua**: lint 0 lỗi (còn cảnh báo ref Music có sẵn), TypeScript qua, 22 file / 154 test. Phải đặt `TEST_DATABASE_URL` vì `node_modules` của worktree là symlink sang checkout chính, nên Prisma đặt DB tương đối vào thư mục chỉ đọc; `pnpm check` để mặc định thì lint và TypeScript qua nhưng 57 test DB fail “attempt to write a readonly database”.
  - `pnpm build` **fail do môi trường**, không do mã: `TurbopackInternalError: Symlink [project]/node_modules is invalid, it points out of the filesystem root`. Không thử `next build --webpack` vì máy chỉ còn khoảng 790 MB RAM và swap đã đầy; trước đó, chỉ riêng việc biên dịch `/` bằng webpack dev đã làm hết RAM.
  - E2E (`e2e/chrome-ios-hydration.spec.ts` và `e2e/wedding.spec.ts`, chromium) **chưa chạy được**. Sandbox chặn Unix socket nên tsx CLI trong `e2e/global-setup.ts` báo `listen EPERM`; Turbopack từ chối symlink `node_modules`; dev server webpack thay thế bị hết RAM khi biên dịch `/` (“Process from config.webServer exited early”). Không nới test nào.
  - `pnpm install --offline` không tạo được `node_modules` riêng: pnpm store chỉ đọc (EROFS).
- **Cần làm tiếp.** Chạy `pnpm build` và hai file e2e trên ở môi trường có `node_modules` cài thật và đủ RAM. Chưa thử trên iPhone thật.

## Giờ ghi bằng chữ cho tiệc — 31/10/2026

- **Thay đổi.** Thêm `timeLabel` tùy chọn cho từng tiệc (trim, tối đa 40 ký tự, chuỗi rỗng là không có) trong `eventSchema`. Editor có ô “Ghi giờ bằng chữ (tùy chọn)”. Mười mẫu in nhãn thay giờ, ngày vẫn hiện. Link lịch của tiệc có nhãn là sự kiện cả ngày theo ngày Việt Nam. Countdown không đổi. Không có migration. Quyết định ở [ADR 0007](adr/0007-event-written-time-label.md).
- **Test mới.**
  - `tests/lib/wedding-event-time-label.test.ts`: nhận và trim “ Buổi sáng ”; 40 ký tự qua, 41 bị từ chối tại `timeLabel` với “Giờ ghi bằng chữ tối đa 40 ký tự”; `""` và `"   "` cho JSON giống hệt tiệc không nhãn; `date` vẫn bắt buộc; `DEMO_CONTENT.events` đọc lại qua `readEvents` không đổi một ký tự.
  - `tests/lib/wedding-calendar.test.ts`: tiệc có nhãn lúc 00:30 ngày 09/11 giờ Việt Nam (08/11 theo UTC) cho `dates=20261109/20261110`, mô tả có “Thời gian: Buổi sáng”; ngày 31/12 sang `20270101`.
  - `tests/components/invitation-events.test.tsx`: chạy trên 15 composition (10 mẫu và 5 fallback theo layout). Tiệc có nhãn hiện “Buổi sáng · 09/11/2026” trong `<time datetime="2026-11-09">`, không có “08:00”, link lịch cả ngày; ô giờ riêng của Song hỷ, Khoảnh khắc, Bên nhau hiện nhãn. Tiệc không nhãn ra đúng chuỗi cũ `<time dateTime="2026-11-08T09:00:00.000Z">16:00 · 08/11/2026</time>` và `dates=20261108T090000Z%2F20261108T120000Z`; JSON cũ và nhãn rỗng cho markup giống hệt nhau.
  - Kiểm tra đỏ: tạm thay `invitation-events.tsx` bằng bản HEAD thì 16 test nhãn fail, 16 test “như cũ” vẫn qua; trả lại bản mới thì tất cả qua.
- **Gate.**
  - `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check` **exit 0**: lint 0 lỗi (còn cảnh báo ref Music có sẵn tại `music.tsx:55`), TypeScript qua, 24 file / 193 test. Riêng ba file test mới: 3 file / 40 test qua.
  - `pnpm build` trong worktree **fail do sandbox**, không do mã: `TurbopackInternalError: … src/app/globals.css [app-client] (css) … reading file ".../ccg-worker-9899abb2/.claude/output-styles" - Permission denied (os error 13)`. Tailwind tự quét mọi file không bị `.gitignore` loại; sandbox đặt các file che (thiết bị ký tự không đọc được) như `.claude/*`, `.bashrc`, `.idea` vào gốc worktree. Lỗi symlink `node_modules` ghi ở mục trước được tránh bằng `NEXT_PRIVATE_OUTPUT_TRACE_ROOT`.
  - `pnpm build` trên bản sao sạch **exit 0**: chép toàn bộ file tracked cùng ba file test/ADR mới (cùng nội dung working tree; `diff -rq src` không khác) sang scratchpad, symlink `node_modules`, chạy `NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/ NEXT_TELEMETRY_DISABLED=1 pnpm build`. Compile 8,2 s, TypeScript qua, 14/14 trang tĩnh, không cảnh báo. Không sửa config hay file ngoài `src`, `docs`, `tests`.
  - `pnpm install --offline --frozen-lockfile` fail EROFS (pnpm store chỉ đọc), nên `node_modules` là symlink sang checkout chính như các worktree khác; lockfile giống hệt.
  - E2E **không chạy** theo yêu cầu của bước này; bước kiểm tra sau chạy trên main đã merge. Không đụng dev server 3200, `prisma/dev.db` hay `public/uploads`.
- **Chưa làm.** Chưa xem trên trình duyệt thật; chưa tạo thiệp Vũ Tú & Nguyễn Ngọc (bước sau).

## Kiểm tra trên main đã merge: hydration Chrome iOS và giờ bằng chữ — 31/10/2026

Phạm vi: `main` tại `4d84d68`, gồm `0dc39eb` (bỏ cảnh báo hydration do Chrome iOS) và `073689c` + `4d84d68` (giờ ghi bằng chữ cho tiệc). Lượt này chỉ thêm test và ghi kết quả, không sửa `src/`.

- **Môi trường.** Mọi gate chạy trên **bản sao sạch các file tracked của commit `4d84d68`** (`git archive 4d84d68` vào scratchpad), có symlink `node_modules` sang checkout chính. Không chạy trong worktree vì Tailwind/Turbopack đọc phải các file che không đọc được của sandbox (`.claude/output-styles`…, lỗi EACCES đã ghi ở mục trước). Không đụng dev server 3200, `prisma/dev.db` hay `public/uploads`; cổng 3201 nằm trong network namespace riêng của sandbox. Mọi server đã dừng sau khi chạy.
- **`pnpm check`** (`TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check`): **exit 0, 62 s**. Lint 0 lỗi (còn cảnh báo ref Music có sẵn tại `music.tsx:55`), TypeScript qua, **24 file / 193 test qua** (vitest 40,9 s).
- **`pnpm build`** (`NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/ NEXT_TELEMETRY_DISABLED=1 pnpm build`): **exit 0, 21 s**. Compile 8,0 s, TypeScript 10,3 s, 14/14 trang tĩnh, không cảnh báo.
- **E2E: cách chạy.** `pnpm test:e2e` nguyên bản không chạy được trong sandbox vì hai lỗi môi trường, đều đã tái hiện:
  - `tsx` CLI (trong `e2e/global-setup.ts` và `pnpm db:seed`) mở Unix socket `/tmp/claude-1001/tsx-1001/<pid>.pipe` và bị từ chối `listen EPERM`.
  - Prisma client được generate trong `node_modules` của checkout chính, nên `DATABASE_URL="file:./e2e.db"` mở `/home/ccgram/happy_wedding/prisma/e2e.db` (kiểm bằng `PRAGMA database_list`), không phải `prisma/e2e.db` của bản sao. Nơi đó chỉ đọc trong sandbox, và không phải DB của lượt chạy này.

  Vì vậy E2E chạy bằng `pnpm exec playwright test -c pw.sandbox.config.ts …`. Config này chỉ có trong bản sao, không commit. Nó import `playwright.config.ts` và giữ nguyên mọi thiết lập (Chromium Desktop Chrome, 1 worker, timeout, `next dev` cổng 3201, `.next-e2e`, mật khẩu admin, CSP). Chỉ đổi ba điều:
  - `DATABASE_URL` là đường dẫn tuyệt đối tới `prisma/e2e.db` của bản sao.
  - Setup là một bản sao của `e2e/global-setup.ts`: xóa `prisma/e2e.db*`, `prisma db push`, rồi seed bằng `node --import tsx prisma/seed.ts` thay cho tsx CLI.
  - Thêm `NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/` để Turbopack nhận symlink `node_modules`.

- **E2E: kết quả trên main.**
  - `e2e/chrome-ios-hydration.spec.ts`: **2/2 qua (26,7 s)**, 390px 8,8 s và 1440px 6,7 s. Đây là lần đầu bài này chạy thật.
  - Toàn bộ bộ E2E (`chrome-ios-hydration.spec.ts` và `wedding.spec.ts`): **33/33 qua (5,3 phút)**, exit 0. Đã gồm luồng mua → admin kích hoạt → xuất bản → RSVP → duyệt, sáu viewport responsive với năm layout, mười mẫu trên desktop và mobile, hai bài Lời yêu, bài “guests can skip motion and reach Vietnamese event information”, nhạc, hộp quà và album. Vì đã chạy đủ bộ, không cần chạy riêng các nhóm `--grep`.
  - Log server của lượt đầy đủ không có dòng nào chứa “hydrat” hay “didn't match”, ngoài tên test. Còn các cảnh báo dev đã có từ trước: next/image (`fill` với parent thiếu `position`, gợi ý LCP) và Base UI (“changing the default value state of an uncontrolled Select”). Không test nào fail vì chúng.
- **Test mới: `e2e/event-time-label.spec.ts`.** Đăng ký khách mới, mở `/dashboard/new?template=template-rose` (Lời yêu), điền “Buổi sáng” vào ô “Ghi giờ bằng chữ (tùy chọn)” của Tiệc 1 và lưu bản nháp. Bài này kiểm tra:
  - Sau khi tải lại editor, Tiệc 1 vẫn là “Buổi sáng” và Tiệc 2 rỗng.
  - Ở bản xem thử nháp `/dashboard/<id>/preview`, sau khi mở thiệp, thẻ tiệc 1 có `<time datetime="2027-02-14">` là “Buổi sáng · 14/02/2027” và không chứa “11:00”. Thẻ tiệc 2 vẫn là “11:00 · 13/02/2027”.
  - Link lịch của tiệc 1 là cả ngày (`dates=20270214/20270215`); của tiệc 2 giữ giờ (`20270213T040000Z/20270213T070000Z`).

  Bài dùng bản xem thử của chủ thiệp, vì trang công khai `/w/…` chỉ hiện thiệp đã thanh toán và xuất bản. Bản xem thử dùng cùng `InvitationView`, và đúng với trường hợp thiệp nháp chưa công khai. Kết quả: **1/1 qua (27,8 s)**; với `--repeat-each=3` **3/3 qua (39,0 s)**. Prettier, ESLint và `tsc --noEmit` trên cây có file mới đều qua.

- **Đối chiếu với commit gốc `d75a88e`.** Chạy trên bản sao sạch `d75a88e`, cùng config bọc, có thêm hai file spec ở trên: **3/3 fail, exit 1 (154 s)**, đúng như mong đợi.
  - Hydration, cả 390px và 1440px: React báo “A tree hydrated but some attributes of the server rendered HTML didn't match the client properties” ở `/` (thuộc tính `__gcrremoteframetoken` trên `<html>`) và ở `/w/thiep-mau` (token đó, cộng `__gcruniqueid` 1, 2, 6, 7 trên form RSVP và các ô nhập). Như vậy test bắt đúng lỗi, và `0dc39eb` là thứ làm nó qua.
  - Bài “Buổi sáng” hết 120 s chờ ô “Ghi giờ bằng chữ (tùy chọn)”, vì ô này chưa có ở bản gốc.
- **Chưa làm.** Chưa chạy `pnpm test:e2e` nguyên bản (không qua config bọc) và chưa chạy gate trong worktree, vì các lỗi sandbox ở trên. Chưa thử trên iPhone hay Chrome iOS thật: thuộc tính `__gcr*` được giả lập bằng `addInitScript` trong Chromium. Chưa kiểm tra trang công khai `/w/…` của một thiệp đã xuất bản có giờ bằng chữ.

## Tạo id trên trình duyệt khi chạy qua http thường — 31/10/2026

- **Lỗi.** Server thử `http://160.250.247.137:3200` không phải secure context, nên trình duyệt không có `crypto.randomUUID`. Ba chỗ gọi nó trên trình duyệt ném “crypto.randomUUID is not a function”:
  - `editor-fields.tsx` (key của dòng tiệc, khi render và khi thêm tiệc): `/dashboard/new` và `/dashboard/<id>` hiện “Chưa tải được trang”.
  - `rsvp-form.tsx` (clientId khi gửi, cả nhánh có và không có localStorage): khách không gửi được RSVP.
  - `checkout.tsx` (clientId của đơn): chủ thiệp không tạo được đơn.
- **Sửa.** Thêm `src/lib/random-id.ts` với `randomUUID()`. Hàm này dùng `crypto.randomUUID()` khi có; nếu không có thì dựng UUID v4 theo RFC 4122 từ `crypto.getRandomValues(new Uint8Array(16))` (đặt bit version 4 và variant `10xx`, hex thường 8-4-4-4-12). `getRandomValues` có cả ngoài secure context. Không dùng `Math.random`, vì clientId của RSVP là quyền cập nhật phản hồi của một trình duyệt. Ba component trên dùng hàm này. Không còn chỗ nào trên trình duyệt gọi `crypto.randomUUID`. Route handler phía server (`node:crypto`, `crypto.randomUUID` cho correlationId) chạy trên Node nên giữ nguyên. Hành vi không đổi, không cần ADR.
- **Schema server.** `responseSchema.clientId` (`src/lib/wedding.ts`) và `clientId` của `/api/wedding/orders` đều là `z.uuid()`. Test kiểm tra id dựng từ `getRandomValues` qua đúng các schema này.
- **Test mới.**
  - `tests/lib/random-id.test.ts`: có `randomUUID` gốc thì dùng nó. Khi gỡ `randomUUID` (chỉ còn `getRandomValues`), 200 id đều đúng dạng v4, nibble version là `4`, variant thuộc `8/9/a/b`, qua `z.uuid()`, không trùng nhau, gọi `getRandomValues` 200 lần và không gọi `Math.random`. Với byte toàn `0x00` và toàn `0xff`, kết quả là `00000000-0000-4000-8000-000000000000` và `ffffffff-ffff-4fff-bfff-ffffffffffff`.
  - `tests/components/client-ids-without-random-uuid.test.tsx`, chạy với `crypto` chỉ có `getRandomValues`:
    - `RsvpForm` gửi `/api/wedding/rsvp/<slug>` với clientId v4, body qua `responseSchema`, clientId lưu ở `localStorage` và lần gửi lại dùng đúng clientId đó.
    - `RsvpForm` vẫn gửi được khi `localStorage` ném lỗi.
    - `Checkout` gửi `/api/wedding/orders` với clientId v4, qua schema của route, rồi chuyển sang `/dashboard/orders/<id>`.
    - `EventFields` render được, và bấm “Thêm một tiệc” thì có Tiệc 2.
  - **Kiểm tra đỏ.** Với ba component bản HEAD: 4/4 test component fail với “crypto.randomUUID is not a function” (chỉ bài kiểm tra môi trường qua). Khi tạm cho helper chỉ `return crypto.randomUUID()`: 6/8 fail; 2 bài qua là bài dùng `randomUUID` gốc và bài kiểm tra môi trường. Trả lại bản mới thì 8/8 qua.
- **Gate.** `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check` **exit 0**: lint 0 lỗi (còn cảnh báo ref Music có sẵn tại `music.tsx:55`), TypeScript qua, **26 file / 201 test qua**. Phải đặt `TEST_DATABASE_URL` vì `node_modules` là symlink sang checkout chính (đã ghi ở các mục trước). Không chạy `pnpm build` và E2E theo yêu cầu của bước này; bước sau chạy trên main đã merge.
- **Chưa làm.** Chưa thử trên server 3200 thật bằng trình duyệt. Còn `navigator.clipboard` (cũng chỉ có trong secure context) ở `actions.tsx` và `gift-accounts.tsx`: hai chỗ đã bọc try/catch và hiện hướng dẫn chép tay, nên không làm hỏng trang; bước này không sửa.

## Kiểm tra trên main `6009b2d`: tạo id khi chạy qua http thường — 01/11/2026

Phạm vi: `main` tại `6009b2d` (tạo id trên trình duyệt không cần `crypto.randomUUID`). Lượt này chỉ thêm `e2e/insecure-context-ids.spec.ts` và ghi kết quả, không sửa `src/`.

- **Môi trường.** Mọi gate chạy trên bản sao sạch các file tracked của `6009b2d` (`git archive 6009b2d` vào scratchpad), cộng spec mới, có symlink `node_modules` sang checkout chính, giống mục 31/10 ở trên. E2E chạy qua cùng config bọc `pw.sandbox.config.ts` của mục 31/10 (chỉ có trong bản sao, không commit): `DATABASE_URL` tuyệt đối tới `prisma/e2e.db` của bản sao, setup seed bằng `node --import tsx` và `NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/`. Không đụng server 3200, `prisma/dev.db` hay `public/uploads`.
- **Giới hạn RAM.** Máy có 5,9 GB RAM và 2 GB swap. Server preview 3200 (`happy-wedding.service`, khoảng 1 GB) chạy trong lúc `pnpm check`, `pnpm build` và lần chạy spec mới. Orchestrator tạm dừng nó giữa lúc chạy full e2e để lấy thêm RAM. Lượt trước của bước này (31/10, 16:59) bị systemd-oomd giết giữa lúc chạy full e2e, kéo theo cả tmux scope của ccgram. Ở máy này oomd dùng `ManagedOOMMemoryPressure=kill`, ngưỡng 50% trên `user@1001.service`; root slice để `ManagedOOMSwap=auto` nên không giết theo swap. Tiến trình test nằm chung `ccgram-tmux-*.scope` với ccgram, nên nếu oomd ra tay thì cả scope bị giết. Vì vậy lần này:
  - Các gate chạy tuần tự, không chạy song song hai việc nặng nào (build, `next dev`, Playwright, vitest).
  - Trước mỗi gate kiểm `free -m`, dừng nếu available dưới 1500 MB. Build và e2e đặt `NODE_OPTIONS=--max-old-space-size=1536`. Playwright chạy `--workers=1`.
  - Trong mỗi gate có một vòng lặp ghi available và swap; các lượt e2e ghi thêm PSI. Full e2e và kiểm tra đỏ chạy dưới watchdog: nếu available dưới 500 MB, hoặc `some avg10` trong `memory.pressure` của `user@1001.service` vượt 15%, watchdog tự dừng Playwright, next và chromium trước khi oomd kịp ra tay.
  - Sau mỗi gate kiểm bằng `ps` rằng không còn tiến trình next hay chromium nào.
- **`pnpm check`** (`TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check`): **exit 0, 70 s**. Lint 0 lỗi (còn cảnh báo ref Music có sẵn tại `music.tsx:55`; spec mới không có cảnh báo), TypeScript qua, **26 file / 201 test qua** (vitest 45,2 s). Prettier qua trên spec mới.
- **`pnpm build`** (`NODE_OPTIONS=--max-old-space-size=1536 NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/ NEXT_TELEMETRY_DISABLED=1 pnpm build`): **exit 0, 23 s**. Compile 8,7 s, TypeScript 11,4 s, 14/14 trang tĩnh, không cảnh báo.
- **Test mới: `e2e/insecure-context-ids.spec.ts`.** Trên `127.0.0.1` Chromium coi trang là secure context, nên spec dùng `page.addInitScript` xóa `Crypto.prototype.randomUUID` trước khi script của trang chạy, giống trình duyệt mở `http://<IP>:3200`. Mỗi bài kiểm tra trên chính trang rằng `typeof crypto.randomUUID` là `"undefined"` còn `getRandomValues` vẫn là `"function"`, và yêu cầu không có `pageerror` nào. Spec có ba bài:
  - **Editor.** Đăng ký khách mới, mở `/dashboard/new?template=template-rose`. Editor phải hiện hai tiệc mẫu, bấm “Thêm một tiệc” ra Tiệc 3, điền địa điểm, và không có “Chưa tải được trang”. Lưu bản nháp, tải lại `/dashboard/<id>`: Tiệc 3 vẫn còn, thêm được Tiệc 4.
  - **RSVP.** Khách mở `/w/thiep-mau` (thiệp mẫu đã xuất bản trong seed e2e), mở thiệp và gửi RSVP kèm lời chúc. Trang phải báo “Đã lưu phản hồi”. Body của `POST /api/wedding/rsvp/thiep-mau` có `clientId` là UUID v4, và `localStorage["rsvp:thiep-mau"]` giữ đúng id đó.
  - **Checkout.** Khách mới lưu một bản nháp (bước chuẩn bị, lúc này chưa xóa `randomUUID`), rồi mở `/dashboard/orders/new?invitation=<id>` khi không có `randomUUID` và tạo đơn. Trang phải chuyển sang `/dashboard/orders/<id>` với trạng thái “Chờ xác nhận”. Body của `POST /api/wedding/orders` có đúng `invitationId` và `clientId` là UUID v4.

  Spec chỉ ghi vào `prisma/e2e.db`, DB mà setup e2e xóa và tạo lại mỗi lần chạy. Slug và số điện thoại sinh theo thời gian. Lời chúc RSVP mặc định chờ duyệt nên không hiện trên thiệp mẫu.

- **Spec mới trên `6009b2d`.** `--repeat-each=3 --workers=1`: **9/9 qua, exit 0, 72 s** (lượt đầu 13,2 s / 7,0 s / 6,2 s, khi `next dev` còn phải biên dịch; hai lượt sau 3,9–5,3 s mỗi bài).
- **Kiểm tra đỏ trên code cũ.** Trên một bản sao sạch khác của `6009b2d`, đảo riêng phần `src/` của commit này (`git diff 6009b2d 6009b2d^ -- src | git apply`). Bản này bỏ `src/lib/random-id.ts`, và `checkout.tsx`, `editor-fields.tsx`, `rsvp-form.tsx` gọi lại `crypto.randomUUID()`. Còn lại (tests, e2e, docs) giữ nguyên. Chạy spec mới bằng cùng config bọc: **3/3 fail, exit 1, 104 s**, đúng vì lỗi đang sửa:
  - Editor hiện “Chưa tải được trang”. Trace có `TypeError: crypto.randomUUID is not a function at EventFields.useState`. Bài fail khi chờ “Tiệc 2”.
  - RSVP hiện `<p role="alert">crypto.randomUUID is not a function</p>` thay vì “Đã lưu phản hồi”, và không gửi request.
  - Checkout hiện alert “crypto.randomUUID is not a function”, vẫn đứng ở `/dashboard/orders/new?invitation=…`, và không gửi `POST /api/wedding/orders`.

  Bản sao này chỉ để chạy kiểm tra đỏ, không đụng worktree hay `main`.

- **Full e2e một lượt: bị dừng.** Lệnh `pnpm exec playwright test -c pw.sandbox.config.ts --workers=1` (37 bài: hai bài hydration, một bài giờ bằng chữ, ba bài mới, 31 bài của `wedding.spec.ts`) **bị watchdog dừng sau 100 s, exit 143**:
  - Lúc dừng, **6/37 đã qua, 0 fail**: hai bài hydration Chrome iOS (8,0 s / 6,3 s), bài giờ bằng chữ (16,3 s) và ba bài mới (4,2 s / 5,1 s / 6,2 s). Bài thứ bảy, bài đầu tiên của `wedding.spec.ts`, đang chạy thì bị dừng. 31 bài chưa chạy.
  - Lý do: available tụt xuống **352 MB**, swap đầy **2047/2047 MB**, và `next-server` của `next dev` chiếm **RSS 2,7 GB** khi bắt đầu biên dịch các route của `wedding.spec.ts`. Giới hạn heap `--max-old-space-size=1536` không chặn được phần bộ nhớ native của Turbopack. PSI `some avg10` cao nhất chỉ 4,97%, xa ngưỡng 50% của oomd: watchdog dừng trước, **oomd không giết gì**, ccgram và các phiên khác vẫn chạy.
  - Mức RAM trước lần chạy này: available 3001 MB, nhưng swap đã dùng 1800/2047 MB. Giữa chừng có lúc available lên 1985 MB, khoảng lúc service 3200 được dừng, rồi lại tụt.
  - Theo quy tắc của lượt này, không chạy lại ngay. Ngay sau khi dừng: available 3732 MB, swap 2026/2047 MB.
- **Full e2e chạy chia lượt: 37/37 qua.** Orchestrator đồng ý chạy chia lượt. Lý do: máy chỉ có 5,9 GB RAM, swap đã đầy (2045/2047 MB), và khi chạy một lượt thì `next dev` lên 2,7 GB. Service 3200 tắt suốt lúc chạy. Bản sao sạch là `6009b2d` cộng spec mới của `d891828`, giống trên.
  - **Cách chạy.** Mỗi lượt là một lệnh riêng, `NODE_OPTIONS=--max-old-space-size=1536 playwright test -c pw.sandbox.config.ts --workers=1 <file hoặc file:dòng>`, với một `next dev` mới. Setup của webServer xóa và seed lại `prisma/e2e.db` ở mỗi lượt.
  - **Giữa các lượt.** `ps` không còn next hay chromium, cổng 3201 trống, available ≥ 1500 MB.
  - **Watchdog.** Vẫn dùng watchdog như trên, có ghi thêm RSS của `next-server`. Từ lượt p04b, watchdog ghi thêm dung lượng đĩa trống, không cho lượt bắt đầu nếu còn dưới 1000 MB, và dừng lượt nếu tụt dưới 300 MB.
  - **Cách chia lượt.** Mỗi file spec chạy một lượt. `wedding.spec.ts` có 31 bài, không có `test.describe`, `serial` hay hook, nhưng có một phụ thuộc dữ liệu:
    - Bài “admin sidebar, mobile drawer and order filters…” (dòng 874) lọc đơn “Đã thanh toán” của “Khách kiểm thử”. Khách và đơn này do bài đầu (dòng 14) tạo; seed chỉ có đơn đã thanh toán của “Cặp đôi minh họa”. Vì vậy hai bài chạy chung một lượt, theo thứ tự trong file.
    - Không dùng được `--shard`, vì config để `fullyParallel: false`: với `--shard=1/3`, shard 1 nhận cả 31 bài, hai shard còn lại 0 bài. Thay vào đó chọn bài theo `file:dòng`.
    - Trước khi chạy, đã đối chiếu `--list` của từng lượt với `--list` toàn bộ: hợp lại đúng 37 bài, không trùng, không sót.

  | Lượt                                            | Bài | Kết quả                | Thời gian | Available trước / thấp nhất (MB) | Peak RSS `next-server` (MB) |
  | ----------------------------------------------- | --- | ---------------------- | --------- | -------------------------------- | --------------------------- |
  | p01 `chrome-ios-hydration.spec.ts`              | 2   | 2 qua                  | 28 s      | 3690 / 2485                      | 833                         |
  | p02 `event-time-label.spec.ts`                  | 1   | 1 qua                  | 21 s      | 3648 / 2396                      | 893                         |
  | p03 `insecure-context-ids.spec.ts`              | 3   | 3 qua                  | 29 s      | 3642 / 2348                      | 958                         |
  | p04 `wedding` :14, :874                         | 2   | 1 qua, 1 fail (ENOSPC) | 103 s     | 3649 / 557                       | 2518                        |
  | p04b, chạy lại p04                              | 2   | 2 qua                  | 95 s      | 3703 / 1126                      | 2120                        |
  | p05 `wedding` :311, :347, :397                  | 3   | 3 qua                  | 34 s      | 3717 / 2088                      | 1362                        |
  | p06 `wedding` :437 (6 viewport)                 | 6   | 6 qua                  | 67 s      | 3711 / 1637                      | 1755                        |
  | p07 `wedding` :506, :549, :626, :650, :691      | 5   | 5 qua                  | 38 s      | 3691 / 1931                      | 1543                        |
  | p08 `wedding` :746 (×2), :793, :812 (×2)        | 5   | 5 qua                  | 33 s      | 3609 / 2187                      | 1261                        |
  | p09 `wedding` :986, :1017, :1078, :1192, :1221  | 5   | 5 qua                  | 45 s      | 3642 / 2139                      | 1073                        |
  | p10 `wedding` :1260, :1340, :1379, :1416, :1438 | 5   | 5 qua                  | 54 s      | 3633 / 2137                      | 1066                        |
  - **Tổng.** Lấy p04b thay cho p04: 2 + 1 + 3 + 2 + 3 + 6 + 5 + 5 + 5 + 5 = **37 bài, 37 qua, 0 fail**. Tên các bài qua khớp đúng 37 tên của `--list`.
  - **Fail ở p04 là do hết đĩa, không phải lỗi app.**
    - Bài dòng 874 fail ở `page.goto("/admin/plans")` với `net::ERR_INSUFFICIENT_RESOURCES`, kèm `ENOSPC: no space left on device` khi Playwright ghi trace. Đĩa gốc `/` (75 GB, dùng chung cả máy) lúc đó chỉ còn khoảng 1,1 GB trống.
    - Trước khi chạy lại, xóa build output và cache của các bản sao trong scratchpad (khoảng 450 MB) để có chỗ. Chạy lại đúng hai bài đó (p04b), không sửa gì: **qua 2/2**.
    - Log đĩa của p04b: ngay sau khi hai bài xong, mức trống tụt từ 1572 xuống 326 MB trong khoảng 6 s, rồi về lại 1573 MB. Lúc đó `next-server` giữ 2,1 GB. Có vẻ là `next dev` ghi cache Turbopack vào `.next-e2e` khi tắt (chưa xác nhận).
  - **RAM.**
    - Available thấp nhất 557 MB (p04). Trong các lượt tính vào 37 bài, thấp nhất 1126 MB (p04b).
    - Swap đầy suốt lúc chạy (2045–2047/2047 MB). PSI `some avg10` cao nhất 4,22%. Watchdog không phải ra tay, oomd không giết gì.
    - Peak `next-server` dưới 1,5 GB ở 7/10 lượt tính vào tổng. p06 và p07 nhỉnh hơn (1755 và 1543 MB). p04/p04b vượt (2,1–2,5 GB) vì hai bài customer và admin phải chạy chung, không chia nhỏ hơn được.
  - **Sau khi chạy.** Sau mỗi lượt `ps` không còn next hay chromium. Cuối cùng available 3621 MB, swap 2045/2047 MB. Đã xóa cache `.next-e2e` của bản sao; đĩa còn 2557 MB trống.

- **Bằng chứng trên server http thật.** Bước kiểm tra trước, sáng 01/11, chạy trên `http://160.250.247.137:3200` (main `6009b2d`, `isSecureContext=false`, `crypto.randomUUID` là `undefined`, `getRandomValues` có):
  - Editor `/dashboard/<id>` mở được, thêm và bỏ tiệc đều không lỗi.
  - RSVP ở `/w/thiep-mau` và checkout ở `/dashboard/orders/new?invitation=<id>` gửi `clientId` là UUID v4, không có lỗi `randomUUID`. Hai request này được chặn lại và trả 503, nên không ghi vào DB thật. Đối chiếu `prisma/dev.db` ở chế độ chỉ đọc: không có phản hồi hay đơn mới.
- **RAM qua các gate** (available / swap đã dùng, MB):

  | Gate            | Trước khi chạy | Thấp nhất khi chạy |
  | --------------- | -------------- | ------------------ |
  | `pnpm check`    | 2351 / 1126    | 1734 / 1131        |
  | `pnpm build`    | 2355 / 1138    | 1303 / 1302        |
  | Spec mới ×3     | 2595 / 1408    | 874 / 1735         |
  | Full e2e (dừng) | 3001 / 1800    | 352 / 2047         |
  | Kiểm tra đỏ     | 3697 / 2025    | 1874 / 2025        |

  Sau `pnpm check`, `pnpm build`, spec mới và kiểm tra đỏ, `ps` không còn tiến trình next hay chromium nào. Riêng full e2e: script đã kết thúc trước khi watchdog kịp gửi đợt SIGKILL, nên `ps` ngay lúc đó vẫn thấy `next dev`, `next-server` và process của Playwright. Các tiến trình này dừng khi lệnh sandbox kết thúc. Ngay sau đó available về 3732 MB (lúc dừng, riêng `next-server` chiếm 2,7 GB). Watchdog đã được sửa để chờ xong đợt SIGKILL, và lần kiểm tra đỏ sau đó không còn tiến trình sót.

- **Chưa làm.**
  - Chưa chạy được full e2e thành một lượt nguyên vẹn trên `6009b2d`. Cả 37 bài đã qua, nhưng trong 10 lượt riêng (xem trên). Muốn chạy một lượt thì cần giải phóng swap (phải có root) hoặc máy nhiều RAM hơn.
  - Đĩa gốc `/` chỉ còn khoảng 2,5 GB trống, mà một lượt `next dev` có thể ghi tạm hơn 1 GB.
  - Chưa chạy `pnpm test:e2e` nguyên bản (không qua config bọc), vì các lỗi sandbox đã ghi ở mục 31/10.
  - Chưa thử trên Safari hay điện thoại thật qua http.

## Ảnh upload giữ độ phân giải gốc — 01/11/2026

- **Pipeline cũ** (`src/app/api/wedding/upload/route.ts`, HEAD `122e951`): stream cắt ở 5 MiB; Sharp `limitInputPixels: 40_000_000`; `rotate()`, `resize({ width: 1600, withoutEnlargement: true })`, `webp({ quality: 85 })`; metadata bị bỏ vì không gọi `withMetadata`. Ảnh 5464×8192 (44,8 megapixel) của khách bị từ chối ở bước decode dù có nâng giới hạn byte.
- **Thay đổi.** Hằng số chung `src/lib/wedding-upload.ts`: 40 MiB/ảnh, 64 megapixel, cạnh 16.383 px. Route đọc stream tới 40 MiB rồi hủy reader và trả 413 “Ảnh tối đa 40 MB”; đọc header bằng `metadata()`, cạnh >16.383 px trả 400 với lỗi riêng; giữ `rotate()`, bỏ `resize`, WebP quality 90 effort 2. Editor kiểm tra trước bằng cùng hằng số; chữ hướng dẫn ghi “tối đa 40 MB/ảnh, giữ nguyên độ phân giải gốc”. Quy tắc đường dẫn `.webp`, Zod, kiểm tra Content-Type, safe origin, phiên khách và `ownedInvitation`/`reserveUpload` không đổi. Quyết định ở [ADR 0008](adr/0008-full-resolution-uploads.md).
- **Các tầng khác không cắt body.** `src/proxy.ts` chỉ khớp `/admin/:path*`; Next chỉ clone/buffer body (mặc định 10 MB, `proxyClientMaxBodySize`) khi proxy chạy cho request đó (`resolve-routes.js`, `body-streams.js`). `serverActions.bodySizeLimit` chỉ áp dụng cho Server Action. Route handler tự đọc `request.body`, nên giới hạn duy nhất là vòng đọc stream của route. Chưa thử qua HTTP thật trên server đã build.
- **Đo pipeline mới** (`sharp` 0.35.5, máy thử 6 CPU, `sharp.concurrency()` mặc định là 1 vì glibc không jemalloc). Ảnh tạo bằng nhiễu Gauss làm mờ phủ gradient, có EXIF GPS, 5464×8192:

  | Input    | effort | Thời gian | Peak RSS | Output   | EXIF/XMP/ICC ra |
  | -------- | ------ | --------- | -------- | -------- | --------------- |
  | 17,8 MiB | 4      | 30,9 s    | 617 MB   | 15,0 MiB | không           |
  | 27,6 MiB | 4      | 33,5 s    | 725 MB   | 19,0 MiB | không           |
  | 27,6 MiB | 2      | 6,0 s     | 338 MB   | 18,9 MiB | không           |
  | 17,8 MiB | 2      | 5,5 s     | 320 MB   | 14,9 MiB | không           |

  Effort 2 với 6 thread: 6,4 s, 349 MB. PSNR vùng 1024×1024 so với ảnh nguồn: effort 2 là 36,62 dB, effort 3 và 4 là 36,63 dB; effort 3 chậm như effort 4 (33 s). Vì vậy dùng effort 2 và không đổi `sharp.concurrency` toàn tiến trình.

- **`next/image` với ảnh đầy đủ.** Gọi thẳng `optimizeImage` của Next 16.3.8 (cấu hình mặc định: quality 75, `imgOptMaxInputPixels` 268.402.689, timeout 7 s) trên output WebP 19 MiB, 5464×8192: rộng 828 → 2,2 s, 19 KiB; 1080 → 2,4 s, 80 KiB; 1920 → 3,0 s, 702 KiB; 3840 → 6,0 s, 4,0 MiB; peak RSS 526 MB. `maximumResponseBody` mặc định 50 MB lớn hơn file. Khi tối ưu lỗi hoặc quá 7 s, Next trả file gốc. Chưa thử qua `/_next/image` trên server chạy thật.
- **Test mới** `tests/server/wedding/upload-route.test.ts` (môi trường node; mock phiên, `reserveUpload` và `node:fs/promises`, nên không ghi DB hay `public/uploads`; safe origin chạy thật):
  1. JPEG 5464×8192 đệm segment APP15 lên 21 MiB → 200, lưu WebP 5464×8192.
  2. JPEG 5464×8192 dưới 5 MB → 200, giữ 5464×8192.
  3. JPEG 3000×2000 có orientation 6, EXIF (Make, GPS), XMP, ICC P3 → 2000×3000; output không có EXIF, XMP, ICC, orientation và không chứa chuỗi “TestCam”.
  4. Stream 1 MiB/chunk tới 64 MiB → 413 `{ok:false,message:"Ảnh tối đa 40 MB"}`, stream bị hủy, đọc không quá 43 MiB, không lưu file.
  5. JPEG 16384×64 → 400 “Ảnh có cạnh dài hơn 16.383 px. Vui lòng chọn ảnh nhỏ hơn”.
  6. Tệp hỏng và JPEG 8001×8001 (64,016 megapixel) → 400 “Tệp ảnh không hợp lệ hoặc quá lớn”.
- **Kiểm tra đỏ.** Tạm thay route bằng bản HEAD: 5/6 fail đúng lý do: (1) 413 vì 5 MB, (2) 400 vì trần 40 megapixel, (3) ra 1600×2400 thay vì 2000×3000, (4) lỗi “Ảnh tối đa 5 MB”, (5) 200 vì ảnh bị thu về 1600 px. Bài 6 qua ở cả hai bản vì giữ lỗi cũ. Trả lại route mới thì 6/6 qua.
- **Gate.**
  - `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check` **exit 0**: lint 0 lỗi (còn cảnh báo ref có sẵn ở `music.tsx:55`), TypeScript qua, **27 file / 207 test qua**. RAM trước khi chạy: available 3743 MB.
  - `pnpm build` trên bản sao sạch (file tracked cùng ba file mới, `diff -rq src` không khác, `node_modules` symlink, `NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/`) **thành công**, có `/api/wedding/upload`. RAM trước khi chạy: available 3701 MB. Đã xóa bản sao sau khi build.
  - Không chạy E2E. Không đụng dev server 3200, `prisma/dev.db` hay `public/uploads`. Không có ảnh thật trong repo; ảnh đo nằm ở scratchpad và đã xóa.
- **Chưa làm.** Chưa upload ảnh qua editor trên trình duyệt hay server đã build. Reverse proxy production phải cho body 40 MB (nginx mặc định 1 MB). Ảnh 3840 px của `next/image` mất 6 s, gần timeout 7 s; quá giờ thì khách nhận file gốc khoảng 19 MB. Bước này không đổi cấu hình hiển thị.

### Review vòng 1 — giới hạn mã hóa đồng thời, định dạng thật, `deviceSizes` — 01/11/2026

- **Semaphore.** `src/server/wedding/slots.ts` (`createSlots`, hàng FIFO có giới hạn, slot nhả ra chuyển thẳng cho request chờ lâu nhất, nhả hai lần không tính hai). Route tạo ở cấp module `{ slots: 2, queue: 10, waitMs: 60_000 }`, lấy slot sau khi đọc xong body, trước Sharp, nhả trong `finally`. Hàng đầy hoặc chờ quá 60 giây trả 503 “Máy chủ đang bận, vui lòng thử lại sau” và log `wedding_upload_busy`. Editor gửi từng ảnh một: `<input type="file">` không có `multiple`, chỉ lấy `files?.[0]`, bỏ qua khi `uploading`, input bị khóa trong lúc tải (`editor-fields.tsx`, `invitation-editor.tsx`), nên không cần sửa editor.
- **Định dạng thật.** Sau `metadata()`, `format` khác jpeg/png/webp trả 400 “Chỉ nhận ảnh JPEG, PNG hoặc WebP” (chuỗi dùng chung `UPLOAD_IMAGE_TYPE_INVALID`).
- **Bộ nhớ body.** `Buffer.concat(chunks, bytes)` rồi `chunks.length = 0` trước khi chờ slot.
- **`next.config.ts`.** `images.deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048]`. Tính srcset bằng `getImgProps` của Next 16.3.8 với cấu hình này: ảnh bìa (`(max-width: 760px) 95vw, 75vw`) và lightbox (`95vw`) đều ra 640w…2048w; thumbnail editor (`fill`, `200px`) ra 32w…2048w, trình duyệt chọn 256–640. `optimizeImage` trên WebP 5464×8192 19 MiB: 1920 → 2,8 s, 692 KiB; 2048 → 3,0 s, 846 KiB; peak RSS 349 MB. Chưa thử `/_next/image` trên server chạy thật.
- **Trường hợp xấu về RAM** (`sharp` 0.35.5, cùng pipeline `limitInputPixels 64e6`, `rotate(90)`, WebP q90 effort 2, mỗi lần một tiến trình mới):

  | Input                                  | Thời gian | Peak RSS |
  | -------------------------------------- | --------- | -------- |
  | PNG RGBA 16-bit 8 MP (1,6 MiB)         | 0,9 s     | 287 MB   |
  | PNG RGBA 16-bit 16 MP (2,6 MiB)        | 1,6 s     | 505 MB   |
  | PNG RGBA 16-bit 32 MP (8,5 MiB)        | 3,5 s     | 944 MB   |
  | JPEG 8-bit 8192×5464 xoay 90° (29 MiB) | 6,3 s     | 472 MB   |

  Khoảng 27 MB mỗi megapixel với PNG 16-bit, nên 64 MP ngoại suy khoảng 1,8 GB; không đo trực tiếp vì máy thử chỉ còn khoảng 3,6 GB trống. Ghi vào ADR 0008 và OPERATIONS.

- **Test mới.**
  - `tests/server/wedding/slots.test.ts`: 3 test, fake timers. Thứ tự FIFO; nhả hai lần chỉ tính một; hàng đầy bị từ chối ngay; hết 60 s bị từ chối và rời hàng.
  - `upload-route.test.ts` thêm 3 test (bọc `sharp` để đếm pipeline của route, có cổng giữ mã hóa; bọc `createSlots` để đọc số request đang chờ):
    1. TIFF khai báo `image/jpeg` và SVG khai báo `image/png` → 400; PNG và WebP vẫn 200.
    2. 4 upload cùng lúc: 2 mã hóa, 2 chờ; mở cổng thì cả 4 trả 200, tối đa 2 pipeline chạy cùng lúc.
    3. 12 upload giữ ở cổng (2 chạy, 10 chờ); upload thứ 13 → 503 `{ok:false,message:"Máy chủ đang bận, vui lòng thử lại sau"}`; mở cổng thì 12 upload trước đều 200.
- **Kiểm tra đỏ.** Tạm thay route bằng bản `a512258`: 3/9 fail đúng lý do. TIFF nhận 200. Bài 4 upload: `expected 4 to be 2`, tức route cũ chạy cả 4 pipeline cùng lúc. Bài 503: không có hàng chờ. Trả lại route mới thì 9/9 qua.
- **Gate.** `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check` **exit 0**: lint 0 lỗi (còn cảnh báo có sẵn ở `music.tsx:55`), TypeScript qua, **28 file / 213 test qua**. RAM trước khi chạy: available 3669 MB. Theo yêu cầu review, vòng này không chạy `pnpm build` (bước sau build main đã merge), không chạy server, không chạy E2E, không đụng `prisma/dev.db` hay `public/uploads`.

### Review vòng 2 — ngân sách RAM giải mã — 01/11/2026

- **Thay đổi.** `src/lib/wedding-upload.ts` thêm:
  - `MAX_UPLOAD_DECODE_BYTES = 200 MiB`.
  - `UPLOAD_IMAGE_DECODE_TOO_LARGE` (“Ảnh quá lớn để xử lý, vui lòng dùng ảnh JPEG 8-bit”).
  - `decodeCostBytes(metadata)` = rộng × cao × kênh × byte mỗi mẫu (`uchar` 1, `ushort` 2, …). Ảnh có alpha tính tối thiểu 8 byte/điểm ảnh.

  Route tách `inspect()` ra khỏi phần mã hóa. `inspect()` chạy `metadata()` rồi kiểm tra định dạng, cạnh, 64 megapixel và ngân sách, **trước khi lấy slot**. Chỉ `rotate().webp().toBuffer()` chạy trong slot. Vì vậy tệp hỏng và ảnh trên 64 megapixel cũng không còn chiếm slot.

- **Vì sao tính riêng alpha.** Công thức theo khung thô thuần cho lọt PNG RGBA 8-bit tới khoảng 52 megapixel. Đo một ảnh như vậy cần nhiều RAM hơn mọi ảnh 16-bit dưới ngân sách. Đo `sharp` 0.35.5, `limitInputPixels 64e6`, `rotate(90)`, WebP q90 effort 2, mỗi ảnh một tiến trình mới:

  | Input                                       | Khung thô | Theo ngân sách | Thời gian | Peak RSS     |
  | ------------------------------------------- | --------- | -------------- | --------- | ------------ |
  | PNG RGBA 8-bit 7200×7200 (51,8 MP, 3,9 MiB) | 198 MiB   | từ chối (×8)   | 4,8 s     | **1255 MiB** |
  | PNG RGBA 16-bit 5100×5100 (26 MP, 7,2 MiB)  | 198 MiB   | nhận           | 2,6 s     | 780 MiB      |
  | PNG RGBA 8-bit 5100×5100 (26 MP, 2,1 MiB)   | 99 MiB    | nhận (198)     | 2,3 s     | 675 MiB      |
  | JPEG RGB 8-bit 8000×8000 nhiễu (41,8 MiB)¹  | 183 MiB   | nhận           | 10 s      | 641 MiB      |
  | PNG xám 16-bit 8000×8000 (64 MP, 2,3 MiB)   | 122 MiB   | nhận           | 3,7 s     | 483 MiB      |
  | JPEG CMYK 8-bit 7200×7200 (51,8 MP, 2 MiB)  | 198 MiB   | nhận           | 6,1 s     | 461 MiB      |
  | PNG RGB 16-bit 5900×5900 (34,8 MP, 6,5 MiB) | 199 MiB   | nhận           | 2,3 s     | 426 MiB      |

  ¹ Vượt giới hạn 40 MB nên route trả 413; dùng làm cận trên cho JPEG 64 megapixel.

  Ảnh có alpha tốn khoảng 23–27 MiB/megapixel dù 8 hay 16 bit (phần alpha của WebP), nên tính 8 byte/điểm ảnh. Trường hợp xấu nhất còn được nhận là ảnh có alpha khoảng 26,2 megapixel: **khoảng 780 MiB/slot**, khớp 27 MB/MP × 26,2 + 70 MB. **2 slot khoảng 1,6 GB**, cộng ≤ 400 MB body đang chờ, thay cho 1,8 GB/3,6 GB ở vòng 1. Đã ghi vào ADR 0008 và OPERATIONS.

- **Test mới.**
  - `tests/lib/wedding-upload.test.ts` có 3 test cho `decodeCostBytes`:
    1. RGB 8-bit 5464×8192, 8192×5464 và 8000×8000 nằm trong ngân sách.
    2. RGBA 16-bit 5657×5657 (32 MP) vượt; 5100×5100 nằm trong. Ảnh 8-bit có alpha (4 hoặc 2 kênh) 5657×5657 vượt. 7200×7200 4 kênh 8-bit vượt khi `hasAlpha`, nằm trong khi không (CMYK).
    3. RGB 16-bit 5900×5900 nằm trong, 6000×6000 vượt.
  - `upload-route.test.ts`:
    - Đếm số lần lấy slot (`slots.acquired`). Chỉ pipeline có `toBuffer()` mới được tính là decode; `metadata()` chỉ đọc header.
    - Test mới: PNG RGBA 16-bit 5657×5657 (header `ushort`, 4 kênh, `hasAlpha`, dưới 40 MiB) và bản RGBA 8-bit cùng cỡ → 400 `{ok:false,message:"Ảnh quá lớn để xử lý, vui lòng dùng ảnh JPEG 8-bit"}`. Không lấy slot, không decode, không lưu file, không `reserveUpload`.
    - Test JPEG 5464×8192 kiểm thêm: lấy đúng 1 slot, decode 1 lần.
    - Test tệp hỏng / 8001×8001 kiểm thêm: không lấy slot.
- **Kiểm tra đỏ.** Tạm thay route bằng bản `895c9c7`: **2/10 fail** đúng lý do. Bài PNG 16-bit: `expected 200 to be 400`, tức route cũ mã hóa ảnh. Bài tệp hỏng / 8001×8001: `expected 2 to be +0`, tức route cũ lấy slot rồi mới từ chối. Trả lại route mới (`cmp` khớp) thì 10/10 qua. Test thư viện mới không chạy được trên `895c9c7` vì chưa có `decodeCostBytes`.
- **Gate.** `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db" pnpm check` **exit 0**: lint 0 lỗi (còn cảnh báo có sẵn ở `music.tsx:55`), TypeScript qua, **29 file / 217 test qua**. RAM trước khi chạy: available 3652 MB. Lần chạy đầu fail typecheck (`sharp.Sharp` không có trong kiểu ESM của sharp 0.35), sửa thành `import sharp, { type Sharp }`. Theo yêu cầu review, không chạy `pnpm build`, server hay E2E, không đụng `prisma/dev.db` hay `public/uploads`; ảnh đo nằm ở scratchpad và đã xóa.

## Kiểm tra trên main `5d557ec`: upload ảnh gốc, album Lời yêu, `sizes` ảnh bìa — 01/11/2026

Phạm vi: `main` tại `5d557ec`, chưa push lên `origin/main`. Gồm upload 40 MiB giữ độ phân giải gốc (`a512258`, `895c9c7`, `32ad364`); hủy giữa chừng trả 499 và hàng chờ mã hóa (`aa0c3ae`, `3b3ea70`, `fcfd0ab`); khung rộng 3:2, `object-position: 50% 12%` và `albumPhotoSizes` của album Lời yêu (`8da6a3f`, `50be4b0`, spec `e2e/album-frames.spec.ts`); `sizes` cho ảnh bìa và ảnh Câu chuyện (`a48b2c2`, spec `e2e/cover-story-sizes.spec.ts`, lần đầu được chạy). Lượt này chỉ ghi kết quả, không sửa `src/` hay spec.

- **Môi trường.**
  - Worktree riêng bắt đầu từ `5d557ec`. `node_modules` là hardlink chung với checkout chính do orchestrator tạo: không symlink, không `pnpm install`, không sửa gì trong đó.
  - `pnpm check` đặt `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db"`.
  - Server 3200 đã được dừng trước khi chạy. E2E dùng cổng 3201, `prisma/e2e.db` và `.next-e2e` của worktree như `playwright.config.ts`. Không đụng `prisma/dev.db` của checkout chính.
  - Turbopack không chạy được trong worktree này. Sandbox che một số dotfile ở gốc worktree, mà Tailwind/PostCSS trong Turbopack theo dõi cả thư mục gốc:
    - `pnpm build` (Turbopack) fail sau 9 s: `Error [TurbopackInternalError]: [project]/src/app/globals.css [app-client] (css) Caused by: - reading file "/home/ccgram/happy_wedding.worktrees/ccg-worker-499cca94/.claude/scheduled_tasks.json" - Permission denied (os error 13)`.
    - `next dev` (Turbopack): `/login` trả 500 vì `reading file …/.bash_profile`, `Permission denied (os error 13)`.
  - Vì vậy build dùng `next build --webpack`, còn e2e chạy `next dev --webpack` qua config bọc `pw.local.config.ts` (không commit, đã xóa). Config này giữ nguyên env của `playwright.config.ts`, chỉ đổi lệnh webServer. Setup trong đó là bản sao của `e2e/global-setup.ts` nhưng seed bằng `node --import tsx prisma/seed.ts`, vì CLI `tsx` lỗi `listen EPERM /tmp/claude-1001/tsx-1001/16.pipe` trong sandbox. Không sửa `next.config.ts` hay `playwright.config.ts`.
  - Kiểm chéo bằng Turbopack trên bản sao sạch `git archive 5d557ec` trong scratchpad, nơi không có dotfile bị che. Bản sao có `node_modules` symlink sang worktree và config bọc `pw.sandbox.config.ts`: Turbopack dev, `DATABASE_URL` tuyệt đối tới `prisma/e2e.db` của bản sao, `NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/`. Chỉ dùng cho hai lượt t01 và t02 và build Turbopack ghi bên dưới, đã xóa sau khi chạy.
  - Giới hạn máy: RAM 5,9 GB, swap 2 GB đầy suốt lượt (2043–2047 MB). Mỗi lần chỉ chạy một lệnh, không song song, không watch.
    - Trước build và trước mỗi lượt e2e kiểm available ≥ 1500 MB và đĩa trống ≥ 1000 MB.
    - Build và e2e đặt `NODE_OPTIONS=--max-old-space-size=1536`; Playwright chạy `--workers=1`.
    - Mỗi lượt e2e chạy dưới watchdog: mỗi 2 s ghi available, swap, đĩa trống và RSS theo nhóm tiến trình. Watchdog tự dừng lượt nếu available dưới 500 MB, đĩa dưới 300 MB, hoặc PSI `some avg10` của `user@1001.service` vượt 15.
    - Sau mỗi lượt không còn tiến trình next hay chromium nào.
- **`pnpm check`**: **exit 0, 83 s**. Lint 0 lỗi (còn cảnh báo ref có sẵn ở `music.tsx:55`), TypeScript qua, **29 file / 225 test qua** (vitest 58,8 s). Available trước khi chạy 3520 MB.
- **Build.**
  - Trong worktree: `pnpm build` (Turbopack) fail như trên. `NODE_OPTIONS=--max-old-space-size=1536 NEXT_TELEMETRY_DISABLED=1 pnpm exec next build --webpack`: **exit 0, 62 s**. Compile 22,6 s, TypeScript 12,2 s, 14/14 trang tĩnh, không cảnh báo, đủ route kể cả `/api/wedding/upload`. Available thấp nhất 2884 MB, đĩa trống thấp nhất 2018 MB. Đã xóa `.next` (238 MB) sau khi build.
  - Turbopack trên bản sao sạch `git archive 12a85f7` (HEAD nhánh kiểm, chỉ khác `5d557ec` ở file này), `node_modules` symlink sang worktree như t01/t02: `NODE_OPTIONS=--max-old-space-size=1536 NEXT_TELEMETRY_DISABLED=1 NEXT_PRIVATE_OUTPUT_TRACE_ROOT=/ pnpm build` **exit 0, 24 s**. Compile 8,1 s, TypeScript 12,3 s, 14/14 trang tĩnh, không cảnh báo, có `/api/wedding/upload`. Trước khi chạy: available 3573 MB, đĩa trống 2236 MB; thấp nhất khi chạy: 2181 MB và 2107 MB. Đã xóa bản sao cùng `.next` (119 MB).
- **E2E, mỗi file một lệnh** `pnpm exec playwright test -c pw.local.config.ts --workers=1 e2e/<file>`, webpack dev trong worktree, trừ các lượt ghi Turbopack. Thứ tự chạy như trong bảng:

  | Spec                           | Bài | Kết quả                                                    | Thời gian         | Available thấp nhất (MB) | Peak RSS `next-server` (MB) |
  | ------------------------------ | --- | ---------------------------------------------------------- | ----------------- | ------------------------ | --------------------------- |
  | `cover-story-sizes.spec.ts`    | 5   | **5 qua**                                                  | 61 s              | 1716                     | 1354                        |
  | `album-frames.spec.ts`         | 21  | **21 qua**                                                 | 221 s             | 776                      | 2249                        |
  | `wedding.spec.ts`              | 31  | **31 qua**, chia 7 lượt (29 bài webpack, 2 Turbopack)      | 648 s cộng dồn    | 785                      | 2192                        |
  | `chrome-ios-hydration.spec.ts` | 2   | **2 qua**                                                  | 39 s              | 2030                     | 1028                        |
  | `event-time-label.spec.ts`     | 1   | **1 qua**                                                  | 50 s              | 1556                     | 1315                        |
  | `insecure-context-ids.spec.ts` | 3   | webpack 2/3 ở cả hai lần chạy cả file; **Turbopack 3 qua** | 171 s, 75 s; 39 s | 1598                     | 1646                        |
  - **`cover-story-sizes.spec.ts`**: năm bài ở 390 px DPR 3, 1024 px DPR 1 và 2, 1440 px DPR 1 và 2, mất 15,8 / 6,8 / 6,9 / 6,5 / 5,5 s.
  - **`album-frames.spec.ts`**: 21 bài, gồm cả các bài khung 03 ở 1440 px cuộn nhanh/chậm. `afterAll` của spec đã xóa ảnh upload.

- **`wedding.spec.ts` chạy cả file: bị watchdog dừng.** Lệnh `… e2e/wedding.spec.ts` **bị dừng sau 92 s, exit 143, 0 kết quả**, lúc bài đầu (dòng 14) đang chạy. Available còn 355 MB, swap 2047/2047 MB, `next-server` 1906 MB. Chạy riêng bài dòng 14 với trace mặc định cũng bị dừng sau 102 s: available 485 MB, runner 687 MB, chromium 1293 MB, `next-server` 1921 MB. Vì vậy chuyển sang chạy theo lượt `file:dòng`, chia giống mục `6009b2d` ở trên: dòng 14 và 874 chung một lượt, vì bài 874 lọc đơn đã thanh toán của khách do bài 14 tạo. Tổng số bài các lượt khớp 31 bài của `--list`.

  | Lượt                                                  | Bài | Kết quả                 | Thời gian | Available thấp nhất (MB) | Đĩa trống thấp nhất (MB) | Peak RSS `next-server` (MB) |
  | ----------------------------------------------------- | --- | ----------------------- | --------- | ------------------------ | ------------------------ | --------------------------- |
  | w02, w03, w04: :14, `--trace off`, webpack            | 1   | fail cả 3 lần ở dòng 99 | 74–75 s   | 1165–1352                | 2019–2053                | 1645–1861                   |
  | t01: :14, :874, `--trace off`, Turbopack bản sao sạch | 2   | **2 qua**               | 100 s     | 785                      | 456                      | 2192                        |
  | w05: :311, :347, :397                                 | 3   | **3 qua**               | 54 s      | 1837                     | 2040                     | 1175                        |
  | w06: :437 (6 viewport)                                | 6   | **6 qua**               | 193 s     | 1221                     | 1855                     | 1445                        |
  | w07: :506, :549, :626, :650, :691                     | 5   | **5 qua**               | 56 s      | 1783                     | 1958                     | 1208                        |
  | w08: :746 (×2), :793, :812 (×2)                       | 5   | **5 qua**               | 54 s      | 1887                     | 2016                     | 1090                        |
  | w09: :986, :1017, :1078, :1192, :1221                 | 5   | **5 qua**               | 88 s      | 1609                     | 1916                     | 1175                        |
  | w10: :1260, :1340, :1379, :1416, :1438                | 5   | **5 qua**               | 103 s     | 1282                     | 1886                     | 1170                        |

  Tính theo bài: 2 (t01) + 3 + 6 + 5 + 5 + 5 + 5 = **31 qua**, nhưng bài dòng 14 chỉ qua trên Turbopack.

- **Bài dòng 14 fail trên webpack dev.**
  - Cả 3 lần (w02–w04) fail ở `wedding.spec.ts:99`, `expect(admin).toHaveURL(/\/admin$/)`: trang admin vẫn ở `http://127.0.0.1:3201/login`, ô mật khẩu trống.
  - Log webServer của w04 (`DEBUG=pw:webserver`): `POST /api/auth/login 200`, rồi `GET /login` (đang biên dịch lại, 1273 ms), xen với các lần refresh trang của khách ở context khác. **Không có `GET /admin`.** Tức là đăng nhập thành công, nhưng `router.push("/admin")` rồi `router.refresh()` ở `src/components/wedding/auth-form.tsx:37-38` bị một lần refresh do HMR của webpack đè lên.
  - Chạy tay luồng đăng nhập admin trên webpack dev khi không có gì khác chạy thì qua ở mọi cách: cold, đã hydrate, warm, có và không làm nóng API trước. Chỉ fail trong bài 14, khi các context khác làm `next dev` biên dịch route mới đúng lúc bấm.
  - Cùng hai bài 14 và 874 trên Turbopack ở bản sao sạch: **qua 2/2** (t01). Ở mục `6009b2d` bài này cũng qua trên Turbopack.
- **`insecure-context-ids.spec.ts` trên webpack dev.** Hai bài đầu qua ở mọi lần. Bài 3 (checkout, dòng 115) fail hai lần, mỗi lần một kiểu, đều ở bước đăng ký khách (`registerCustomer`), trước phần checkout:
  - **Lần 1 (i01):** timeout 120 s ở `insecure-context-ids.spec.ts:37`, chờ ô “Tên của bạn”. Trace cho thấy `GET /account/register` trả **500** sau 7 s với `SyntaxError: Unexpected end of JSON input at loadManifest (next/dist/server/load-manifest.external.js:54)`: dev server đọc một manifest trong `.next-e2e` lúc webpack đang ghi dở. Bài 1 của cùng lượt vẫn đăng ký được qua đúng trang này.
  - **Chạy lại riêng bài 3** bằng `-g "checkout creates an order"` (i02): **qua**, 30,7 s.
  - **Chạy lại cả file (i03):** bài 3 fail ở `insecure-context-ids.spec.ts:44`, `toHaveURL(/\/dashboard$/)`, vẫn ở `/account/register` sau 20 s. Trace có `POST /api/customer-auth/register` 200, `POST /api/customer-auth/login` 200, `GET /dashboard?_rsc=…` 200. Ngay sau cú bấm có hai request `*.webpack.hot-update.json` và console “[Fast Refresh] rebuilding”, rồi trang không chuyển. Cùng cơ chế với bài dòng 14, ở nhánh `register` của `auth-form.tsx:37-38`.
  - **Cả file trên Turbopack** ở bản sao sạch (t02): **3/3 qua, 39 s**.
  - Trace và screenshot của các lần fail nằm trong scratchpad của phiên (`w02-14-test-results`, `i01-test-results`, `i03-test-results`), không commit.
- **Kết luận về các fail.** Cả ba kiểu fail đều ở `next dev --webpack`: refresh do HMR đè `router.push` sau đăng nhập (bốn lần), và đọc manifest khi đang ghi dở (một lần). Không có fail nào ở code của các commit đang kiểm. Cùng các bài đó qua trên Turbopack, và bài checkout qua khi chạy lại. Không sửa code sản phẩm hay spec. Đề xuất, chưa làm:
  - Chạy e2e bằng Turbopack mặc định ở nơi Turbopack đọc được thư mục gốc, tức checkout không có dotfile bị sandbox che.
  - Nếu buộc phải dùng webpack dev: trong spec, làm nóng `/admin` và `/dashboard` (ví dụ `page.request.get`) trước khi bấm đăng nhập, để không còn route nào phải biên dịch giữa lúc điều hướng.
  - Chưa kiểm trên bản production (`next start`), vì production từ chối chạy khi thiếu Redis, HMAC, proxy và origin công khai (xem đầu file). Production không có HMR, nhưng lượt này không đo.
- **RAM và đĩa.** Swap đầy suốt lượt (2043–2047/2047 MB). Trong các lượt tính vào kết quả, available thấp nhất 776 MB (album) và 785 MB (t01). PSI `some avg10` cao nhất 2,37 (lượt cả file `wedding.spec.ts`); oomd không giết gì. Đĩa trống thấp nhất 456 MB ở cuối lượt Turbopack t01, khi `.next-e2e` của bản sao lên 498 MB; xóa xong thì về 2089 MB. Các lượt webpack thấp nhất 1710 MB.
- **Dọn dẹp.** Đã xóa `.next`, `.next-e2e`, `playwright-report`, `test-results`, `prisma/e2e.db*`, `prisma/prisma/test.db*`, `public/uploads` do các lượt e2e tạo, `pw.local.config.ts` và bản sao sạch. Sau cùng: đĩa trống 2237 MB, available 3457 MB. Commit này chỉ có `docs/VERIFICATION.md`.
- **Chưa làm.**
  - Chưa chạy được `wedding.spec.ts` hay full e2e thành một lệnh: `next dev` cộng chromium vượt RAM khi swap đã đầy.
  - Bài dòng 14 của `wedding.spec.ts` chưa xanh trên webpack dev (0/3), chỉ xanh trên Turbopack ở bản sao sạch. Bài checkout của `insecure-context-ids.spec.ts` chập chờn trên webpack dev (qua 1/3).
  - Chưa chạy `pnpm test:e2e` nguyên bản (không qua config bọc). Build Turbopack chỉ qua trên bản sao sạch, chưa qua trong worktree. Chưa thử production, Safari hay điện thoại thật.

## 01/11/2026 — gộp RSVP, liên kết, hộp quà, bản đồ (main `0b3581b`)

Phạm vi: `main` tại `0b3581b`, chưa push lên `origin/main`. Gồm khoanh tròn mọi ngày tiệc trên lịch tháng (`40d66e8`); RSVP chọn bên rồi chọn ngày bằng radio thật, nút −/+ số người (`9afd0a1`); link dạng chip và nút (`01a5710`); hộp quà sao chép số tài khoản qua http bằng `execCommand`, QR vẽ trong trang, lớp phóng to có “Tải ảnh QR” (`3221aee`, spec mới `e2e/gift-copy-zoom.spec.ts`); một bản đồ Google Maps cho mỗi địa điểm dưới `#lich-tiec`, CSP `frame-src` cho `maps.google.com` và `www.google.com` (`f503811`); chỉ nhận đường dẫn bản đồ trên `maps.google.com` và bỏ CSS chết của hộp quà (`0b3581b`). Lượt này chỉ ghi kết quả, không sửa `src/` hay spec.

- **Môi trường.**
  - Worktree riêng từ `0b3581b`. `node_modules` là hardlink chung với checkout chính do orchestrator tạo.
  - **Server 3200 (thiệp thật, `next dev` từ checkout chính) chạy suốt lượt**, khác các mục trước. Vì thế available lúc nghỉ chỉ khoảng 2,8 GB, so với khoảng 3,5 GB ở mục `5d557ec`. Swap đầy 2047/2047 MB suốt lượt.
  - Mỗi lệnh Bash chạy trong namespace PID và mạng riêng của sandbox, nên dev server e2e được khởi động trong cùng lệnh với Playwright, không qua `webServer`. Config bọc nằm trong scratchpad của phiên, không commit. Nó giữ env của `playwright.config.ts` (cổng 3201, `.next-e2e`, `CSP_MODE=report-only`, hash mật khẩu admin e2e) và chỉ đổi `DATABASE_URL` thành đường dẫn tuyệt đối tới `prisma/e2e.db` của worktree.
  - Trước mỗi lượt: xóa `prisma/e2e.db*`, chạy `prisma db push --skip-generate`, seed bằng `node --import tsx prisma/seed.ts` (CLI `tsx` lỗi `listen EPERM` trong sandbox như mục trước).
  - Server là `next dev --webpack`. Turbopack không đọc được thư mục gốc worktree vì dotfile bị sandbox che (xem mục `5d557ec`). Bản sao sạch chạy Turbopack cần khoảng 2,2 GB cho `next-server`, không vừa khi 3200 còn chạy.
  - Watchdog mỗi 2 s ghi available, swap, PSI và RSS của `next-server`, chromium, runner. Nó dừng lượt khi available dưới 500 MB (lượt 1, 2a) hoặc 350 MB (các lượt sau), hoặc khi PSI `some avg10` của `user@1001.service` vượt 15. Mỗi lần chỉ một dev server và một trình duyệt. Sau mỗi lượt không còn tiến trình next hay chromium nào.
- **`pnpm check`** với `TEST_DATABASE_URL="file:$PWD/prisma/prisma/test.db"`: **exit 0, 99 s**. Lint 0 lỗi (còn cảnh báo ref có sẵn ở `music.tsx:55`), TypeScript qua, **37 file / 351 test qua** (vitest 74,4 s). Available trước khi chạy 2815 MB, thấp nhất 2163 MB.
- **E2E**, mỗi lượt `pnpm exec playwright test -c <config bọc> --workers=1 <spec:dòng>` trên webpack dev, theo thứ tự chạy:

  | Lượt | Spec:dòng, cách chạy                                                                | Kết quả                                      | Thời gian | Available thấp nhất (MB) | Peak RSS `next-server` (MB) |
  | ---- | ----------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ------------------------ | --------------------------- |
  | 1    | `wedding.spec.ts:14`, làm nóng mọi route bằng curl, `--max-old-space-size=1536`     | watchdog dừng (exit 143) sau đăng nhập admin | 65 s      | 457                      | 1815                        |
  | 2a   | `gift-copy-zoom.spec.ts`, làm nóng bằng curl                                        | fail ở `:26` (HMR)                           | 28 s      | 911                      | 1673                        |
  | 2a   | `wedding.spec.ts:564`                                                               | **qua** (4,6 s)                              | 7 s       | 688                      | 1772                        |
  | 2b   | `wedding.spec.ts:14`, `--trace off`, làm nóng 21 route bằng curl                    | fail ở `:27` (HMR)                           | 28 s      | 385                      | 2269                        |
  | 3    | `gift-copy-zoom.spec.ts`, server mới, không làm nóng                                | **qua** ngay lần đầu (42,5 s)                | 46 s      | 633                      | 1660                        |
  | 3    | `wedding.spec.ts:14`, `--retries=1`, giữ trace khi fail                             | watchdog dừng (exit 143) ở `/admin/settings` | 72 s      | 269                      | 1830                        |
  | 4    | `wedding.spec.ts:14`, `--trace off`, chromium `--renderer-process-limit=1`, tắt GPU | fail ở `:73` (manifest)                      | 54 s      | 650                      | 1792                        |

  Kết quả theo yêu cầu: **`gift-copy-zoom.spec.ts` qua** (lượt 3), **`wedding.spec.ts:564` qua** (lượt 2a), **`wedding.spec.ts:14` chưa qua (0/4)**.

- **`gift-copy-zoom.spec.ts` fail ở lượt 2a**: `gift-copy-zoom.spec.ts:26`, `expect(page).toHaveURL(/\/dashboard$/)` nhận `http://127.0.0.1:3201/account/register` sau 20 s. Log server có `POST /api/customer-auth/register 200`, `POST /api/customer-auth/login 200`, `GET /dashboard 200`, nhưng trang không chuyển. Đây là refresh do HMR của webpack dev đè `router.push(next); router.refresh();` ở `src/components/wedding/auth-form.tsx:37-38`, đã ghi ở mục `5d557ec`. Lỗi của môi trường test, không phải của sản phẩm. Trên server mới không làm nóng (lượt 3), spec qua ngay lần đầu, không dùng retry. Bài kiểm đủ: hai thẻ bằng nhau, không cuộn trong, mỗi thông tin hiện một lần, QR SVG vẽ trong trang, sao chép bằng `execCommand` khi không có `navigator.clipboard`, lớp phóng to có PNG rộng hơn 280 px, “Tải ảnh QR” tải PNG, Esc chỉ đóng lớp phóng to, bấm nền để đóng, không có request tới `vietqr.io`.
- **`wedding.spec.ts:14` chưa xanh.** Bốn lần, ba kiểu lỗi, đều do môi trường:
  - **RAM (lượt 1 và 3).** `next-server` khoảng 1,8 GB, chromium 0,8–0,9 GB và runner 0,5–0,9 GB cộng lại vượt khoảng 2,8 GB còn trống khi 3200 đang chạy. Lượt 3 đi xa nhất: đăng ký, tạo nháp, upload ảnh, tạo đơn, ghi chú thanh toán, đăng nhập admin, `/admin/settings`. Lúc dừng: available 269 MB, `next-server` 1830 MB, chromium 912 MB, runner 862 MB. Ở lượt 1, `next dev` còn tự khởi động lại sau khi làm nóng (“Server is approaching the used memory threshold, restarting...”).
  - **HMR đè `router.push` (lượt 2b).** `wedding.spec.ts:27`, `expect(page).toHaveURL(/\/dashboard$/)` nhận `http://127.0.0.1:3201/account/register` sau 20 s. Cùng cơ chế như lượt 2a. Làm nóng route bằng curl không giúp: cả hai lượt có làm nóng đều hỏng kiểu này hoặc hết RAM, nên các lượt sau bỏ bước làm nóng.
  - **Manifest đang ghi dở (lượt 4).** `wedding.spec.ts:73`: `getByRole('alert').filter({ hasText: 'Cần thanh toán' })` không thấy sau 20 s. Trang hiện alert `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`. Log server: `⨯ Error: Manifest file is empty` với `page: '/api/wedding/publish'`, rồi `POST /api/wedding/publish 500 in 6.6s`. Đây là lần đầu `next dev` biên dịch route publish, cùng loại với lỗi `loadManifest` ở mục `5d557ec`.
  - Không lần nào tới phần RSVP của bài (chọn Nhà gái, Nhà trai, chip ngày, “Thêm một người”, gửi) hay phần hộp quà của khách. Không lỗi nào nằm trong code của các commit đang kiểm, và không sửa code hay spec. Muốn bài này xanh cần dừng server 3200 trong lúc chạy (trả lại khoảng 1 GB), rồi chạy bằng Turbopack trên bản sao sạch như mục `5d557ec` (ở đó bài 14 qua) hoặc ở checkout không có dotfile bị che.
- **Xem thiệp thật** `http://160.250.247.137:3200/w/vu-tu-nguyen-ngoc`, chỉ đọc.
  - Playwright chromium qua proxy của sandbox, hai context: 390×844 DPR 2 (`isMobile`, `hasTouch`) và 1440×900, locale `vi-VN`. Script hủy mọi request không phải GET tới 3200 và ghi lại: **0 request bị hủy** ở cả hai cỡ. Không gửi form nào: RSVP chỉ chọn “Có, mình sẽ tham dự”, không điền tên, không bấm gửi; không đụng form lời chúc. Không bấm “Tải ảnh QR”, “Chỉ đường đến tiệc” hay “Thêm tiệc này vào lịch”.
  - Ảnh lưu ở `.verify-shots/kiem-tra-cuoi/` (không commit), tên `<cỡ>-<mục>.png`. Trang chạy http nên `isSecureContext=false` và không có `navigator.clipboard`.
  - **Màn mở đầu** (`01-opening`): nút “Xem ngay, bỏ qua hiệu ứng” nằm trọn trong màn hình ở cả hai cỡ; bấm vào thì lớp mở đầu ẩn.
  - **Thanh trên** (`02-topbar`, `02-topbar-nav`): bốn chip “Lịch tiệc & chỉ đường”, “Xác nhận tham dự”, “Album ảnh”, “Mừng cưới”, bo `999px`, cao 44 px. Ở 390 hàng chip cuộn ngang, chip thứ ba lộ một phần ở mép phải. Ở 1440 đủ bốn chip ở giữa. Trang không cuộn ngang ở cả hai cỡ.
  - **Lịch tháng** (`03-calendar`): “Tháng 11 · 2026”, ngày 8 (CN, `data-wedding-day`, “Tiệc cưới nhà trai: 8/11/2026”) và ngày 9 (T2, `data-event-day`, “Lễ thành hôn nhà trai: 9/11/2026”) **đều được khoanh tròn**. Vòng đã vẽ xong (`stroke-dashoffset: 0`, opacity 1) ở cả hai cỡ.
  - **Thẻ tiệc và bản đồ** (`04a-event-cards`, `04b-map`): hai thẻ tiệc nhà trai, mỗi thẻ có nút “Chỉ đường đến tiệc” (`target=_blank`, `rel="noopener noreferrer"`, mở link Google Maps cặp đôi đã lưu) và “Thêm tiệc này vào lịch”. Khối “Đường đến tiệc” có **một** bản đồ cho Nhà trai, gộp cả hai tiệc vì cùng địa điểm; nhà gái chưa có tiệc nên không có bản đồ. Iframe tải xong sau khoảng 6 s, frame chuyển sang `www.google.com`, kích thước 330×243 ở 390 và 740×455 ở 1440. **Google hiện bản đồ có ghim đỏ** ở cả hai cỡ, không bị chặn. Không có sự kiện `securitypolicyviolation` nào; CSP của 3200 đang ở chế độ report-only.
  - **RSVP** (`05-rsvp`) sau khi chọn “Có, mình sẽ tham dự”: không có nhóm “Bạn đến dự bên nào?” vì thiệp chỉ có tiệc nhà trai. Nhóm “Bạn đến vào ngày nào?” có hai chip **“Chủ nhật · 08/11”** (16:00 · Tiệc cưới nhà trai, chọn sẵn) và **“Thứ hai · 09/11”** (Buổi sáng · Lễ thành hôn nhà trai). Stepper “Số người tham dự” hiện “1 người”, nút − mờ. Chip xếp dọc ở 390, nằm cạnh nhau ở 1440. **Sau lượt này, theo yêu cầu của chủ thiệp, form đã bỏ nhóm “Bạn đến vào ngày nào?” cùng các chip ngày, và bỏ lựa chọn “Mình sẽ xác nhận sau”** (xem mục “RSVP chỉ hỏi tham dự, bên và số người” bên dưới).
  - **Hộp quà** (`06a-gift-closed`, `06b-gift-open`): dialog “Hộp quà yêu thương” có hai thẻ Nhà trai và Nhà gái cạnh nhau ở cả hai cỡ. Mỗi thẻ hiện tên chủ tài khoản, ngân hàng và số tài khoản **đúng một lần**. QR là SVG data URL vẽ trong trang, **không có `<text>` hay `<foreignObject>`**, tức không có chữ trong ảnh QR. Dialog không cuộn trong (`scrollHeight` = `clientHeight`).
  - **Sao chép qua http** (`08-copied`, `08-copied-400ms`): bấm “Sao chép STK” của nhà trai thì nút thành “Đã sao chép” có dấu ✓, status đọc “Đã sao chép số tài khoản nhà trai.”, không có alert lỗi. Từ 400 ms nút là chữ trắng trên nền màu của bên. Không kiểm nội dung clipboard.
  - **Phóng to QR** (`07-qr-zoom`, `07b-after-esc`): bấm QR thì mở dialog “Mã QR mừng cưới nhà trai”, ảnh PNG 492×492 hiển thị rộng 322 px ở 390 và 400 px ở 1440, có “Tải ảnh QR” và “Nhấn giữ ảnh để lưu vào máy”, focus ở nút đóng. **Esc lần đầu chỉ đóng lớp phóng to**: hộp quà vẫn mở, focus trở về nút QR. Esc lần hai đóng hộp quà.
  - **Console và mạng**: không có lỗi hay cảnh báo console, không có `pageerror`, không có phản hồi ≥ 400. Ở 390 có 3 request `/_next/image` bị `net::ERR_ABORTED`: trình duyệt hủy ảnh lazy khi script cuộn nhanh. Ở 1440 không có request nào lỗi.
- **Chỗ chưa đẹp, không thuộc bốn tính năng.**
  - Thiệp thật đang chạy bằng `next dev`, nên khách thấy nút “Open Next.js Dev Tools” (chữ N) ở góc dưới trái (`390-02-topbar.png`, `1440-02-topbar.png`).
  - Ở 390, nút nhạc nổi và nút N đè lên hai góc dưới của bản đồ khi bản đồ nằm cuối màn hình, che một phần nút ảnh vệ tinh và link “Điều khoản” của Google (`390-04b-map.png`).
  - Nút “Sao chép STK” chuyển màu trong 0,18 s. Giữa chừng chữ và nền gần cùng màu, nên nút trông như một viên trống trong chốc lát (`390-08-copied.png`, chụp ngay sau khi bấm). Rất nhỏ.
  - Ở 390, nút “Xác nhận tham dự ↓” đầu trang và chip “Xác nhận tham dự” ngay bên dưới cùng trỏ tới `#rsvp` (`390-02-topbar.png`).
  - Vạch ngang giữa vài ảnh chụp theo phần tử (`390-06a-gift-closed.png`, `390-04a-event-cards.png`) là thanh tiến độ đọc `.wedding-progress` (fixed, cao 3 px) bị Playwright chèn vào khi ghép ảnh, không phải lỗi trang.
- **RAM và đĩa.** Swap đầy suốt lượt. Trong các lượt tính vào kết quả, available thấp nhất 633 MB (lượt 3, hộp quà) và 688 MB (lượt 2a, dòng 564). PSI `some avg10` cao nhất 1,28; oomd không giết gì. Watchdog dừng hai lượt bài 14 (457 MB, 269 MB). Đĩa trống thấp nhất khoảng 1,5 GB.
- **Dọn dẹp.** Đã xóa `.next-e2e` (175 MB), `prisma/e2e.db*`, `prisma/prisma/test.db*` và `public/uploads` (3 ảnh do bài 14 upload). Config bọc, script, log và trace nằm trong scratchpad của phiên. Server e2e đã dừng, không còn tiến trình next hay chromium. Sau cùng: available khoảng 2,8 GB, đĩa trống khoảng 1,7 GB. Commit này chỉ có `docs/VERIFICATION.md`.
- **Chưa làm.**
  - Bài dòng 14 của `wedding.spec.ts` chưa xanh (0/4 trên webpack dev khi 3200 đang chạy), nên luồng RSVP đầy đủ (chọn bên, chip ngày, stepper, gửi, duyệt, xuất CSV) chưa được e2e xác nhận trên `0b3581b`. Trên thiệp thật mới chỉ xem, chưa gửi.
  - Chưa chạy `pnpm build`, full e2e, hay `pnpm test:e2e` nguyên bản. Chưa chạy các bài liên quan khác như `wedding.spec.ts:827` (hộp quà trên các mẫu) và `:1236` (Lời yêu khoanh ngày cưới).
  - Chưa thử production, Safari hay điện thoại thật. Chưa quét QR bằng app ngân hàng, chưa mở link chỉ đường hay tệp lịch.

---

## 01/11/2026 — RSVP chỉ hỏi tham dự, bên và số người

Phạm vi: form RSVP của mọi thiệp bỏ nhóm “Bạn đến vào ngày nào?” cùng các chip ngày, và bỏ lựa chọn “Mình sẽ xác nhận sau”, theo yêu cầu của chủ một thiệp đang chạy (quyết định của chủ sản phẩm, không có cài đặt riêng từng thiệp). Khách chỉ trả lời có/không, bên nào (khi thiệp có tiệc của cả hai nhà) và số người. Payload giữ nguyên dạng: `eventIndex` là chỉ số gốc của tiệc đầu tiên thuộc bên đã chọn, 0 khi không tham dự. `responseSchema` vẫn nhận `undecided`; kiểm tra `eventIndex` ở server, nhãn “Chưa rõ”/“Chưa quyết định” và bộ đếm của dashboard giữ nguyên cho phản hồi cũ. Danh sách phản hồi ở dashboard và cột “Tiệc” của CSV ghi “Nhà trai”/“Nhà gái” khi tiệc khách đến có bên; tiệc chung và phản hồi không tham dự giữ cách hiện cũ.

- **`pnpm check`**: exit 0. Lint 0 lỗi (còn cảnh báo ref có sẵn ở `music.tsx:55`), TypeScript qua, **41 file / 391 test qua**.
- **Test đơn vị** (dữ liệu giả, tên “Bạn Lan”, “Khách Một”…):
  - `tests/components/rsvp-form.test.tsx`, 9 test: nhóm tham dự có đúng hai radio, không có “Mình sẽ xác nhận sau” hay `value="undecided"`; không có câu hỏi ngày, ô `eventIndex` hay thẻ `<time>`; thiệp hai bên (nhà trai ở chỉ số 0–1, nhà gái ở 2–3) chọn Nhà gái gửi `eventIndex: 2`, quay lại Nhà trai gửi 0; tiệc chung tính cho cả hai bên; không tham dự thì ẩn bên và số người, gửi `eventIndex: 0`, `partySize: 1`.
  - `tests/server/wedding/export-csv.test.ts`, mới: cột “Tiệc” ghi “Nhà gái”/“Nhà trai” cho khách đến tiệc có bên; tiệc chung, phản hồi `declined`/`undecided` và tiệc đã xóa giữ số thứ tự tiệc.
- **E2E**: `e2e/wedding.spec.ts` (bài dòng 14) đổi luồng RSVP sang hai lựa chọn còn lại, kiểm không có câu hỏi ngày, ô “Tiệc” của dashboard và CSV ghi “Nhà trai”. **Chưa chạy** vì máy thiếu RAM.
- **Chưa làm.** Chưa chạy e2e, `pnpm build` hay xem trên trình duyệt. Không đụng server 3200, DB thật hay thiệp thật; không gửi form nào.

---

## 01/11/2026 — Lời chúc đã ẩn vẫn là đã duyệt

Phạm vi: bảng “Phản hồi & lời chúc” ở `/dashboard/[id]/guests`. Theo yêu cầu của chủ thiệp, ẩn lời chúc chỉ gỡ nó khỏi thiệp, không làm nó trông như chưa đọc. Chỉ `pending` là chưa duyệt; `hidden` là đã duyệt nhưng không hiện trên thiệp. DB giữ `pending`/`approved`/`hidden`, không migration; API `moderate` và trang công khai (chỉ hiện `approved`) không đổi. Nhãn riêng cho lời chúc nằm ở `src/app/dashboard/[id]/guests/wish-moderation.tsx`; `STATUS_LABELS` chung giữ “Chờ xác nhận”/“Đã ẩn” cho đơn hàng. Không sửa `globals.css`: dùng lại `.badge.approved`, `.fine`, `.table-actions`.

| Trạng thái | Huy hiệu              | Ghi chú cạnh huy hiệu  | Nút                                        |
| ---------- | --------------------- | ---------------------- | ------------------------------------------ |
| `pending`  | “Chưa duyệt” (màu be) | —                      | “Duyệt lời chúc” → approved, “Ẩn” → hidden |
| `approved` | “Đã duyệt” (xanh)     | “Đang hiện trên thiệp” | “Ẩn khỏi thiệp” → hidden                   |
| `hidden`   | “Đã duyệt” (xanh)     | “Đã ẩn khỏi thiệp”     | “Hiện lại trên thiệp” → approved           |

- **Rà soát chỗ đếm/tô lời chúc chưa duyệt.** Chỉ trang khách mời đọc `wishStatus` để hiện huy hiệu. Không có bộ đếm “chờ duyệt”, bộ lọc hay cột CSV nào về trạng thái lời chúc. Dashboard tổng quan (`src/app/dashboard/page.tsx`) chỉ đếm phản hồi và số khách; CSV (`/api/wedding/export/[id]`) không xuất `wishStatus`; báo cáo admin (`src/server/wedding/reporting.ts`) và các trang `/admin` không đọc `GuestResponse`. Bộ đếm “Chưa quyết định” ở trang khách mời là attendance `undecided`, không phải trạng thái lời chúc.
- **`pnpm check`**: exit 0, 122 s. Lint 0 lỗi (còn cảnh báo ref có sẵn ở `music.tsx:55`), TypeScript qua, **43 file / 400 test qua**. Available trước khi chạy 1528 MB.
- **Test mới** (dữ liệu giả):
  - `tests/components/wish-moderation.test.tsx`, 6 test: huy hiệu, lớp `badge`, ghi chú và nút cho từng trạng thái; mỗi nút gửi đúng status; trạng thái lạ coi như chưa duyệt; `STATUS_LABELS.pending`/`hidden` giữ nguyên.
  - `tests/server/wedding/moderate-wish.test.ts`, 3 test trên DB test: chủ thiệp đổi pending → approved → hidden → approved; khách hàng khác nhận 404 và không đổi được (cả hidden → approved và approved → hidden); gửi `pending` nhận 400.
- **E2E**: `e2e/wedding.spec.ts:250` vẫn bấm “Duyệt lời chúc” rồi chờ “Đã duyệt”, khớp nhãn mới; không sửa spec. **Chưa chạy** vì máy thiếu RAM.
- **Chưa làm.** Chưa chạy e2e, `pnpm build` hay xem trên trình duyệt. Không đụng server 3200 hay DB thật.
