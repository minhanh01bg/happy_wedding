import { test, expect } from "@playwright/test";

// A couple whose printed card says "Buổi sáng" instead of an hour saves that
// written time on one event. Their own draft preview must show it in place of
// the clock, keep the date, and offer an all-day calendar entry, while the
// other event keeps its clock time and timed calendar link.
test("an event saved with a written time shows it instead of the clock on the invitation", async ({
  page,
}) => {
  const slug = `buoi-sang-${Date.now()}`;
  await page.goto("/account/register");
  await page.getByLabel("Tên của bạn").fill("Khách ghi giờ bằng chữ");
  await page
    .getByLabel("Số điện thoại")
    .fill(`09${String(Date.now()).slice(-8)}`);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("customer-password-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tạo tài khoản & bắt đầu" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/dashboard/new?template=template-rose");
  await expect(
    page.getByRole("link", { name: "Xem thiệp minh họa của mẫu đang chọn ↗" }),
  ).toHaveAttribute("href", "/preview/loi-yeu");
  await page.getByLabel("Đường dẫn thiệp").fill(slug);
  // The new form starts from the demo events: 11:00 on 14/02 and 13/02/2027.
  const labelField = (index: number) =>
    page
      .getByRole("group", { name: `Tiệc ${index}`, exact: true })
      .getByLabel("Ghi giờ bằng chữ (tùy chọn)");
  await labelField(1).fill("Buổi sáng");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/dashboard\/c[a-z0-9]+$/);
  const invitationId = page.url().split("/").at(-1)!;

  await page.reload();
  await expect(labelField(1)).toHaveValue("Buổi sáng");
  await expect(labelField(2)).toHaveValue("");

  await page.goto(`/dashboard/${invitationId}/preview`);
  await page.getByRole("button", { name: /^Mở thiệp/ }).click();
  await expect(page.locator(".invitation-opening")).not.toBeVisible();
  const cards = page.locator("#lich-tiec .event-card");
  await expect(cards).toHaveCount(2);
  await cards.first().scrollIntoViewIfNeeded();

  const labelled = cards.nth(0);
  await expect(labelled.locator("time")).toHaveText("Buổi sáng · 14/02/2027");
  await expect(labelled.locator("time")).toHaveAttribute(
    "datetime",
    "2027-02-14",
  );
  await expect(labelled).not.toContainText("11:00");
  const clocked = cards.nth(1);
  await expect(clocked.locator("time")).toHaveText("11:00 · 13/02/2027");

  const calendarDates = async (index: number) =>
    new URL(
      (await cards
        .nth(index)
        .getByRole("link", { name: "Thêm tiệc này vào lịch", exact: true })
        .getAttribute("href"))!,
    ).searchParams.get("dates");
  expect(await calendarDates(0)).toBe("20270214/20270215");
  expect(await calendarDates(1)).toBe("20270213T040000Z/20270213T070000Z");
});
