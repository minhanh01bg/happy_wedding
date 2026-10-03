# Architectural Decision Records

Các ADR được ghi lại sau triển khai ngày 03/10/2026, đối chiếu baseline `53bea9c`. Trạng thái “Accepted / implemented baseline” nghĩa là quyết định đã thể hiện trong mã, không chứng minh có cuộc phê duyệt thiết kế trước khi xây.

| ADR                                                         | Quyết định                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| [0001](0001-clone-and-single-node-runtime.md)               | Clone base, giữ security, runtime một Node + SQLite/ảnh local |
| [0002](0002-order-snapshot-and-payment-activation.md)       | Snapshot gói, xác nhận giao dịch nguyên tử, idempotency       |
| [0003](0003-publication-and-private-guest-boundaries.md)    | Công khai theo quyền, token lời mời và moderation             |
| [0004](0004-template-configuration-and-edit-concurrency.md) | Mẫu từ cấu hình và editor version, tiệc index                 |

ADR mới dùng số tiếp theo, ghi context, decision, alternatives, consequences, evidence và điều kiện xem xét lại. Nếu thay quyết định, thêm ADR superseding thay vì xóa lịch sử.
