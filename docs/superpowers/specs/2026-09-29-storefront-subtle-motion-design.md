# Thiết kế chuyển động tinh tế cho cửa hàng online

Ngày: 2026-09-29

## Mục tiêu và phạm vi

Làm cho cửa hàng online và luồng mua hàng có phản hồi rõ, mượt, nhất quán mà không gây chậm thao tác. Tập trung vào hover/focus, thêm giỏ, bộ lọc, thay đổi trạng thái và mở/đóng lớp phủ. Không làm hiệu ứng khi cuộn, không thêm chuyển cảnh toàn trang, không thiết kế lại giao diện, không thay đổi logic đặt hàng, giá, tồn kho hoặc quản lý focus. POS và admin giữ nguyên, ngoại trừ những quy tắc dùng chung đã có sẵn.

## Hiện trạng và ranh giới

- `src/app/globals.css` đã có utility chuyển động, carousel, dropdown, dialog và quy tắc `prefers-reduced-motion`. Không nhân đôi hoặc ghi đè animation của các thành phần dùng chung nếu không cần.
- `src/features/online-store/cart-feedback.tsx` đã có thông báo thêm giỏ nhưng chỉ có transition không có thay đổi trạng thái đầu/cuối; cần hiệu ứng hiển thị và đóng thông báo thực sự.
- `src/features/online-store/catalog-filters.tsx` dùng trạng thái lọc và đồng bộ URL; `src/features/online-store/catalog-browser.tsx` dùng transition và skeleton. Không để nội dung bị ẩn hoặc bị nhấp nháy khi người dùng gõ tìm kiếm.
- `src/features/online-store/cart-drawer.tsx` dùng Sheet và có hoàn tác xóa hàng. Không thay đổi vòng đời mở/đóng, thao tác hoàn tác hoặc quản lý focus của Sheet.

## Phương án

Ưu tiên CSS với các utility có tên riêng cho storefront và lớp trạng thái có sẵn trên thành phần tương tác; không thêm thư viện animation hay biến toàn bộ trang thành client component. Thời lượng tham chiếu: 100–150 ms cho nhấn/chọn, 150–200 ms cho thay đổi màu/opacity, 180–240 ms cho nội dung/lớp phủ. Chỉ animate opacity, transform, màu và bóng khi hợp lý; không animate chiều cao của danh sách lớn, không dùng `transition-all`, không giữ `will-change` thường trực trên nhiều phần tử. Nếu hiệu ứng đã tồn tại và ổn định, dùng lại thay vì xếp thêm một animation.

### Thẻ sản phẩm và điều khiển

Áp dụng hover/focus-visible cho thẻ hoặc nút bấm có hành động thực; giữ lưới ổn định, không phóng to hoặc nâng cả thẻ làm chồng lấn hàng bên cạnh. Nút thêm giỏ, yêu thích, chọn danh mục và lựa chọn giá nhận phản hồi tức thời bằng màu/viền/scale rất nhẹ khi nhấn. Trạng thái disabled hoặc đang gửi yêu cầu không có hover đánh lừa. Bàn phím vẫn nhìn thấy focus rõ ràng; màn hình cảm ứng không phụ thuộc hover để biết trạng thái.

### Bộ lọc và danh sách

Chips lọc đổi trạng thái bằng màu/viền ngắn và giữ `aria-pressed` là nguồn chân lý. Vùng lọc mở/đóng chỉ dùng animation của thành phần disclosure phù hợp, đảm bảo nội dung ẩn không nhận focus. Kết quả lọc giữ skeleton/empty state đang có; nếu có chuyển đổi, chỉ fade rất ngắn cho trạng thái thay đổi, không fade mỗi phím gõ, không che nội dung ban đầu và không tạo animation trên toàn bộ danh sách khi nhập nhanh. URL, thứ tự sản phẩm và số kết quả không thay đổi.

### Giỏ hàng và thanh toán

Thông báo thêm giỏ hiện ra bằng opacity + dịch chuyển vài pixel, với thông điệp, nút xem giỏ và nút đóng có thể dùng ngay. Đóng thủ công hoặc hết giờ có thể có exit animation ngắn; hoàn tất unmount sau khi hết animation, hủy timer cũ khi thông báo mới đến và không làm mất thông báo mới vì callback cũ. Thông báo lỗi/cảnh báo vẫn dễ đọc, không phụ thuộc màu hoặc animation. Ngăn giỏ, xem nhanh và dialog thanh toán tận dụng chuyển động lớp phủ hiện có; nếu Sheet thiếu trạng thái đóng/mở, chỉ thêm theo `data-*` của thư viện, không dựng lớp phủ mới hoặc can thiệp focus. Trong giỏ, cập nhật số lượng/tổng tiền phản hồi nhẹ, không animate con số tiền hoặc di chuyển hàng khiến người dùng bấm nhầm; giữ hoàn tác hoạt động.

### Loading, lỗi và tính tiếp cận

Không trì hoãn nội dung SSR/ISR để phát animation. Giữ nguyên trạng thái loading/error và thông báo sống; nếu skeleton có shimmer, không thêm pulse đồng thời. Khi `prefers-reduced-motion: reduce`, tất cả chuyển động mới gần như tức thì, nội dung và thông báo vẫn hiển thị đầy đủ, timer và hành động vẫn hoạt động. Tránh hiệu ứng lặp vô hạn mới; không dùng cuộn/parallax/autoplay mới.

## Luồng dữ liệu và lỗi

Animation là lớp trình bày dựa vào trạng thái hiện tại của cart, filter, voucher hoặc disclosure. Không được tạo trạng thái nghiệp vụ song song. Riêng thông báo thêm giỏ có thể cần trạng thái trình bày ngắn để chờ exit animation; sự kiện thông báo mới phải thắng timer đóng cũ. Trường hợp yêu cầu thất bại giữ nguyên feedback lỗi hiện tại, không biến thành trạng thái thành công do animation. Chuyển trang hoặc unmount phải dọn timer để tránh cập nhật component đã hủy.

## Kiểm chứng và tiêu chí chấp nhận

1. Thêm giỏ: thông báo xuất hiện rõ, có thể đóng/xem giỏ; thông báo liên tiếp không bị timer cũ làm mất; lỗi/cảnh báo hiển thị đúng.
2. Bộ lọc: thao tác bàn phím/chuột/cảm ứng phản hồi rõ; `aria-pressed`, URL, số kết quả và danh sách vẫn đúng; gõ nhanh không gây giật hay ẩn cả trang.
3. Mở/đóng giỏ và quick view: không bị chồng animation, focus và hoàn tác vẫn hoạt động; checkout không nhấp nháy khi trạng thái thay đổi.
4. Giảm chuyển động: kiểm tra bằng Playwright hoặc thủ công với giả lập reduced motion; không còn chuyển động đáng kể và không mất nội dung.
5. Viết kiểm thử trước khi sửa hành vi của feedback/timer; mở rộng kiểm thử CSS motion và E2E cho các hành động chính. Chạy kiểm thử tập trung trước, sau đó `pnpm check && pnpm build`; E2E phù hợp chạy riêng theo quy ước dự án.
