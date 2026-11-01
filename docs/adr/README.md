# Architectural Decision Records

Các ADR được ghi lại sau triển khai ngày 03/10/2026, đối chiếu baseline `53bea9c`. Trạng thái “Accepted / implemented baseline” nghĩa là quyết định đã thể hiện trong mã, không chứng minh có cuộc phê duyệt thiết kế trước khi xây.

| ADR                                                         | Quyết định                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------- |
| [0001](0001-clone-and-single-node-runtime.md)               | Clone base, giữ security, runtime một Node + SQLite/ảnh local  |
| [0002](0002-order-snapshot-and-payment-activation.md)       | Snapshot gói, xác nhận giao dịch nguyên tử, idempotency        |
| [0003](0003-publication-and-private-guest-boundaries.md)    | Công khai theo quyền, token lời mời và moderation              |
| [0004](0004-template-configuration-and-edit-concurrency.md) | Mẫu từ cấu hình và editor version, tiệc index                  |
| [0005](0005-security-hardening-2026-10.md)                  | Gia cố bảo mật sau rà soát 22/10/2026                          |
| [0006](0006-css-scroll-driven-motion.md)                    | Chuyển động theo cuộn bằng CSS scroll timeline, không JS/frame |
| [0007](0007-event-written-time-label.md)                    | Giờ tiệc ghi bằng chữ; lịch thành sự kiện cả ngày              |
| [0008](0008-full-resolution-uploads.md)                     | Ảnh upload giữ độ phân giải gốc, WebP q90, bỏ metadata, 40 MB  |
| [0009](0009-event-map-without-link-resolution.md)           | Bản đồ tiệc nhúng; server không giải link Maps rút gọn         |
| [0010](0010-local-mp3-upload.md)                            | Nhạc nền MP3 tải lên local: kiểm byte, 15 MB, chung quota ảnh  |

ADR mới dùng số tiếp theo, ghi context, decision, alternatives, consequences, evidence và điều kiện xem xét lại. Nếu thay quyết định, thêm ADR superseding thay vì xóa lịch sử.
