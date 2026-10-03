import { test, expect } from "@playwright/test";

test("customer buys, admin activates, couple publishes, personal guest responds and owner moderates", async ({
  page,
  browser,
}) => {
  const slug = `e2e-${Date.now()}`;
  await page.goto("/account/register");
  await page.getByLabel("Tên của bạn").fill("Khách kiểm thử");
  await page.getByLabel("Số điện thoại").fill("0912345678");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("customer-password-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tạo tài khoản & bắt đầu" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Tạo thiệp mới" }).click();
  await page.getByLabel("Đường dẫn thiệp").fill(slug);
  await page.getByLabel("Chú rể", { exact: true }).fill("Anh Trai");
  await page.getByLabel("Cô dâu", { exact: true }).fill("Chị Dâu");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/dashboard\/c[a-z0-9]+$/);
  const invitationId = page.url().split("/").at(-1)!;
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/images/flowers.jpg");
  await expect(page.getByRole("status")).toContainText("Ảnh đã tải lên");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu thiệp");
  await page
    .getByRole("button", { name: "Xuất bản thiệp", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Cần thanh toán" }),
  ).toContainText("Cần thanh toán");
  await page.getByRole("link", { name: "Mua gói dịch vụ" }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Tạo đơn & xem hướng dẫn thanh toán" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/c[a-z0-9]+$/);
  const orderId = page.url().split("/").at(-1)!;
  await expect(page.getByText("Chờ xác nhận", { exact: true })).toBeVisible();
  await page
    .getByLabel("Thông tin giao dịch đã chuyển")
    .fill("E2E transfer reported");
  await page.getByRole("button", { name: "Thông báo đã chuyển khoản" }).click();
  await expect(page.getByText("Chờ xác nhận", { exact: true })).toBeVisible();
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await admin.goto("http://127.0.0.1:3201/login");
  await admin
    .getByLabel("Mật khẩu", { exact: true })
    .fill("e2e-admin-password");
  await admin.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(admin).toHaveURL(/\/admin$/);
  await admin.goto(`http://127.0.0.1:3201/admin/orders/${orderId}`);
  await admin
    .getByLabel("Mã giao dịch ngân hàng")
    .fill(`test-transfer-${Date.now()}`);
  await admin.getByRole("checkbox").check();
  await admin
    .getByRole("button", { name: "Xác nhận tiền đã nhận & kích hoạt gói" })
    .click();
  await expect(admin.getByText("Đã thanh toán", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Kiểm tra trạng thái" }).click();
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Về thiệp & xuất bản" }).click();
  await page
    .getByRole("button", { name: "Xuất bản thiệp", exact: true })
    .click();
  await expect(page.getByText("Đã xuất bản", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Quản lý khách mời" }).click();
  await page.getByLabel("Tên khách mời", { exact: true }).fill("Chị Lan");
  await page.getByRole("button", { name: "Tạo lời mời riêng" }).click();
  const guestLink = page.locator("a.guest-link").first();
  await expect(guestLink).toBeVisible();
  const guestHref = await guestLink.getAttribute("href");
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(`http://127.0.0.1:3201${guestHref}`);
  await expect(guest.getByText("Trân trọng kính mời Chị Lan")).toBeVisible();
  await guest.getByLabel("Số người tham dự").selectOption("2");
  await guest
    .getByLabel("Gửi đôi lời chúc")
    .fill("Chúc anh chị trăm năm hạnh phúc!");
  await guest.getByRole("button", { name: "Gửi xác nhận & lời chúc" }).click();
  await expect(guest.getByRole("status")).toContainText("Đã lưu phản hồi");
  await page.reload();
  await expect(
    page.getByText("Chúc anh chị trăm năm hạnh phúc!", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Duyệt lời chúc" }).click();
  await expect(page.getByText("Đã duyệt", { exact: true })).toBeVisible();
  await guest.reload();
  await expect(
    guest.getByText("Chúc anh chị trăm năm hạnh phúc!", { exact: true }),
  ).toBeVisible();
  const exported = await page.request.get(
    `/api/wedding/export/${invitationId}`,
  );
  expect(exported.status()).toBe(200);
  expect(await exported.text()).toContain("Chị Lan");
  // UI layouts at phone size, plus refusal of an unauthenticated mutation.
  await guest.setViewportSize({ width: 390, height: 844 });
  expect(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const denied = await guest.request.post("/api/wedding/publish", {
    data: { id: invitationId, publish: false },
  });
  expect(denied.status()).toBe(401);
  await adminContext.close();
  await guestContext.close();
});

test("catalog filters, full previews and home layout work on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Một lời mời/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/templates");
  await page.getByRole("button", { name: "Truyền thống", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Song hỷ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lời yêu" })).toHaveCount(0);
  await page.getByRole("link", { name: "Xem mẫu Song hỷ" }).click();
  await page.getByRole("link", { name: "Xem thiệp đầy đủ" }).click();
  await expect(
    page.getByRole("heading", { name: "Bạn sẽ đến chứ?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Gửi xác nhận & lời chúc" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("invitation album restores focus and respects reduced motion on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/templates");
  await page.getByRole("link", { name: "Xem mẫu Song hỷ" }).click();
  await page.getByRole("link", { name: "Xem thiệp đầy đủ" }).click();
  const firstPhoto = page.getByRole("button", { name: /Xem ảnh kỷ niệm 1 / });
  await firstPhoto.click();
  const album = page.getByRole("dialog", { name: "Album ảnh cưới" });
  await expect(album).toBeVisible();
  await expect(page.getByRole("button", { name: "Đóng album" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(album.getByText(/^Ảnh 2 \/ /)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(album).not.toBeVisible();
  await expect(firstPhoto).toBeFocused();
  expect(
    await page
      .locator(".wedding-hero-image img")
      .evaluate((image) => getComputedStyle(image).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator(".wedding-hero-image img")).toHaveCSS(
    "animation-name",
    "wedding-cover",
  );
  await firstPhoto.click();
  await page.getByRole("button", { name: "Đóng album" }).click();
  await expect(album).not.toBeVisible();
});
