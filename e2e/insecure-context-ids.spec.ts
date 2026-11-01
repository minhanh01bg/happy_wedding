import { test, expect, type Page } from "@playwright/test";

// The test server is reached over plain HTTP on a public IP, which is not a
// secure context, so the browser has no crypto.randomUUID (getRandomValues is
// still there). Playwright's 127.0.0.1 counts as secure, so remove randomUUID
// before any page script runs. The editor, the RSVP form and checkout used to
// call it in the browser and broke there.
async function withoutRandomUUID(page: Page) {
  await page.addInitScript(() => {
    delete (Crypto.prototype as { randomUUID?: unknown }).randomUUID;
  });
}

async function expectNoRandomUUID(page: Page) {
  // The test only proves something if the page really lacks randomUUID.
  expect(
    await page.evaluate(() => ({
      randomUUID: typeof crypto.randomUUID,
      getRandomValues: typeof crypto.getRandomValues,
    })),
  ).toEqual({ randomUUID: "undefined", getRandomValues: "function" });
}

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let registered = 0;
async function registerCustomer(page: Page, name: string) {
  const phone = `09${String(Date.now() + registered++).slice(-8)}`;
  await page.goto("/account/register");
  await page.getByLabel("Tên của bạn").fill(name);
  await page.getByLabel("Số điện thoại").fill(phone);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("customer-password-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tạo tài khoản & bắt đầu" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("the invitation editor loads and adds an event without crypto.randomUUID", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await registerCustomer(page, "Khách http thường");
  await withoutRandomUUID(page);

  await page.goto("/dashboard/new?template=template-rose");
  await expectNoRandomUUID(page);
  const event = (index: number) =>
    page.getByRole("group", { name: `Tiệc ${index}`, exact: true });
  // The demo content starts with two events.
  await expect(event(2)).toBeVisible();
  await page.getByLabel("Đường dẫn thiệp").fill(`http-thuong-${Date.now()}`);
  await page.getByRole("button", { name: "Thêm một tiệc" }).click();
  await expect(event(3)).toBeVisible();
  await event(3).getByLabel("Địa điểm").fill("Nhà văn hóa thôn");
  await event(3).getByLabel("Địa chỉ").fill("Xã Đông Hội, Đông Anh, Hà Nội");
  await expect(page.getByText("Chưa tải được trang")).toHaveCount(0);

  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/dashboard\/c[a-z0-9]+$/);

  // The saved draft opens in the same editor component.
  await page.reload();
  await expectNoRandomUUID(page);
  await expect(event(3).getByLabel("Địa điểm")).toHaveValue("Nhà văn hóa thôn");
  await page.getByRole("button", { name: "Thêm một tiệc" }).click();
  await expect(event(4)).toBeVisible();
  await expect(page.getByText("Chưa tải được trang")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a guest sends an RSVP on a published invitation without crypto.randomUUID", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await withoutRandomUUID(page);

  await page.goto("/w/thiep-mau");
  await expectNoRandomUUID(page);
  await page.getByRole("button", { name: /^Mở thiệp/ }).click();
  await expect(page.locator(".invitation-opening")).not.toBeVisible();
  const rsvp = page.locator("#rsvp form");
  await rsvp.scrollIntoViewIfNeeded();
  await rsvp.getByLabel("Tên của bạn").fill("Khách mời qua http");
  await rsvp
    .getByLabel("Gửi đôi lời chúc")
    .fill("Chúc hai bạn trăm năm hạnh phúc!");
  const sent = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/wedding/rsvp/thiep-mau",
  );
  await rsvp.getByRole("button", { name: "Gửi xác nhận & lời chúc" }).click();
  // Read the status and the error together, so a failure shows the error.
  await expect(rsvp.locator("[role=status], [role=alert]")).toHaveText(
    /^Đã lưu phản hồi/,
  );
  const { clientId } = (await sent).postDataJSON() as { clientId: string };
  expect(clientId).toMatch(UUID_V4);
  // The browser keeps the same id to update this response later.
  expect(
    await page.evaluate(() => localStorage.getItem("rsvp:thiep-mau")),
  ).toBe(clientId);
  expect(errors).toEqual([]);
});

test("checkout creates an order without crypto.randomUUID", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await registerCustomer(page, "Khách mua gói qua http");
  // The draft is only setup here; the editor has its own test above.
  await page.goto("/dashboard/new?template=template-rose");
  await page.getByLabel("Đường dẫn thiệp").fill(`http-mua-${Date.now()}`);
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/dashboard\/c[a-z0-9]+$/);
  const invitationId = page.url().split("/").at(-1)!;

  await withoutRandomUUID(page);
  await page.goto(`/dashboard/orders/new?invitation=${invitationId}`);
  await expectNoRandomUUID(page);
  await page.getByRole("checkbox").check();
  const sent = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/wedding/orders",
  );
  await page
    .getByRole("button", { name: "Tạo đơn & xem hướng dẫn thanh toán" })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/c[a-z0-9]+$/);
  await expect(page.getByText("Chờ xác nhận", { exact: true })).toBeVisible();
  const body = (await sent).postDataJSON() as {
    invitationId: string;
    clientId: string;
  };
  expect(body.invitationId).toBe(invitationId);
  expect(body.clientId).toMatch(UUID_V4);
  expect(errors).toEqual([]);
});
