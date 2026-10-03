# Commerce & Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nghiệm thu kích hoạt dịch vụ và cấu hình thu tiền có thể đối soát trước khi mở bán.

**Architecture:** ServiceOrder snapshot quyền và integer VND; confirmPayment là điểm kích hoạt nguyên tử. Admin và webhook dùng chung service, merchant setting tách khỏi ngân hàng mừng cưới.

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

Mua gói, ghi chú chuyển khoản, xác nhận thủ công, SePay endpoint tùy chọn, audit, gia hạn, catalog/settings và khóa tài khoản/thiệp. Chưa kết nối tài khoản SePay thật; bảng giá và chính sách chưa được chủ dịch vụ chốt.

### Task 1: Nghiệm thu snapshot, retry và quyền quản trị

**Files:**

- Inspect: `prisma/schema.prisma`, `src/server/wedding/service.ts`.
- Inspect: `src/server/wedding/guards.ts`, `src/app/api/wedding/[...path]/route.ts`.
- Inspect: `src/app/api/payments/sepay/route.ts`, `src/app/admin/orders/[id]/page.tsx`.
- Test: `tests/server/wedding/service.test.ts`, `e2e/wedding.spec.ts`.
- Modify: `docs/VERIFICATION.md`.

**Interfaces:**

- Consumes: `createServiceOrder(accountId: string, invitationId: string, planId: string, clientId: string)`; trả ServiceOrder snapshot.
- Produces: `confirmPayment(orderId: string, transactionId: string, amount: number, provider: "manual" | "sepay", identityId?: string)`; trả order, ghi payment/order/audit transaction khi pending hợp lệ.
- `entitlement(invitationId: string)` chọn một paid order chưa hết hạn; không union các quyền.

- [ ] **Step 1: Đọc spec B1–B5 và ADR 0002.** Kiểm xem task có thay quy tắc hay chỉ nghiệm thu. Nếu cần hoàn tiền/nâng hạ gói thì lập spec riêng trước thay đổi.
- [ ] **Step 2: Chạy payment/webhook regression hiện có.**

```bash
pnpm exec vitest run tests/server/wedding/service.test.ts -t 'snapshot|purchase replay|transfers|payment replay|cancelled|renewal|webhook|authentication|configuration|bank accounts|mismatched amount'
```

Expected: selected tests PASS; pending không active khi sai amount/auth/account, replay không cộng hạn lần hai, snapshot không đổi theo catalog. Đọc actual assertions trong file thay vì chỉ nhìn HTTP success.

- [ ] **Step 3: Chạy admin/customer browser journey.**

```bash
pnpm exec playwright test e2e/wedding.spec.ts --grep 'customer buys'
```

Expected: báo chuyển khoản vẫn pending; admin xác nhận thì paid; khách mới publish được; anonymous mutation bị 401.

- [ ] **Step 4: Ghi kết quả có revision vào verification.** Nếu phát hiện bất kỳ path cập nhật paid ngoài confirmPayment, không nghiệm thu; tạo regression trước sửa.
- [ ] **Step 5: Commit và push bằng chứng riêng.**

```bash
pnpm exec prettier --check docs/VERIFICATION.md
git add docs/VERIFICATION.md
git commit -m "docs(verification): record payment and admin acceptance"
git push origin main
```

### Task 2: Chốt chính sách, ngân hàng và SePay tùy chọn

**Files:**

- Inspect: `docs/OPERATIONS.md`, `.env.example`, `src/app/policies/page.tsx`.
- Modify: `src/app/policies/page.tsx` chỉ với nội dung chủ dịch vụ chốt.
- Runtime data: `ServicePlan`, merchant Setting tại admin; secret trong environment ngoài Git.
- Modify: `docs/VERIFICATION.md`, `docs/OPERATIONS.md` với hướng dẫn được xác nhận.

**Interfaces:**

- Consumes: chủ dịch vụ chốt giá/hạn lưu/hoàn tiền và ngân hàng nhận phí; SePay API key/account do chủ tài khoản cung cấp nếu chọn tự động.
- Produces: merchant bank đầy đủ; gói active đã chốt; chính sách không còn dự thảo. Optional webhook đúng auth/input; không ghi key vào docs.

- [ ] **Step 1: Chốt điều khoản và bảng giá với chủ dịch vụ.** Không suy diễn điều khoản pháp lý từ sample. Thay trang policies bằng nội dung đã chốt; kế hoạch này không cấp phép tự quyết chính sách.
- [ ] **Step 2: Cấu hình merchant bank tại `/admin/settings`.** Đọc QR bằng app ngân hàng và đối chiếu BIN/account/name. Cập nhật plan qua admin; kiểm đơn cũ giữ snapshot.
- [ ] **Step 3: Chọn manual hoặc SePay.** Nếu manual, kiểm quy trình sao kê/admin trên một đơn mới và ghi quyết định. Nếu SePay, đặt key ≥32/account tại env server, cấu hình webhook HTTPS/API Key theo OPERATIONS; không gửi key qua Git/log.
- [ ] **Step 4: Kiểm sandbox đúng/sai/retry nếu chọn SePay.** Đối chiếu DB order/payment/audit sau từng lần; kỳ vọng đúng một activation, sai amount không paid, retry cùng ID giữ expiry. Tiền bị bỏ qua có success:true không đồng nghĩa đã paid. Ghi rõ sandbox khác live.
- [ ] **Step 5: Chạy gate cho thay đổi chính sách và ghi bằng chứng.**

```bash
pnpm check
pnpm build
pnpm exec prettier --check docs/VERIFICATION.md docs/OPERATIONS.md
```

Expected: exit 0. Commit chính sách đã chốt riêng với `docs(policies): publish owner-approved service terms`, sau đó commit ghi nhận payment config với `docs(operations): record payment setup acceptance`. Mỗi commit chỉ stage file liên quan rồi `git push origin main`; DB/secret không stage.

## Exit criteria

B1–B5 được kiểm tra lại; merchant và giá/chính sách được chủ dịch vụ chốt; nếu bật SePay thì sandbox đối soát được. Task 2 còn mở vì thiếu quyết định/credential thật. Không gọi endpoint đã viết là tích hợp ngân hàng live đã nghiệm thu.
