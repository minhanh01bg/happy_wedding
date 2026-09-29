# Storefront Subtle Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm phản hồi tương tác trên cửa hàng online và luồng mua hàng mượt, tinh tế mà không ảnh hưởng POS/admin, accessibility hoặc nghiệp vụ.

**Architecture:** Dùng CSS có phạm vi storefront cho micro-interaction; giữ React state hiện có làm nguồn chân lý. Chỉ bổ sung trạng thái trình bày cho thông báo giỏ hàng nếu cần exit animation; Sheet/dialog dùng animation đã có, không thay vòng đời hay focus.

**Tech Stack:** Next.js App Router, React, Tailwind CSS 4, CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-storefront-subtle-motion-design.md`

## Global Constraints

- Ưu tiên cửa hàng online và luồng mua hàng; không làm animation khi cuộn, không thêm chuyển cảnh toàn trang hoặc thư viện animation.
- 100–150 ms cho nhấn/chọn, 150–200 ms cho màu/opacity, 180–240 ms cho lớp phủ/nội dung; tránh `transition-all`, animation kích thước danh sách và `will-change` thường trực trên nhiều phần tử.
- Giữ nội dung SSR/ISR đọc được ngay; `prefers-reduced-motion: reduce` làm chuyển động gần như tức thì mà không ảnh hưởng nội dung, timer hoặc hành động.
- Không sửa nghiệp vụ đặt hàng, giá, tồn kho; copy cho người dùng bằng tiếng Việt. Không sửa các file POS đang có thay đổi chưa commit của người dùng.
- Trước khi thực thi kiểm tra `git status --short`; chỉ stage các file thuộc từng task. Test-first, commit từng task đã kiểm chứng. Full gate: `pnpm check && pnpm build`; E2E chạy riêng bằng `pnpm test:e2e -- e2e/online-store.spec.ts`.

## File map

- `src/app/globals.css`: utility motion dùng riêng storefront, giữ reduced-motion toàn cục đã có.
- `src/features/online-store/cart-feedback.tsx`: vòng đời và trạng thái xuất/thoát toast giỏ hàng; giữ live region, hành động và timer.
- `src/features/online-store/catalog-filters.tsx`: trạng thái chọn và tương tác chips/presets; không thay logic URL.
- `src/features/online-store/catalog-browser.tsx`: fallback skeleton/kết quả, chỉ thêm presentation nếu có trạng thái chuyển thực sự.
- `src/features/online-store/product-card.tsx`: CTA/image hover và focus; không nâng/phóng to cả thẻ.
- `src/features/online-store/cart-drawer.tsx`, `src/features/online-store/quick-view-modal.tsx`, `src/features/online-store/checkout-form.tsx`: rà lại các trạng thái đang có; chỉ sửa cục bộ khi kiểm thử chỉ ra thiếu phản hồi. `src/components/ui/sheet.tsx` đã có enter/exit nên không sửa.
- `tests/config/animation-tokens.test.ts`, test mới `tests/features/online-store/cart-feedback.test.tsx`, `e2e/online-store.spec.ts`: regression và reduced-motion.

---

### Task 1: Motion tokens riêng cho storefront

**Files:**

- Modify: `src/app/globals.css:256-302,521-530`
- Modify: `tests/config/animation-tokens.test.ts`

**Interfaces:**

- Consumes: CSS reduced-motion toàn cục ở `src/app/globals.css:521`.
- Produces: `.storefront-choice`, `.storefront-press`, `.storefront-feedback-enter`, `.storefront-feedback-exit`; dùng trong các task sau.

- [ ] **Step 1: Viết test thất bại** — thêm test đọc CSS vào `tests/config/animation-tokens.test.ts`:

```ts
it("giới hạn motion storefront và giữ reduced-motion", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  for (const selector of [
    ".storefront-choice",
    ".storefront-press",
    ".storefront-feedback-enter",
    ".storefront-feedback-exit",
  ]) {
    expect(css).toContain(selector);
  }
  expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  expect(css).not.toMatch(/transition-all\b/);
});
```

- [ ] **Step 2: Chạy** `pnpm exec vitest run tests/config/animation-tokens.test.ts`; xác nhận FAIL do thiếu các selector.
- [ ] **Step 3: Thêm utility trong `@layer utilities` của CSS; giữ nguyên quy tắc reduced-motion đang có**:

```css
.storefront-choice {
  transition:
    background-color 180ms ease-out,
    color 180ms ease-out,
    border-color 180ms ease-out,
    box-shadow 180ms ease-out;
}
.storefront-press {
  transition:
    transform 120ms ease-out,
    background-color 180ms ease-out;
}
.storefront-press:active:not(:disabled) {
  transform: scale(0.98);
}
@keyframes storefront-feedback-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes storefront-feedback-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(8px);
  }
}
.storefront-feedback-enter {
  animation: storefront-feedback-in 200ms ease-out both;
}
.storefront-feedback-exit {
  animation: storefront-feedback-out 180ms ease-in both;
}
```

- [ ] **Step 4: Chạy lại test và `pnpm exec vitest run tests/app/motion-rules.test.ts`; xác nhận PASS.**
- [ ] **Step 5: Commit** chỉ hai file: `git add src/app/globals.css tests/config/animation-tokens.test.ts && git commit -m "feat(storefront): add scoped subtle motion utilities"`.

### Task 2: Phản hồi chọn bộ lọc và thẻ sản phẩm

**Files:**

- Modify: `src/features/online-store/catalog-filters.tsx:145-180,277-310`
- Modify: `src/features/online-store/product-card.tsx:31-85`
- Modify: `src/features/online-store/catalog-browser.tsx:155-190` **chỉ nếu kiểm tra cho thấy skeleton gây flash khi nhập nhanh**.
- Modify: `e2e/online-store.spec.ts`

**Interfaces:**

- Consumes: `.storefront-choice`, `.storefront-press` từ Task 1; `filter`, `aria-pressed` và `handleUpdate` đang có.
- Produces: chips và giá có phản hồi chọn/nhấn; CTA thẻ sản phẩm có focus/press rõ nhưng grid không dịch chuyển.

- [ ] **Step 1: Thêm test E2E cho lựa chọn giá có trạng thái accessible**; lồng vào suite storefront hiện có:

```ts
await page.goto("/shop");
const price = page.getByRole("button", { name: "50k - 100k" });
await price.click();
await expect(price).toHaveAttribute("aria-pressed", "true");
await expect(price).toHaveClass(/storefront-choice/);
```

- [ ] **Step 2: Chạy** `pnpm test:e2e -- e2e/online-store.spec.ts`; xác nhận FAIL ở class mới.
- [ ] **Step 3: Thêm `storefront-choice storefront-press` vào className của nút danh mục, giá; thêm `focus-visible:ring-2 focus-visible:ring-ring` cho những nút chưa có focus. Trong product-card chỉ thêm `storefront-press` cho CTA bấm được; giữ `.card-interactive` và hover ảnh hiện có, không thêm transform cho article.**

```tsx
// catalog-filters.tsx, trong buttonVariants({ className: ... }) của nút danh mục:
className: "storefront-choice storefront-press min-h-10 shrink-0 rounded-full px-4 text-sm font-bold focus-visible:ring-2 focus-visible:ring-ring",
// catalog-filters.tsx, trong cn(...) của button giá:
"storefront-choice storefront-press h-7 cursor-pointer rounded-lg px-2.5 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring select-none",
// product-card.tsx, gắn storefront-press vào className của nút Xem nhanh (nếu khả dụng).
```

- [ ] **Step 4: Chạy lại E2E và `pnpm exec vitest run tests/features/online-store/filter-products.test.ts`; xác nhận PASS; nếu skeleton nhấp nháy, bổ sung test reproducing riêng trước khi sửa browser, không ép fade tất cả lần gõ.**
- [ ] **Step 5: Commit** đúng file đã sửa: `git add src/features/online-store/catalog-filters.tsx src/features/online-store/product-card.tsx e2e/online-store.spec.ts && git commit -m "feat(storefront): polish catalog selection feedback"` (nếu có sửa browser, stage thêm file đó).

### Task 3: Thông báo giỏ hàng có vào/ra, không rơi thông báo mới

**Files:**

- Modify: `src/features/online-store/cart-feedback.tsx:8-101`
- Create: `tests/features/online-store/cart-feedback.test.tsx`

**Interfaces:**

- Consumes: `feedback`, `dismissFeedback`, `openDrawer` từ `useOnlineCart()` và class `.storefront-feedback-enter`/`.storefront-feedback-exit` Task 1.
- Produces: `CartFeedback` vẫn nhận `{ onViewCart?: () => void }`; trạng thái trình bày toast rời đi trong 180ms khi dismiss, thông báo mới hủy lịch đóng cũ.

- [ ] **Step 1: Tạo test với mock `useOnlineCart`, fake timers và React Testing Library; gồm trường hợp thông báo liên tiếp**:

```tsx
vi.useFakeTimers();
// render CartFeedback với feedback A; rerender mock feedback B trước 4000ms.
// advanceTimersByTime(180) sau khi thay B, expect thông điệp B còn hiển thị.
// click "Đóng thông báo", expect toast có class storefront-feedback-exit.
// advanceTimersByTime(180), expect dismissFeedback được gọi đúng một lần.
// afterEach: cleanup, vi.clearAllTimers(), vi.useRealTimers().
```

- [ ] **Step 2: Chạy** `pnpm exec vitest run tests/features/online-store/cart-feedback.test.tsx`; xác nhận FAIL vì chưa có exit state / class (mock dựa trên cấu trúc test component hiện có, không mock React timer nội bộ).
- [ ] **Step 3: Tách feedback trình bày (`visibleFeedback`) và cờ `exiting`; khi feedback mới đến hủy exit timer cũ và render message mới, khi dismiss hẹn `dismissFeedback()` sau 180ms. Giữ 4000ms auto-dismiss; cleanup cả timer auto và exit khi unmount; khi reduced-motion, có thể cho CSS rút ngắn nhưng timer 180ms vẫn hữu hạn. Không gọi callback đóng cũ sau khi feedback đã đổi; dùng ref identity/token và kiểm tra trước callback. Giữ `aria-live`, `role="status"`, CTA hiện hành.**
- [ ] **Step 4: Chạy lại test; xác nhận PASS, kiểm tra bằng bàn phím nút xem/đóng giỏ trên trình duyệt.**
- [ ] **Step 5: Commit** `git add src/features/online-store/cart-feedback.tsx tests/features/online-store/cart-feedback.test.tsx && git commit -m "feat(storefront): animate cart feedback safely"`.

### Task 4: Kiểm chứng lớp phủ, checkout và reduced-motion

**Files:**

- Modify: `e2e/online-store.spec.ts`
- Modify: `src/features/online-store/cart-drawer.tsx`, `src/features/online-store/quick-view-modal.tsx`, `src/features/online-store/checkout-form.tsx` **chỉ khi test phát hiện thiếu phản hồi**.

**Interfaces:**

- Consumes: Sheet/dialog hiện có và CSS reduced-motion toàn cục.
- Produces: regression tests cho trạng thái hiển thị và focus của cart / quick view / checkout; không tạo API mới.

- [ ] **Step 1: Thêm kiểm thử reduced-motion và tương tác giỏ vào E2E, dùng locator đã có trong suite**:

```ts
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("/shop");
// Dùng nút mở giỏ và locator Sheet của suite hiện tại.
// expect Sheet hiển thị; kiểm tra getComputedStyle(sheet).transitionDuration gần 0.
// Đóng Sheet rồi xác nhận focus trả về trigger; lặp lại với quick view nếu có.
```

- [ ] **Step 2: Chạy** `pnpm test:e2e -- e2e/online-store.spec.ts`; ghi nhận các failure thực tế, không sửa lớp phủ chỉ vì test chưa đúng locator.
- [ ] **Step 3: Nếu có lỗi thuộc motion storefront, thêm class `storefront-choice` hoặc `storefront-press` ở đúng CTA/checkout và bổ sung test chứng minh; không sửa `src/components/ui/sheet.tsx` vì đã có 300ms enter/exit và reduced-motion toàn cục. Nếu mọi test đạt, không sửa mã sản phẩm.**
- [ ] **Step 4: Chạy `pnpm exec vitest run tests/config/animation-tokens.test.ts tests/features/online-store/cart-feedback.test.tsx tests/features/online-store/filter-products.test.ts`, `pnpm check && pnpm build`, sau đó `pnpm test:e2e -- e2e/online-store.spec.ts`. Xác nhận PASS; báo rõ bất kỳ gate nào không chạy được.**
- [ ] **Step 5: Commit** riêng test và file thật sự sửa: `git add e2e/online-store.spec.ts && git commit -m "test(storefront): cover reduced motion and overlays"` (nếu sửa component, stage chính xác file tương ứng); kiểm tra `git status --short`, không gộp file POS của người dùng. Push nhánh hiện tại sau khi toàn bộ gate đạt theo quy ước dự án.

## Self-review

- Spec coverage: CTA và filters (Task 2), feedback/timer (Task 3), lớp phủ/checkout, keyboard và reduced-motion (Task 4), giới hạn CSS (Task 1).
- Không thêm disclosure mới vì bộ lọc hiện hiển thị cố định; nếu sau này có disclosure, tái sử dụng animation của thành phần cơ sở. Không thay logic loading/empty hoặc order.
- Các tên class trong Tasks 2–3 đúng giao diện do Task 1 định nghĩa; không thêm dependency và không can thiệp file POS chưa commit.
