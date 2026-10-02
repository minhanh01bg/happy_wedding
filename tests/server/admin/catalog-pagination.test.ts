import { beforeEach, describe, expect, it } from "vitest";

import { listAdminCategories } from "@/server/admin/list-categories";
import { listAdminPromotions } from "@/server/admin/list-promotions";
import { prisma } from "@/server/db/prisma";

beforeEach(async () => {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.storefrontPromotion.deleteMany();
});

describe("admin catalog pagination", () => {
  it("pages categories in global reorder order with product counts and clamps deleted pages", async () => {
    await prisma.category.createMany({
      data: Array.from({ length: 23 }, (_, i) => ({
        id: `page-category-${i}`,
        name: `Danh mục ${String(i).padStart(2, "0")}`,
        sortOrder: 1,
      })),
    });
    await prisma.product.create({
      data: {
        name: "Sản phẩm",
        unit: "cái",
        categoryId: "page-category-20",
        price: 1000,
      },
    });
    const first = await listAdminCategories({ page: 1, pageSize: 20 });
    const second = await listAdminCategories({ page: 2, pageSize: 20 });
    expect(first.items).toHaveLength(20);
    expect(second.total).toBe(23);
    expect(second.items.map((item) => item.id)).toEqual([
      "page-category-20",
      "page-category-21",
      "page-category-22",
    ]);
    expect(second.items[0]._count.products).toBe(1);
    await prisma.category.deleteMany({
      where: { id: { in: ["page-category-21", "page-category-22"] } },
    });
    const clamped = await listAdminCategories({ page: 99, pageSize: 20 });
    expect(clamped.page).toBe(2);
    expect(clamped.total).toBe(21);
    expect(clamped.items.map((item) => item.id)).toEqual(["page-category-20"]);
  });

  it("pages campaigns deterministically and includes inactive records", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    await prisma.storefrontPromotion.createMany({
      data: Array.from({ length: 23 }, (_, i) => ({
        id: `page-promo-${String(i).padStart(2, "0")}`,
        title: `Chiến dịch ${i}`,
        priority: i < 3 ? 10 : 0,
        isActive: i !== 22,
        createdAt,
      })),
    });
    const first = await listAdminPromotions({ page: 1, pageSize: 20 });
    const second = await listAdminPromotions({ page: 2, pageSize: 20 });
    expect(first.items).toHaveLength(20);
    expect(first.items.slice(0, 3).map((item) => item.priority)).toEqual([
      10, 10, 10,
    ]);
    expect(second.total).toBe(23);
    expect(second.items.map((item) => item.id)).toEqual([
      "page-promo-20",
      "page-promo-21",
      "page-promo-22",
    ]);
    expect(second.items[2].isActive).toBe(false);
    expect(
      new Set([...first.items, ...second.items].map((item) => item.id)).size,
    ).toBe(23);
    expect(
      (await listAdminPromotions({ page: 99, pageSize: 20 })).items,
    ).toEqual(second.items);
  });

  it("empty lists clamp to page one", async () => {
    expect(await listAdminCategories({ page: 9 })).toMatchObject({
      items: [],
      total: 0,
      page: 1,
    });
    expect(await listAdminPromotions({ page: 9 })).toMatchObject({
      items: [],
      total: 0,
      page: 1,
    });
  });
});
