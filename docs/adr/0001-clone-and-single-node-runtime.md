# ADR 0001 — Clone base và runtime một Node

Date: 2026-10-03. Status: Accepted / implemented baseline.

## Context

Chủ dự án yêu cầu clone my_task để có nền tài khoản/admin và xây dịch vụ cưới riêng. Bản đầu cần vận hành chi phí vừa phải, chưa có yêu cầu tải hoặc SLA định lượng. Cơ sở dữ liệu và secret của source không thuộc dự án mới.

## Decision

Giữ lịch sử clone, Next/React/TypeScript/Prisma, phiên DB, HTTP guards, Redis rate-limit và logger. Bỏ miền POS/kho/voucher/giao hàng và dependencies không dùng. SQLite + ảnh local phục vụ một Node instance với volume bền vững. base remote chỉ đọc, push bị vô hiệu; origin là repo happy_wedding. Setup tạo DB và secret riêng.

## Alternatives

- Xây mới toàn bộ: ranh giới sạch nhưng phải làm lại session/security đã có.
- Giữ toàn bộ hệ thống bán lẻ: ít công dọn nhưng nghiệp vụ và giao diện dư thừa.
- PostgreSQL + object storage ngay: phù hợp nhiều instance, đổi lại phải cấu hình và vận hành thêm trước khi có khách.

## Consequences

Chạy local thuận tiện; production cần reverse proxy HTTPS, Redis, volume và backup. Không hỗ trợ serverless với disk tạm hoặc nhiều writer. Phải dùng tx trong interactive transaction và tránh query Prisma gốc gây chờ connection. Backup DB/ảnh cần dừng ghi để đồng nhất hoàn toàn. Chưa có CI workflow tự động.

## Evidence / revisit

`prisma/schema.prisma`, `src/server/db/prisma.ts`, `scripts/setup.ts`, `scripts/backup.py`, `src/config/env.ts`. Xem xét lại khi có yêu cầu nhiều instance, downtime thấp hoặc tải ghi không đáp ứng; cần đo tải trước khi chọn giải pháp thay thế.
