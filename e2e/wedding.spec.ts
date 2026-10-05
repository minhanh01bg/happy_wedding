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
  await page
    .getByRole("combobox", { name: "Mẫu thiệp", exact: true })
    .selectOption("template-minimal-sand");
  await expect(page.getByLabel("Chú rể", { exact: true })).toHaveValue(
    "Anh Trai",
  );
  await expect(
    page.getByRole("link", { name: "Xem thiệp minh họa của mẫu đang chọn ↗" }),
  ).toHaveAttribute("href", "/preview/loi-hen");

  await page
    .getByRole("combobox", { name: "Ngân hàng nhà trai", exact: true })
    .selectOption("970436");
  await page
    .getByLabel("Số tài khoản nhà trai", { exact: true })
    .fill("1111122222");
  await page
    .getByLabel("Chủ tài khoản nhà trai", { exact: true })
    .fill("NGUYEN VAN A");
  await page
    .getByRole("combobox", { name: "Ngân hàng nhà gái", exact: true })
    .selectOption("970422");
  await page
    .getByLabel("Số tài khoản nhà gái", { exact: true })
    .fill("3333344444");
  await page
    .getByLabel("Chủ tài khoản nhà gái", { exact: true })
    .fill("TRAN THI B");
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
  await expect(
    page.getByRole("table", {
      name: "Quyền lợi của các gói đang được cung cấp",
    }),
  ).toBeVisible();
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
  await admin.goto("http://127.0.0.1:3201/admin/settings");
  await admin
    .getByRole("combobox", { name: "Ngân hàng nhận tiền dịch vụ" })
    .selectOption("970436");
  await admin.getByLabel("Số tài khoản", { exact: true }).fill("123456789");
  await admin
    .getByLabel("Tên chủ tài khoản", { exact: true })
    .fill("TEST MERCHANT");
  await admin
    .getByLabel("Số điện thoại hỗ trợ", { exact: true })
    .fill("0901234567");
  await admin
    .getByLabel("Email hỗ trợ", { exact: true })
    .fill("support@example.com");
  await admin.getByRole("button", { name: "Lưu cấu hình" }).click();
  await expect(admin.getByRole("status")).toContainText("Đã lưu cấu hình");
  const publicSupport = await browser.newPage();
  await publicSupport.goto("http://127.0.0.1:3201/support");
  await expect(
    publicSupport.getByRole("link", { name: "Gọi hỗ trợ: 0901234567" }),
  ).toHaveAttribute("href", "tel:0901234567");
  await expect(
    publicSupport.getByRole("link", { name: "Email: support@example.com" }),
  ).toHaveAttribute("href", "mailto:support@example.com");
  expect(await publicSupport.content()).not.toContain("970436");
  expect(await publicSupport.content()).not.toContain("123456789");
  expect(await publicSupport.content()).not.toContain("TEST MERCHANT");
  await publicSupport.close();

  await page.reload();
  await expect(
    page.getByRole("link", { name: "Gọi hỗ trợ: 0901234567" }),
  ).toHaveAttribute("href", "tel:0901234567");
  await expect(
    page.getByRole("link", { name: "Email: support@example.com" }),
  ).toHaveAttribute("href", "mailto:support@example.com");
  await expect(page.getByText("Chờ xác nhận", { exact: true })).toBeVisible();
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
  await guest.route(
    "https://img.vietqr.io/image/970436-1111122222-*",
    (route) => route.abort(),
  );
  await guest.goto(`http://127.0.0.1:3201${guestHref}`);
  await guest.getByRole("button", { name: "Mở thiệp", exact: true }).click();
  await expect(guest.locator(".invitation-opening")).not.toBeVisible();
  await expect(guest.getByText("Trân trọng kính mời Chị Lan")).toBeVisible();
  await expect(
    guest.getByRole("heading", { name: "NGUYEN VAN A", exact: true }),
  ).toBeVisible();
  await expect(
    guest.getByRole("heading", { name: "TRAN THI B", exact: true }),
  ).toBeVisible();
  await expect(
    guest.getByRole("button", {
      name: "Sao chép số tài khoản nhà trai",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    guest.getByRole("button", {
      name: "Sao chép số tài khoản nhà gái",
      exact: true,
    }),
  ).toBeVisible();
  await guest.locator(".gift-card").first().scrollIntoViewIfNeeded();
  await expect(guest.locator(".gift-card").first()).toContainText(
    "Chưa tải được mã QR",
  );
  await expect(guest.locator(".gift-card").first()).toContainText("1111122222");
  await guest.getByLabel("Số người tham dự").selectOption("2");
  await guest
    .getByLabel("Gửi đôi lời chúc")
    .fill("Chúc anh chị trăm năm hạnh phúc!");
  await guest.getByRole("button", { name: "Gửi xác nhận & lời chúc" }).click();
  await expect(guest.locator(".wedding-rsvp [role=status]")).toContainText(
    "Đã lưu phản hồi",
  );
  await page.reload();
  await expect(
    page.getByText("Chúc anh chị trăm năm hạnh phúc!", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Duyệt lời chúc" }).click();
  await expect(page.getByText("Đã duyệt", { exact: true })).toBeVisible();
  await guest.reload();
  await guest.getByRole("button", { name: "Mở thiệp", exact: true }).click();
  await expect(guest.locator(".invitation-opening")).not.toBeVisible();
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
  // Customer and admin shells also adapt; wide tables scroll within their panel.
  await admin.goto("http://127.0.0.1:3201/admin?period=7");
  await expect(
    admin.getByRole("heading", {
      name: "Tổng quan dịch vụ thiệp cưới",
      exact: true,
    }),
  ).toBeVisible();
  await expect(admin.locator(".stats-grid")).toContainText("199.000");
  await admin.getByText("Xem bảng số liệu theo ngày", { exact: true }).click();
  await expect(admin.getByRole("table").first()).toBeVisible();
  await admin
    .getByRole("combobox", { name: "Khoảng thời gian", exact: true })
    .selectOption("90");
  await admin
    .getByRole("button", { name: "Xem thống kê", exact: true })
    .click();
  await expect(admin).toHaveURL(/period=90/);
  await expect(admin.locator(".revenue-chart svg")).toBeVisible();
  await admin.goto("http://127.0.0.1:3201/admin/customers");
  await expect(admin.locator(".stats-grid")).toContainText("Đang hoạt động");
  await expect(
    admin.getByRole("cell", { name: "Khách kiểm thử", exact: true }),
  ).toBeVisible();
  await expect(admin.locator(".data-table")).toContainText("199.000");
  await admin
    .getByRole("combobox", { name: "Trạng thái tài khoản", exact: true })
    .selectOption("disabled");
  await admin.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(
    admin.getByText("Không có tài khoản phù hợp.", { exact: false }),
  ).toBeVisible();
  await admin.goto("http://127.0.0.1:3201/admin/orders");
  for (const width of [320, 768, 1024]) {
    for (const workspacePage of [page, admin]) {
      await workspacePage.setViewportSize({ width, height: 844 });
      expect(
        await workspacePage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        workspacePage.getByRole("button", { name: "Đăng xuất", exact: true }),
      ).toBeVisible();
    }
  }
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
  await page
    .getByRole("link", { name: "Xem thiệp đầy đủ", exact: true })
    .click();
  await page.getByRole("button", { name: "Mở thiệp", exact: true }).click();
  await expect(page.locator(".invitation-opening")).not.toBeVisible();
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
  await page
    .getByRole("link", { name: "Xem thiệp đầy đủ", exact: true })
    .click();
  await page.getByRole("button", { name: "Mở thiệp", exact: true }).click();
  await expect(page.locator(".invitation-opening")).not.toBeVisible();
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

test("opening doors introduce the invitation and release keyboard focus", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview/song-hy");
  const opening = page.getByRole("dialog", { name: /Minh Anh.*Ngọc Hà/ });
  await expect(opening).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở thiệp", exact: true }),
  ).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Enter");
  await expect(opening).not.toBeVisible();
  await expect(page.locator(".wedding-hero h1")).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.reload();
  await expect(opening).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Escape");
  await expect(opening).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noScript.newPage();
  await fallback.goto("/preview/song-hy");
  await expect(fallback.locator(".wedding-hero h1")).toBeVisible();
  await expect(fallback.locator(".invitation-opening")).not.toBeVisible();
  await noScript.close();
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`responsive pages and all invitation layouts at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const noOverflow = async () => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    };
    await page.goto("/");
    const navigation = page.getByRole("navigation", {
      name: "Điều hướng chính",
    });
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Bộ sưu tập" }),
    ).toBeVisible();
    await noOverflow();
    await navigation.getByRole("link", { name: "Bộ sưu tập" }).click();
    await expect(page).toHaveURL(/\/templates$/);
    await noOverflow();
    for (const path of ["/pricing", "/account/login", "/support"]) {
      await page.goto(path);
      await noOverflow();
    }
    for (const slug of [
      "loi-yeu",
      "vuon-thuong",
      "song-hy",
      "loi-hen",
      "khoanh-khac",
    ]) {
      await page.goto(`/preview/${slug}`);
      const open = page.getByRole("button", { name: "Mở thiệp", exact: true });
      await expect(open).toBeVisible();
      const box = await open.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      await open.click();
      await expect(page.locator(".invitation-opening")).not.toBeVisible();
      await noOverflow();
      // Editable wedding names may be much longer than the sample content.
      await page.locator(".wedding-hero h1").evaluate((heading) => {
        heading.textContent = "Nguyễn Minh Anh Hoàng Phương & Trần Thị Ngọc Hà";
      });
      await noOverflow();
      await expect(page.locator(".wedding-rsvp input[name=name]")).toHaveCSS(
        "font-size",
        "16px",
      );
      await page.getByRole("button", { name: /Xem ảnh kỷ niệm 1 / }).click();
      await expect(
        page.getByRole("dialog", { name: "Album ảnh cưới" }),
      ).toBeVisible();
      const close = page.getByRole("button", { name: "Đóng album" });
      const closeBox = await close.boundingBox();
      expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(
        viewport.height,
      );
      await close.click();
      await noOverflow();
    }
  });
}

test("pricing compares live packages and keeps the selected package through login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/pricing");
  const table = page.getByRole("table", {
    name: "Quyền lợi của các gói đang được cung cấp",
  });
  await expect(table).toContainText("12 ảnh");
  await expect(table).toContainText("24 ảnh");
  await expect(
    page.getByRole("heading", { name: "Gói nào cũng có lời mời đủ đầy" }),
  ).toBeVisible();
  const region = page.getByRole("region", {
    name: "Bảng so sánh gói, có thể cuộn ngang",
  });
  await region.focus();
  await expect(region).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByText("Gia hạn có giữ nguyên link và nội dung không?", { exact: true })
    .click();
  await expect(page.getByText(/không cộng dồn số ảnh/)).toBeVisible();
  await page
    .getByRole("link", { name: "Chọn gói Khởi đầu", exact: true })
    .click();
  await expect(page).toHaveURL(/account\/login/);
  expect(new URL(page.url()).searchParams.get("next")).toContain(
    "plan=plan-essential",
  );
  await page.goto("/templates");
  await page
    .getByRole("link", { name: "Xem thiệp đầy đủ Lời yêu", exact: true })
    .click();
  await expect(page).toHaveURL(/preview\/loi-yeu/);
  await page.getByRole("button", { name: "Mở thiệp", exact: true }).click();
  await expect(page.locator(".invitation-opening")).not.toBeVisible();
});

test("guests can skip motion and reach Vietnamese event information", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/preview/ben-nhau");
  await page
    .getByRole("button", { name: "Xem ngay, bỏ qua hiệu ứng", exact: true })
    .click();
  await expect(page.locator(".invitation-opening")).not.toBeVisible();
  await expect(page.locator(".wedding-hero h1")).toBeFocused();
  const nav = page.getByRole("navigation", { name: "Các mục trong thiệp" });
  await nav
    .getByRole("link", { name: "Lịch tiệc & chỉ đường", exact: true })
    .click();
  await expect(page).toHaveURL(/#lich-tiec$/);
  await expect(page.locator(".event-card strong").first()).toBeVisible();
  const eventCalendars = page
    .locator(".event-card")
    .getByRole("link", { name: "Thêm tiệc này vào lịch", exact: true });
  const firstCalendar = new URL(
    (await eventCalendars.nth(0).getAttribute("href"))!,
  );
  const secondCalendar = new URL(
    (await eventCalendars.nth(1).getAttribute("href"))!,
  );
  expect(firstCalendar.searchParams.get("dates")).toBe(
    "20270214T040000Z/20270214T070000Z",
  );
  expect(secondCalendar.searchParams.get("dates")).toBe(
    "20270213T040000Z/20270213T070000Z",
  );
  expect(firstCalendar.searchParams.get("location")).toContain("Hà Nội");
  expect(secondCalendar.searchParams.get("location")).toContain("Bắc Ninh");

  await expect(page.locator(".event-card p").last()).toHaveCSS(
    "font-size",
    "16px",
  );
  await expect(
    page.getByRole("heading", { name: "Trân trọng cảm ơn!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("photo storytelling follows scroll and becomes static when motion is reduced", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/preview/khoanh-khac");
  await page.getByRole("button", { name: "Xem ngay, bỏ qua hiệu ứng" }).click();
  const story = page.locator(".wedding-photo-story");
  await expect(story).toBeAttached();
  const start = await story.evaluate(
    (el) => el.getBoundingClientRect().top + window.scrollY,
  );
  await page.evaluate((y) => window.scrollTo(0, y + 30), start);
  await expect
    .poll(() =>
      story.evaluate((el) =>
        parseFloat(el.style.getPropertyValue("--story-inset")),
      ),
    )
    .toBeLessThan(12);
  const before = await story.evaluate((el) =>
    parseFloat(el.style.getPropertyValue("--story-inset")),
  );
  await page.evaluate((y) => window.scrollTo(0, y + 300), start);
  await expect
    .poll(() =>
      story.evaluate((el) =>
        parseFloat(el.style.getPropertyValue("--story-inset")),
      ),
    )
    .toBeLessThan(before);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".wedding-photo-stage")).toHaveCSS(
    "position",
    "relative",
  );
  await expect(page.locator(".wedding-photo-frame img")).toHaveCSS(
    "transform",
    "none",
  );
  await expect
    .poll(() =>
      story.evaluate((el) => el.style.getPropertyValue("--story-inset")),
    )
    .toBe("");
});
