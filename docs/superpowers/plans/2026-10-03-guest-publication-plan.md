# Publication, Guests & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nghiệm thu thiệp công khai/RSVP và chuẩn bị release một instance có khả năng backup/restore.

**Architecture:** publicInvitation chặn draft/unpaid/expired/disabled. Token lời mời định danh RSVP nhưng không cấp quyền sửa; wish moderation tách attendance. Runtime lưu SQLite/uploads trên volume cùng bản backup ngoài public.

**Tech Stack:** Node 22, pnpm 10.28.2, Next.js 16.3.8, React 19.2.4, TypeScript, Prisma 6.19.3/SQLite, Zod 4, Vitest và Playwright.

**Spec:** [Wedding Platform Design](../specs/2026-10-03-wedding-platform-design.md).

## Global Constraints

- Node 22; pnpm 10.28.2; Next.js 16.3.8; React 19.2.4; Prisma 6.19.3; Zod 4.
- Văn bản hướng tới khách hàng bằng tiếng Việt; hiển thị giờ theo `Asia/Ho_Chi_Minh`.
- Tiền dùng integer VND. Giá/quyền lợi của đơn được snapshot từ server.
- Production một Node instance, SQLite và uploads trên volume bền vững.
- Không commit `.env`, `.local-admin-password`, DB hoặc ảnh khách tải lên.
- Phiên khách và admin tách riêng; quyền sở hữu được kiểm tra tại server.
- Thiệp công khai cần `published`, chủ tài khoản đang hoạt động và gói `paid` chưa hết hạn.
- Tiền mua dịch vụ và tiền mừng cưới là hai luồng độc lập.
- Commit từng phần đã kiểm tra, push vào `origin` của `happy_wedding`; không push vào `base`.

---

## Cách sử dụng và trạng thái

Kế hoạch được viết sau triển khai baseline `53bea9c`, để nghiệm thu và hoàn thiện bản đã có. Không dựng lại tính năng đã chạy; không đánh dấu một bước đã thực hiện TDD nếu không có bằng chứng. Các checkbox bên dưới là **lần thực hiện tiếp theo**, còn mở; danh sách baseline chỉ ghi việc đã có trong mã. Yêu cầu hiện tại là bổ sung docs, không phải tự ý thay dữ liệu cưới thật hoặc triển khai production.

Thực hiện tuần tự khi đã có dữ liệu/quyền truy cập cần thiết. Với lỗi mới: viết regression test tái hiện, chạy để thấy FAIL, sửa tối thiểu, chạy để thấy PASS rồi commit riêng. Không viết lại test đang pass để giả lập lịch sử red-green. Không dispatch subagent nếu chưa chọn cách thực hiện đó. Các thao tác UI có thể tách thành nhiều lượt 2–5 phút; một task chỉ hoàn tất khi bằng chứng và tài liệu cùng được kiểm tra.

## Baseline đã có

Public invitation, tên khách riêng, lịch/Maps/Calendar, RSVP dedupe, duyệt lời chúc, CSV, expiry/suspension và backup script. Chưa triển khai domain production, chưa có restore drill trên hạ tầng thật.

### Task 1: Nghiệm thu public gate, RSVP và moderation

**Files:**

- Inspect: `src/server/wedding/service.ts`, `src/app/w/[slug]/page.tsx`.
- Inspect: `src/components/wedding/rsvp-form.tsx`, `src/app/dashboard/[id]/guests/page.tsx`.
- Inspect: `src/app/api/wedding/[...path]/route.ts`, `src/lib/log-redaction.ts`.
- Test: `tests/server/wedding/service.test.ts`, `tests/lib/log-redaction.test.ts`, `e2e/wedding.spec.ts`.
- Modify: `docs/VERIFICATION.md`.

**Interfaces:**

- Consumes: invitation đã đủ entitlement theo commerce plan; guest token của đúng thiệp; `responseSchema` tại `src/lib/wedding.ts`.
- Produces: `publicInvitation(slug: string)` trả thiệp có template hoặc null; `submitResponse(slug: string, raw: unknown)` trả `{id:string}`. Export endpoint trả CSV riêng cho owner.
- Mỗi submit đặt wishStatus=pending; attendance khác attending lưu partySize=0.

- [ ] **Step 1: Đọc spec C1–C3 và ADR 0003/0004.** Giữ số lượng và thứ tự tiệc sau RSVP; không hứa dedupe anonymous xuyên thiết bị.
- [ ] **Step 2: Chạy regression public/RSVP/privacy.**

```bash
pnpm exec vitest run tests/server/wedding/service.test.ts tests/lib/log-redaction.test.ts
```

Expected: cả hai file PASS; không bỏ qua case đổi số lượng tiệc sau RSVP hoặc redact guest URL/Authorization. Assertion RSVP hiện có trong fixture file:

