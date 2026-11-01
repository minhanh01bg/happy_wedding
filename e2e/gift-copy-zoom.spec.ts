import { readFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

/*
 * Hộp quà mừng cưới trên thiệp chạy qua http thường (http://<IP>:3200), nơi
 * trình duyệt không có navigator.clipboard. Playwright vào 127.0.0.1 lại là
 * secure context, nên script khởi tạo bỏ clipboard và đặt isSecureContext =
 * false trước khi trang chạy.
 */

async function chooseDropdown(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function registerCustomer(page: Page, name: string) {
  const phone = `09${String(Date.now()).slice(-8)}`;
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

type CopyLog = { __copied: string[] };

async function asIfPlainHttp(page: Page) {
  await page.addInitScript(() => {
    delete (Navigator.prototype as { clipboard?: unknown }).clipboard;
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      get: () => false,
    });
    // Ghi lại chữ được sao chép: sự kiện copy do execCommand("copy") phát ra.
    const copied: string[] = [];
    (window as unknown as CopyLog).__copied = copied;
    document.addEventListener(
      "copy",
      () => {
        const field = document.activeElement;
        copied.push(
          field instanceof HTMLTextAreaElement
            ? field.value.slice(field.selectionStart, field.selectionEnd)
            : String(document.getSelection()),
        );
      },
      true,
    );
  });
}

const copiedTexts = (page: Page) =>
  page.evaluate(() => (window as unknown as CopyLog).__copied);

test("guests copy account numbers over http and zoom a QR drawn in the page", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const vietQrRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("vietqr.io")) vietQrRequests.push(request.url());
  });

  await registerCustomer(page, "Khách hộp quà");
  await page.goto("/dashboard/new?template=template-rose");
  await page.getByLabel("Đường dẫn thiệp").fill(`hop-qua-${Date.now()}`);
  await chooseDropdown(page, "Ngân hàng nhà trai", "MBBank");
  await page
    .getByLabel("Số tài khoản nhà trai", { exact: true })
    .fill("0123456789");
  await page
    .getByLabel("Chủ tài khoản nhà trai", { exact: true })
    .fill("NGUYEN VAN A");
  await chooseDropdown(page, "Ngân hàng nhà gái", "Vietcombank");
  await page
    .getByLabel("Số tài khoản nhà gái", { exact: true })
    .fill("1111122222");
  await page
    .getByLabel("Chủ tài khoản nhà gái", { exact: true })
    .fill("TRAN THI B");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/dashboard\/c[a-z0-9]+$/);
  const id = new URL(page.url()).pathname.split("/").pop();

  await asIfPlainHttp(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/dashboard/${id}/preview`);
  // Bài kiểm tra chỉ có nghĩa khi trang thật sự không có Clipboard API.
  expect(
    await page.evaluate(() => ({
      clipboard: typeof navigator.clipboard,
      secure: window.isSecureContext,
    })),
  ).toEqual({ clipboard: "undefined", secure: false });

  await page.getByRole("button", { name: "Xem ngay, bỏ qua hiệu ứng" }).click();
  const trigger = page.locator("#gifts .gift-box-trigger");
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Hộp quà yêu thương" });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(
    "Quét mã QR hoặc sao chép số tài khoản để gửi yêu thương",
  );

  // Điện thoại 390px: hai thẻ cạnh nhau, bằng nhau, cả hai nút sao chép đã
  // nằm trong màn hình đầu; cả hộp vừa một màn hình.
  const groomCopy = modal.getByRole("button", {
    name: "Sao chép số tài khoản nhà trai",
    exact: true,
  });
  const brideCopy = modal.getByRole("button", {
    name: "Sao chép số tài khoản nhà gái",
    exact: true,
  });
  await expect(groomCopy).toBeInViewport();
  await expect(brideCopy).toBeInViewport();
  const groomCard = modal
    .locator(".gift-card")
    .filter({ hasText: "NGUYEN VAN A" });
  const brideCard = modal
    .locator(".gift-card")
    .filter({ hasText: "TRAN THI B" });
  const [groomBox, brideBox] = await Promise.all([
    groomCard.boundingBox(),
    brideCard.boundingBox(),
  ]);
  expect(Math.abs(groomBox!.y - brideBox!.y)).toBeLessThan(1);
  expect(Math.abs(groomBox!.height - brideBox!.height)).toBeLessThan(1);
  expect(Math.abs(groomBox!.width - brideBox!.width)).toBeLessThan(1);
  // Hộp quà không phải cuộn bên trong.
  expect(
    await modal.evaluate(
      (dialog) => dialog.scrollHeight <= dialog.clientHeight + 1,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  // Mỗi thông tin một lần: QR không in chữ, thẻ không lặp tên, ngân hàng, số.
  const groomText = (await groomCard.textContent()) ?? "";
  for (const detail of ["NGUYEN VAN A", "MBBank", "0123456789"])
    expect(groomText.split(detail)).toHaveLength(2);
  const groomQr = modal.getByRole("button", {
    name: "Phóng to mã QR mừng cưới nhà trai của NGUYEN VAN A",
    exact: true,
  });
  const smallQr = groomQr.locator("img");
  await expect(smallQr).toHaveAttribute("src", /^data:image\/svg\+xml,/);
  await expect
    .poll(() =>
      smallQr.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(modal.locator("a")).toHaveCount(0);

  // Sao chép qua http: textarea ẩn + execCommand, số không có dấu cách.
  await groomCopy.click();
  await expect(
    groomCard.getByRole("button", { name: "Đã sao chép", exact: true }),
  ).toBeVisible();
  await expect(groomCard.getByRole("status")).toHaveText(
    "Đã sao chép số tài khoản nhà trai.",
  );
  expect(await copiedTexts(page)).toEqual(["0123456789"]);
  // Sau 2 giây nút trở lại như cũ.
  await expect(groomCopy).toBeVisible();
  await modal
    .getByRole("button", {
      name: "Sao chép số tài khoản 1111122222",
      exact: true,
    })
    .click();
  await expect(
    brideCard.getByRole("button", { name: "Đã sao chép", exact: true }),
  ).toBeVisible();
  expect(await copiedTexts(page)).toEqual(["0123456789", "1111122222"]);
  await expect(page.locator("textarea[aria-hidden]")).toHaveCount(0);

  // Bấm chính ảnh QR: lớp xem lớn mở ngay trong trang.
  await groomQr.click();
  const zoom = page.getByRole("dialog", { name: "Mã QR mừng cưới nhà trai" });
  await expect(zoom).toBeVisible();
  const bigQr = zoom.getByRole("img", {
    name: "Mã QR mừng cưới nhà trai cho NGUYEN VAN A",
  });
  await expect(bigQr).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect
    .poll(() => bigQr.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  expect((await bigQr.boundingBox())!.width).toBeGreaterThan(280);
  await expect(
    zoom.getByRole("button", { name: "Đóng mã QR phóng to" }),
  ).toBeFocused();
  await expect(zoom).toContainText("Nhấn giữ ảnh để lưu vào máy");
  await expect(zoom.locator("a")).toHaveCount(0);

  // Tải ảnh QR: file PNG tải về ngay, không mở tab mới.
  const download = page.waitForEvent("download");
  await zoom.getByRole("button", { name: "Tải ảnh QR", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("qr-mung-cuoi-nha-trai.png");
  const png = await readFile(await file.path());
  expect([...png.subarray(0, 8)]).toEqual([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  expect(page.context().pages()).toHaveLength(1);

  await zoom
    .getByRole("button", {
      name: "Sao chép số tài khoản nhà trai",
      exact: true,
    })
    .click();
  await expect(
    zoom.getByRole("button", { name: "Đã sao chép", exact: true }),
  ).toBeVisible();

  // Esc đầu tiên chỉ đóng lớp QR; hộp quà vẫn mở, focus về ảnh QR.
  await page.keyboard.press("Escape");
  await expect(zoom).not.toBeVisible();
  await expect(groomQr).toBeFocused();
  await expect(modal).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  // Chạm nền tối cũng đóng.
  await groomQr.click();
  await expect(zoom).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(zoom).not.toBeVisible();
  await expect(groomQr).toBeFocused();
  await expect(modal).toBeVisible();

  // Và nút X.
  await groomQr.click();
  await zoom.getByRole("button", { name: "Đóng mã QR phóng to" }).click();
  await expect(zoom).not.toBeVisible();
  await expect(groomQr).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(vietQrRequests).toEqual([]);
  expect(errors).toEqual([]);
});
