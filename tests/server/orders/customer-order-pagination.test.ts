import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import { listCustomerOrdersPage } from "@/server/orders/order-access";

const accountId = "pagination-customer";
async function cleanup() {
  await prisma.order.deleteMany({
    where: { clientId: { startsWith: "pagination-history-" } },
  });
  await prisma.customerAccount.deleteMany({ where: { id: accountId } });
}
beforeAll(async () => {
  await cleanup();
  await prisma.customerAccount.create({
    data: {
      id: accountId,
      displayName: "Khách",
      phoneNormalized: "+84901234588",
      passwordHash: "fixture",
    },
  });
  await prisma.order.createMany({
    data: Array.from({ length: 55 }, (_, i) => ({
      id: `pagination-history-${String(i).padStart(2, "0")}`,
      clientId: `pagination-history-${i}`,
      code: `PAG-HISTORY-${i}`,
      customerAccountId: accountId,
      channel: "online",
      status: "paid",
      fulfillmentStatus: "completed",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    })),
  });
  await prisma.order.createMany({
    data: [
      {
        clientId: "pagination-history-pos",
        code: "PAG-POS",
        customerAccountId: accountId,
        channel: "pos",
        status: "paid",
        fulfillmentStatus: "completed",
      },
      {
        clientId: "pagination-history-other",
        code: "PAG-OTHER",
        channel: "online",
        status: "paid",
        fulfillmentStatus: "completed",
      },
      {
        clientId: "pagination-history-pending",
        code: "PAG-PENDING",
        customerAccountId: accountId,
        channel: "online",
        status: "pending",
        fulfillmentStatus: "new",
      },
    ],
  });
});
afterAll(cleanup);

describe("customer history pagination", () => {
  it("exposes orders older than the first 50 without leaking other accounts or POS, keeping status filters", async () => {
    const first = await listCustomerOrdersPage(accountId, "completed", {
      page: 1,
    });
    const second = await listCustomerOrdersPage(accountId, "completed", {
      page: 2,
    });
    expect(first.items).toHaveLength(50);
    expect(first.total).toBe(55);
    expect(second.items.map((order) => order.id)).toEqual(
      Array.from({ length: 5 }, (_, i) => `pagination-history-${50 + i}`),
    );
    expect(
      new Set([...first.items, ...second.items].map((order) => order.id)).size,
    ).toBe(55);
    expect(
      (await listCustomerOrdersPage(accountId, "completed", { page: 999 }))
        .items,
    ).toEqual(second.items);
  });
  it("scopes counts as strictly as returned records", async () => {
    expect(
      await listCustomerOrdersPage(accountId, "pending", { page: 2 }),
    ).toMatchObject({ total: 1, page: 1 });
    expect(
      await listCustomerOrdersPage("unknown-account", "all", { page: 9 }),
    ).toMatchObject({ total: 0, page: 1, items: [] });
  });
});
