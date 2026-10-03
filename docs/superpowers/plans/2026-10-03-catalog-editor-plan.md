# Catalog & Invitation Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nghiệm thu catalog/editor và thay thiệp minh họa bằng nội dung cưới đã được gia đình xác nhận.

**Architecture:** Server pages đọc catalog; editor gửi JSON qua wedding route tới saveInvitation. Validation ở src/lib/wedding.ts, file ảnh qua upload route, DB giữ version để bảo vệ ghi đè.

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

Sáu mẫu, ba layout/sáu palette, đăng ký/đăng nhập, giữ lựa chọn mẫu, tạo bản nháp, chỉnh nội dung/ảnh/tiệc, preview riêng và bảo vệ version/slug/owner. Không cần viết lại các phần này.

### Task 1: Nghiệm thu catalog, ownership và editor concurrency

**Files:**

- Inspect: `src/lib/wedding.ts`, `src/server/wedding/service.ts`.
- Inspect: `src/app/templates/page.tsx`, `src/app/dashboard/new/page.tsx`.
- Inspect: `src/components/wedding/invitation-editor.tsx`, `src/components/wedding/editor-fields.tsx`.
- Inspect: `src/app/api/wedding/upload/route.ts`.
- Test: `tests/server/wedding/service.test.ts`, `e2e/wedding.spec.ts`.
- Modify: `docs/VERIFICATION.md` chỉ để ghi lần kiểm tra mới.

**Interfaces:**

- Consumes: `InvitationInput = z.infer<typeof invitationSchema>` tại `src/lib/wedding.ts`.
- Produces: `saveInvitation(ownerId: string, raw: InvitationInput, id?: string, version?: number)`; kết quả có `id`, `version`. Upload trả `{ok:true,data:{url:string}}`, editor lưu URL trong invitation.
- Không đổi signature hoặc thêm chức năng trong task nghiệm thu này.

- [ ] **Step 1: Đọc spec A1–A3 và fixtures.** Không dùng dev DB cho test; kiểm tra `tests/test-env.ts` và `playwright.config.ts`.
- [ ] **Step 2: Chạy domain regression hiện có.**

```bash
pnpm exec vitest run tests/server/wedding/service.test.ts -t 'another customer|concurrent editor|duplicate slugs|premium draft'
```

Expected: các test được chọn PASS; người khác không sửa/mua/publish; version cũ và slug trùng trả 409. Assertion concurrency hiện có trong fixture của file test:

```ts
await expect(
  saveInvitation(accountId, input(), i.id, i.version),
).rejects.toMatchObject({ status: 409 });
```

Đọc phần save với version mới trước assertion; không copy đoạn này thành test thiếu setup.

- [ ] **Step 3: Chạy mobile và upload journey.**

```bash
pnpm test:e2e
```

Expected: hai kịch bản Chromium PASS, upload ảnh được lưu, catalog lọc và preview không submit RSVP, mobile không cuộn ngang. Nếu lỗi, giữ trace/screenshot theo Playwright config và tạo regression riêng.

- [ ] **Step 4: Ghi bằng chứng mới.** Trong `docs/VERIFICATION.md` ghi ngày, revision, lệnh và exit status thực tế; không đổi kết quả cũ thành kết quả mới nếu chưa chạy.
- [ ] **Step 5: Kiểm tra/commit/push phần nghiệm thu.**

```bash
pnpm exec prettier --check docs/VERIFICATION.md
git add docs/VERIFICATION.md
git commit -m "docs(verification): record catalog and editor acceptance"
git push origin main
```

### Task 2: Hoàn thiện thiệp anh trai bằng nội dung thật

**Files:**

- Read: `docs/OPERATIONS.md` phần Thiết lập thiệp thật.
- Runtime data: một CustomerAccount/Invitation mới qua UI; upload được lưu ngoài Git.
- Modify: `docs/VERIFICATION.md` chỉ ghi kết quả nghiệm thu và slug công khai đã được cho phép.
- Không sửa `DEMO_CONTENT` hoặc biến sample thành dữ liệu thật của gia đình.

**Interfaces:**

- Consumes: tên cặp đôi/gia đình, ngày giờ, 1–4 tiệc và địa chỉ, ảnh được phép dùng, slug, nhạc/ngân hàng mừng nếu có; do chủ dự án cung cấp.
- Produces: draft Invitation thật thuộc tài khoản cặp đôi; version và URL ảnh lưu qua API hiện có. Commerce task sẽ kích hoạt entitlement trước public launch.

- [ ] **Step 1: Nhận đủ nội dung và xác nhận thứ tự tiệc.** Chốt dữ liệu với gia đình; chưa nhận thì giữ task mở, không tự thay bằng tên/ngày minh họa.
- [ ] **Step 2: Đăng ký, chọn mẫu và lưu bản nháp.** Dùng `/account/register` → `/dashboard/new`; ghi slug dễ nhớ, kiểm tra chưa public.
- [ ] **Step 3: Nhập gia đình/câu chuyện/tiệc, upload ảnh và chọn bìa.** Nhập giờ Việt Nam; không dùng ảnh sample làm ảnh cưới thật; ngân hàng mừng điền đủ hoặc bỏ trống.
- [ ] **Step 4: Gia đình duyệt preview trên điện thoại.** Kiểm tên, dấu tiếng Việt, lịch, Maps, ảnh và nhạc; xác nhận chưa gửi link public trước activation.
- [ ] **Step 5: Ghi nghiệm thu nội dung và commit riêng.** Không commit ảnh upload/thông tin riêng hoặc mật khẩu. Nếu chỉ cập nhật DB thì không tạo commit giả; chỉ commit biên bản đã được cho phép chia sẻ và push.

## Exit criteria

A1–A3 có kết quả kiểm tra mới, không có regression mở; thiệp thật được gia đình duyệt. Task 2 đang cần dữ liệu thật, nên chưa thể công bố hoàn tất cho anh trai. Thanh toán/xuất bản theo hai kế hoạch kế tiếp.
