# Mục lục tài liệu — Happy Wedding

Đọc theo thứ tự: [README dự án](../README.md) → [CONTEXT](../CONTEXT.md) → [đặc tả](superpowers/specs/2026-10-03-wedding-platform-design.md) → kế hoạch đúng phân hệ. Ngày bổ sung bộ tài liệu: 03/10/2026.

## Sản phẩm và miền nghiệp vụ

| Tài liệu                                                                        | Nội dung / người đọc                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [RESEARCH](RESEARCH.md)                                                         | Hai website tham khảo, mô hình dịch vụ, phạm vi và nguồn nghiên cứu                 |
| [Design Specification](superpowers/specs/2026-10-03-wedding-platform-design.md) | Vai trò, luồng, dữ liệu, trạng thái, ràng buộc, nghiệm thu và giới hạn              |
| [CONTEXT](../CONTEXT.md)                                                        | Thuật ngữ, quan hệ và bản đồ mã cho người tiếp quản                                 |
| [API Contracts](API-CONTRACTS.md)                                               | Payload, response, quyền và semantics của webhook/upload/CSV                        |
| [ADRs](adr/README.md)                                                           | Bốn quyết định: runtime/base, thanh toán, publication/privacy, template/concurrency |

## Kế hoạch theo cấu trúc Superpowers

| Kế hoạch                                                                   | Phạm vi                                                               | Trạng thái                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| [Catalog & Editor](superpowers/plans/2026-10-03-catalog-editor-plan.md)    | Nghiệm thu bản hiện tại; nhập và duyệt thiệp anh trai                 | Kế hoạch viết xong; bước thực thi tiếp theo còn mở |
| [Commerce & Admin](superpowers/plans/2026-10-03-commerce-admin-plan.md)    | Nghiệm thu payment/admin; chốt chính sách/ngân hàng và SePay tùy chọn | Cần quyết định và dữ liệu chủ dịch vụ              |
| [Guests & Release](superpowers/plans/2026-10-03-guest-publication-plan.md) | Nghiệm thu public/RSVP; production và restore drill                   | Cần hạ tầng/domain thật                            |

Mỗi kế hoạch có Goal/Architecture/Tech Stack/Spec/Global Constraints, file và interface cụ thể, bước checkbox, lệnh/expected result, commit/push và exit criteria. Mã đã triển khai được ghi riêng ở baseline; không yêu cầu viết lại ứng dụng hoặc tạo commit không có thay đổi.

## Vận hành và bằng chứng

| Tài liệu                                                                                  | Nội dung                                                                     |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [OPERATIONS](OPERATIONS.md)                                                               | Setup, thiệp thật, ngân hàng, SePay, production, backup/restore              |
| [VERIFICATION](VERIFICATION.md)                                                           | Bằng chứng kiểm tra ứng dụng trước lượt docs và các giới hạn chưa kiểm chứng |
| [Documentation Review](superpowers/DOCUMENTATION-REVIEW.md)                               | Đối chiếu yêu cầu → spec → plan → mã/test; review tài liệu                   |
| [Desktop preview](previews/home-desktop.png) / [Mobile preview](previews/home-mobile.png) | Ảnh kiểm tra giao diện                                                       |
| [AGENTS](../AGENTS.md)                                                                    | Invariants và quy trình làm việc/commit cho agent                            |

## Skill và giới hạn quy trình

Đã đọc bộ skill Superpowers có sẵn trong source `my_task`: `superpowers`, `brainstorming`, `writing-plans`, `verification-before-completion`. Áp dụng cấu trúc design/spec, plan theo phân hệ, bước cụ thể, frequent commits, self-review và kiểm chứng trước báo hoàn tất.

Đây là bổ sung tài liệu sau triển khai, được người dùng yêu cầu. Không ghi nhận hồi tố rằng đã có brainstorming/approval trước xây, red-green TDD hay review từ subagent. Lượt này không thay hành vi ứng dụng và không thực hiện các task launch cần dữ liệu thật. Không cài/vendor bộ skill vào repo; người thực thi dùng skill khi môi trường của họ có cung cấp. Header plan mô tả workflow cho lần thực thi tiếp theo, không phải bằng chứng rằng workflow đó đã chạy.

## Cập nhật về sau

- Thay hành vi: sửa spec và API contract, thêm/supersede ADR khi quyết định kiến trúc đổi, thêm regression có ý nghĩa và cập nhật verification cùng phần thay đổi.
- Thực thi plan: chỉ tick bước có kết quả thực; ghi revision/ngày/lệnh. Không dùng kết quả kiểm tra local để khẳng định bank live hoặc production đã chạy.
- Nội dung riêng/secret/ảnh upload ở runtime, không trong Git. Mọi phần hoàn thành được commit riêng và push `origin/main`.