```ts
expect(await prisma.guestResponse.count()).toBe(1);
const stored = await prisma.guestResponse.findFirstOrThrow();
expect(stored.partySize).toBe(3);
expect(stored.wishStatus).toBe("pending");
```

Đoạn assertion này áp dụng sau hai lần submit cùng client trong test đã có; không chạy đơn lẻ thiếu fixture.

- [ ] **Step 3: Chạy browser public journey.**

```bash
pnpm exec playwright test e2e/wedding.spec.ts --grep 'customer buys'
```

Expected: link cá nhân hiển thị người được mời, RSVP hai người, chủ duyệt thì lời chúc mới public, export chứa phản hồi đúng owner. Xác minh route review vẫn giữ escaping CSV; test browser hiện không thay thế mọi case formula-injection.

- [ ] **Step 4: Ghi bằng chứng và commit riêng.**

```bash
pnpm exec prettier --check docs/VERIFICATION.md
git add docs/VERIFICATION.md
git commit -m "docs(verification): record guest and publication acceptance"
git push origin main
```

### Task 2: Release trên hạ tầng thật và restore drill

**Files:**

- Read: `.env.example`, `docs/OPERATIONS.md`, `src/config/env.ts`, `src/instrumentation.ts`.
- Inspect: `scripts/backup.py`, `prisma/migrations/20261003000000_wedding_platform/migration.sql`.
- Runtime: private environment, production SQLite/uploads volumes và reverse proxy; ngoài Git.
- Modify: `docs/OPERATIONS.md`, `docs/VERIFICATION.md` sau kiểm chứng.

**Interfaces:**

- Consumes: domain/HTTPS, server có persistent volume, private secret/admin hash, Redis và trusted proxy hợp lệ, quyết định giá/ngân hàng đã nghiệm thu.
- Produces: một runtime production hoạt động; backup DB/ảnh ngoài public, biên bản restore/smoke. Không deploy khi thiếu cấu hình fail-closed.

- [ ] **Step 1: Chuẩn bị hạ tầng và runtime env.** Theo OPERATIONS production 1–5. Chỉ dùng DB wedding production; xác minh volume bền qua restart. Không dùng dummy hash/Redis của build hoặc secret test.
- [ ] **Step 2: Chạy migration, seed lần đầu và gate release.**

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm check
pnpm build
```

Expected: migration thành công và gate exit 0. Seed idempotent không thay catalog đã chỉnh. Lệnh chạy trong checkout cấu hình đúng DB; E2E vẫn chỉ ghi DB riêng theo config.

- [ ] **Step 3: Khởi động một app dưới process manager và reverse proxy.** Dùng `pnpm start` sau build; HTTPS bên ngoài tới port 3200. Kiểm fail-closed trên staging riêng với config thiếu; không thử phá env server đang phục vụ khách.
- [ ] **Step 4: Backup và restore trên staging độc lập.** Tạm dừng ghi; `python3 scripts/backup.py /var/backups/happy-wedding` dưới tài khoản vận hành có quyền thư mục. Script tạo wedding timestamp DB và upload tar; backup không nằm public. Restore đúng cặp DB/tar vào staging, kiểm file permissions và đọc một thiệp đã published. Không ghi đè production để thử restore.

Kiểm integrity của DB backup bằng Python với đường dẫn file đã chọn:

```python
import sqlite3
from pathlib import Path
folder = Path("/var/backups/happy-wedding")
backup = sorted(folder.glob("wedding-*.db"))[-1]
with sqlite3.connect(f"file:{backup}?mode=ro", uri=True) as connection:
    assert connection.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
```

Đường dẫn backup là đề xuất vận hành; nếu server dùng thư mục khác, ghi đường dẫn đã kiểm chứng vào biên bản. Integrity DB không chứng minh ảnh đã khôi phục; phải đọc thiệp/ảnh trên staging.

- [ ] **Step 5: Smoke qua HTTPS và ghi release evidence.** Đăng ký/tạo/mua/xác nhận/xuất bản/RSVP/duyệt/CSV; kiểm hết hạn và khóa trên dữ liệu test riêng, không khóa khách thật. Kiểm ngân hàng và ngày giờ thiệp thật với chủ dự án; chưa làm thì giữ task mở.
- [ ] **Step 6: Commit/push hướng dẫn đã kiểm chứng.**

```bash
pnpm exec prettier --check docs/OPERATIONS.md docs/VERIFICATION.md
git add docs/OPERATIONS.md docs/VERIFICATION.md
git commit -m "docs(release): record production and restore acceptance"
git push origin main
```

## Exit criteria

C1–C3 có bằng chứng mới; domain HTTPS và cấu hình production thật hoạt động; backup/restore test thành công trên staging; người dùng được cung cấp URL thật. Task 2 chưa thực hiện trong lượt bổ sung docs. Không tự coi đã có domain, triển khai hoặc SLA/khả năng chịu tải nếu chưa đo.
