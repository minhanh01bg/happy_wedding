import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

test("admin mở được cài đặt có dữ liệu cũ sai định dạng để sửa", async ({
  page,
}) => {
  const prisma = new PrismaClient();
  const legacy = [
    { key: "store.name", value: "x".repeat(101) },
    { key: "store.hotline", value: "123" },
    { key: "store.mapUrl", value: "https://" },
  ];
  const original = await prisma.setting.findMany({
    where: { key: { in: legacy.map((entry) => entry.key) } },
  });
  try {
    for (const entry of legacy) {
      await prisma.setting.upsert({
        where: { key: entry.key },
        create: entry,
        update: { value: entry.value },
      });
    }
    await page.goto("/login?next=%2Fadmin%2Fsettings");
    await page.getByLabel("Mật khẩu cửa hàng").fill("123456");
    await page.getByRole("button", { name: "Vào bán hàng" }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/, { timeout: 15_000 });
    await expect(page.locator("#store-name")).toHaveValue(legacy[0].value);
    await expect(page.locator("#store-hotline")).toHaveValue("123");
    await expect(page.locator("#store-map-url")).toHaveValue("https://");
    await expect(page.getByText("Không thể tải trang quản lý")).toHaveCount(0);
  } finally {
    for (const entry of legacy) {
      const previous = original.find((record) => record.key === entry.key);
      if (previous) {
        await prisma.setting.update({
          where: { key: entry.key },
          data: { value: previous.value },
        });
      } else {
        await prisma.setting.deleteMany({ where: { key: entry.key } });
      }
    }
    await prisma.$disconnect();
  }
});
