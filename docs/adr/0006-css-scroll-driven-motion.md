# ADR 0006 — Chuyển động theo cuộn bằng CSS scroll timeline

Date: 2026-10-22. Status: Accepted / implemented.

## Context

Thiệp mẫu `/w/thiep-mau` (Lời yêu, layout editorial, palette rose) vẫn giật khi cuộn trên điện thoại. `InvitationMotion` cũ nghe sự kiện `scroll`, mỗi frame đọc `getBoundingClientRect` của từng chương ảnh rồi ghi lại biến CSS (`--photo-progress`, `--story-drift`…), nên trình duyệt phải tính style/layout đồng bộ trên main thread. Đo bằng `scripts/perf/scroll-trace.ts` (Chromium dev, CPU chậm 4×, mobile 390×844): 66,8% frame trên 33 ms, 171 lần forced style/layout (603 ms) và 23 long task. Hai mươi bốn cánh hoa rơi chạy animation vô hạn kể cả khi đã cuộn qua hero.

## Decision

1. **Không chạy JavaScript theo từng frame cuộn.** Thanh tiến trình đọc `scroll(root)`; chương ảnh dùng `view-timeline: --chapter` với `view-timeline-inset` bằng khoảng ghim, mọi chuyển động theo cuộn khai báo trong `src/components/wedding/invitation-motion.module.css`. Chỉ animate `opacity` và các thuộc tính `translate`/`scale`/`rotate` riêng, để compositor xử lý và không ghi đè transform riêng của từng thiết kế.
2. **Chương ảnh ghim giữa màn hình.** Stage sticky có chiều cao cố định, phần cuộn (`--travel`) nằm ở chiều cao chương. Khung chân dung mở từ cửa sổ bo tròn ra toàn stage; bốn ảnh in tản ra trên/dưới trước khi đi qua khuôn mặt rồi mờ đi; cảnh thứ hai quét ngang ở nửa sau. Cuộn ngược đảo lại, vì trạng thái suy ra trực tiếp từ vị trí cuộn.
3. **Reveal chỉ chạy một lần.** `IntersectionObserver` đánh dấu `data-reveal` và phát một animation WAAPI với `fill: "backwards"` và keyframe cuối ngầm định; khi xong, phần tử trở về style của chính nó. Hiệu ứng vào cảnh vẫn theo từng thiết kế. Màn mở thiệp phát `invitation-opening-start` để hero hiện cùng lúc cửa mở.
4. **Hoa rơi tạm dừng ngoài viewport.** Một observer bật `data-paused`, CSS đặt `animation-play-state: paused`; màn hình ≤800 px chỉ giữ nửa số cánh hoa.
5. **Progressive enhancement giữ nguyên.** Mọi rule theo cuộn nằm trong `@supports (animation-timeline: view())` và `@media (prefers-reduced-motion: no-preference)`. Trình duyệt chưa hỗ trợ, reduced motion hoặc không có JavaScript nhận ảnh tĩnh không ghim; nội dung server luôn đọc được, reveal chỉ ẩn phần tử khi JS đã đánh dấu `wait`.

## Alternatives

- Giữ JS và gom đọc/ghi vào `requestAnimationFrame`: vẫn phải đọc layout mỗi frame, main thread bận thì cuộn vẫn giật.
- Thư viện GSAP/Lenis: thêm script bên thứ ba, CSP chỉ cho script cùng origin, và smooth-scroll giả thay cuộn native trên điện thoại.
- Bỏ hẳn chương ghim: mất điểm nhấn chính của mẫu Lời yêu.

## Consequences

- Safari chưa hỗ trợ scroll-driven animation thì thấy chương tĩnh (như reduced motion), không lỗi.
- Đổi chiều cao stage/travel phải cập nhật `--stage-h`, `--travel` và helper `scrollChapter` trong `e2e/wedding.spec.ts`.
- Hiệu ứng theo cuộn của thiết kế khác nên thêm vào module này với cùng điều kiện `@supports`/reduced motion, không thêm listener `scroll`.

## Evidence

Xem mục “Chuyển động theo cuộn không dùng JavaScript — 22/10/2026” trong [VERIFICATION](../VERIFICATION.md).

## Revisit when

Safari phát hành scroll-driven animation (khi đó kiểm tra lại trên iPhone thật), hoặc khi thiệp cần đồng bộ nhạc/video theo cuộn mà CSS không biểu diễn được.
