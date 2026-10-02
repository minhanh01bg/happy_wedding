import { afterAll, beforeAll, expect, it } from "vitest";

import {
  listDebtCustomers,
  listSettledDebtsPage,
} from "@/server/admin/list-debts";
import { prisma } from "@/server/db/prisma";

async function cleanup() {
  await prisma.payment.deleteMany({
    where: { order: { clientId: { startsWith: "debt-page-" } } },
  });
  await prisma.order.deleteMany({
    where: { clientId: { startsWith: "debt-page-" } },
  });
  await prisma.customer.deleteMany({
    where: { id: { startsWith: "debt-page-" } },
  });
}
beforeAll(async () => {
  await cleanup();
  for (let i = 0; i < 23; i++) {
    const id = `debt-page-${String(i).padStart(2, "0")}`;
    await prisma.customer.create({ data: { id, name: id } });
    await prisma.order.create({
      data: {
        id,
        clientId: id,
        code: id,
        status: "debt",
        total: 1000,
        customerId: id,
        payments: {
          create: [{ method: "cash", amount: 400, receivedAt: new Date() }],
        },
      },
    });
    await prisma.order.create({
      data: {
        clientId: `${id}-settled`,
        code: `${id}-settled`,
        status: "paid",
        customerId: id,
        total: 1000,
        payments: {
          create: [
            { method: "debt", amount: 1000 },
            { method: "transfer", amount: 1000, receivedAt: new Date() },
          ],
        },
      },
    });
  }
  await prisma.order.create({
    data: {
      clientId: "debt-page-extra",
      code: "debt-page-extra",
      status: "debt",
      total: 500,
      customerId: "debt-page-20",
    },
  });
});
afterAll(cleanup);

it("pages customer balances while summing all orders for each selected customer", async () => {
  const page = await listDebtCustomers({ page: 2, pageSize: 20 });
  expect(page.total).toBe(23);
  expect(page.items).toHaveLength(3);
  expect(page.items.find((item) => item.key === "debt-page-20")?.balance).toBe(
    1100,
  );
  expect((await listDebtCustomers({ page: 999, pageSize: 20 })).items).toEqual(
    page.items,
  );
});
it("makes older settled debts reachable and counts only historically debt-paid orders", async () => {
  const page = await listSettledDebtsPage({ page: 2, pageSize: 20 });
  expect(page.total).toBe(23);
  expect(page.items).toHaveLength(3);
  expect(page.items.every((item) => item.paid === 1000)).toBe(true);
  expect((await listSettledDebtsPage({ page: 99, pageSize: 20 })).page).toBe(2);
});
