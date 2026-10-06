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
