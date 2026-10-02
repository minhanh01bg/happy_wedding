import { roundVnd } from "@/lib/money";
import { prisma } from "@/server/db/prisma";
import {
  listVietnamDateKeys,
  toVietnamDateKey,
  type ReportDays,
} from "@/server/reports/daily-revenue";

export interface AnalyticsLine {
  id: string;
  productId: string | null;
  nameSnapshot: string;
  unit: string;
  quantity: number;
  lineTotal: number;
  costPriceSnapshot: number | null;
}
export interface AnalyticsOrder {
  id: string;
  createdAt: Date;
  status: string;
  channel: string;
  total: number;
  discount: number;
  items: AnalyticsLine[];
}
export interface ProductSalesRow {
  id: string;
  productId: string | null;
  name: string;
  unit: string;
  quantity: number;
  revenue: number;
  grossProfit: number;
  knownCostLineCount: number;
  unknownCostLineCount: number;
}
export interface SalesDayPoint {
  date: string;
  revenue: number;
  orderCount: number;
  grossProfit: number;
  byChannel: { pos: number; online: number };
}
export interface SalesAnalytics {
  days: ReportDays;
  daily: SalesDayPoint[];
  totals: {
    revenue: number;
    merchandiseRevenue: number;
    orderCount: number;
    grossProfit: number;
    unknownCostLineCount: number;
  };
  byChannel: Record<"pos" | "online", { revenue: number; orderCount: number }>;
  topQuantity: ProductSalesRow[];
  topProfit: ProductSalesRow[];
}

export function vietnamSalesPeriodStart(now: Date, days: ReportDays): Date {
  return new Date(`${listVietnamDateKeys(days, now)[0]}T00:00:00+07:00`);
}

/** Exact integer VND shares; stable ties follow historical item order. */
export function allocateOrderDiscount(
  lineTotals: number[],
  discount: number,
): number[] {
  const weights = lineTotals.map((value) => BigInt(Math.max(0, value)));
  const total = weights.reduce((sum, value) => sum + value, BigInt(0));
  if (total === BigInt(0)) return lineTotals.map(() => 0);
  const requested = BigInt(Math.max(0, roundVnd(discount)));
  const capped = requested < total ? requested : total;
  const shares = weights.map((weight, index) => ({
    index,
    amount: (capped * weight) / total,
    remainder: (capped * weight) % total,
  }));
  let leftover =
    capped - shares.reduce((sum, share) => sum + share.amount, BigInt(0));
  const remainderOrder = [...shares].sort((a, b) =>
    a.remainder === b.remainder
      ? a.index - b.index
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (const share of remainderOrder) {
    if (leftover === BigInt(0)) break;
    share.amount += BigInt(1);
    leftover -= BigInt(1);
  }
  return shares.map((share) => Number(share.amount));
}

export function summarizeSales(
  orders: AnalyticsOrder[],
  days: ReportDays,
  now: Date,
): SalesAnalytics {
  const start = vietnamSalesPeriodStart(now, days);
  const daily = listVietnamDateKeys(days, now).map(
    (date): SalesDayPoint => ({
      date,
      revenue: 0,
      orderCount: 0,
      grossProfit: 0,
      byChannel: { pos: 0, online: 0 },
    }),
  );
  const byDate = new Map(daily.map((day) => [day.date, day]));
  const totals: SalesAnalytics["totals"] = {
    revenue: 0,
    merchandiseRevenue: 0,
    orderCount: 0,
    grossProfit: 0,
    unknownCostLineCount: 0,
  };
  const byChannel: SalesAnalytics["byChannel"] = {
    pos: { revenue: 0, orderCount: 0 },
    online: { revenue: 0, orderCount: 0 },
  };
  const products = new Map<string, ProductSalesRow>();
  const newestFirst = [...orders].sort(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id),
  );
  for (const order of newestFirst) {
    if (
      order.status === "cancelled" ||
      order.createdAt < start ||
      order.createdAt > now
    )
      continue;
    const day = byDate.get(toVietnamDateKey(order.createdAt))!;
    const channel = order.channel === "online" ? "online" : "pos";
    totals.revenue += order.total;
    totals.orderCount += 1;
    day.revenue += order.total;
    day.orderCount += 1;
    day.byChannel[channel] += order.total;
    byChannel[channel].revenue += order.total;
    byChannel[channel].orderCount += 1;
    const shares = allocateOrderDiscount(
      order.items.map((item) => item.lineTotal),
      order.discount,
    );
    order.items.forEach((line, index) => {
      const id = line.productId
        ? `product:${JSON.stringify([line.productId, line.unit])}`
        : `historical:${JSON.stringify([line.nameSnapshot, line.unit])}`;
      const row = products.get(id) ?? {
        id,
        productId: line.productId,
        name: line.nameSnapshot,
        unit: line.unit,
        quantity: 0,
        revenue: 0,
        grossProfit: 0,
        knownCostLineCount: 0,
        unknownCostLineCount: 0,
      };
      const netRevenue = line.lineTotal - shares[index];
      row.quantity += line.quantity;
      row.revenue += netRevenue;
      totals.merchandiseRevenue += netRevenue;
      if (line.costPriceSnapshot === null) {
        row.unknownCostLineCount += 1;
        totals.unknownCostLineCount += 1;
      } else {
        const profit =
          netRevenue - roundVnd(line.costPriceSnapshot * line.quantity);
        row.grossProfit += profit;
        row.knownCostLineCount += 1;
        totals.grossProfit += profit;
        day.grossProfit += profit;
      }
      products.set(id, row);
    });
  }
  const rows = [...products.values()];
  const tie = (a: ProductSalesRow, b: ProductSalesRow) =>
    a.id.localeCompare(b.id);
  return {
    days,
    daily,
    totals,
    byChannel,
    topQuantity: [...rows]
      .sort((a, b) => b.quantity - a.quantity || tie(a, b))
      .slice(0, 5),
    topProfit: rows
      .filter((row) => row.knownCostLineCount > 0)
      .sort((a, b) => b.grossProfit - a.grossProfit || tie(a, b))
      .slice(0, 5),
  };
}

export async function getSalesAnalytics(
  days: ReportDays = 7,
  now: Date = new Date(),
): Promise<SalesAnalytics> {
  const orders = await prisma.order.findMany({
    where: {
      status: { not: "cancelled" },
      createdAt: { gte: vietnamSalesPeriodStart(now, days), lte: now },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      createdAt: true,
      channel: true,
      status: true,
      total: true,
      discount: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          productId: true,
          nameSnapshot: true,
          unit: true,
          quantity: true,
          lineTotal: true,
          costPriceSnapshot: true,
        },
      },
    },
  });
  return summarizeSales(orders, days, now);
}
