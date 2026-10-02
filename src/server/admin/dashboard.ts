import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { LOW_STOCK_WHERE } from "@/server/products/low-stock";
import {
  toVietnamDateKey,
  type LowStockRow,
  type ReportDays,
} from "@/server/reports/daily-revenue";

import { getSalesAnalytics, type SalesAnalytics } from "./sales-analytics";

/** So ngay tren bieu do tong quan — `getDailyRevenue` nhan 7 | 14 | 30. */
const DASHBOARD_LIST_SIZE = 5;

/** Don online dang doi cua hang ra tay: chua xac nhan hoac chua soan hang. */
export const AWAITING_FULFILLMENT_STATUSES = ["new", "confirmed"] as const;

const latestOnlineOrderSelect = {
  id: true,
  code: true,
  total: true,
  status: true,
  fulfillmentStatus: true,
  contactName: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

export type DashboardOnlineOrder = Prisma.OrderGetPayload<{
  select: typeof latestOnlineOrderSelect;
}>;

export interface DashboardDayPoint {
  /** YYYY-MM-DD theo gio Viet Nam. */
  date: string;
  revenue: number;
  orderCount: number;
}

export interface DashboardSummary {
  today: { revenue: number; orderCount: number };
  awaitingOnlineCount: number;
  lowStockCount: number;
  /** Kỳ được chọn (mặc định 7 ngày), tăng dần; ngày không bán có doanh thu 0. */
  week: DashboardDayPoint[];
  latestOnlineOrders: DashboardOnlineOrder[];
  lowStockProducts: LowStockRow[];
  analytics: SalesAnalytics;
}

/**
 * Tong quan cho trang /admin. Doanh thu/so don hom nay lay tu cung chuoi
 * dữ liệu analytics của biểu đồ (bo don huy, chia ngay theo gio VN) nen
 * o "Hôm nay" va diem cuoi bieu do luon khop nhau.
 */
export async function getDashboardSummary(
  days: ReportDays = 7,
): Promise<DashboardSummary> {
  const now = new Date();

  const [
    analytics,
    awaitingOnlineCount,
    lowStockCount,
    latestOnlineOrders,
    lowStockProducts,
  ] = await Promise.all([
    getSalesAnalytics(days, now),
    prisma.order.count({
      where: {
        channel: "online",
        fulfillmentStatus: { in: [...AWAITING_FULFILLMENT_STATUSES] },
        // Huy don tu /admin/orders chi doi `status`, giu nguyen fulfillmentStatus.
        status: { not: "cancelled" },
      },
    }),
    prisma.product.count({ where: LOW_STOCK_WHERE }),
    prisma.order.findMany({
      where: { channel: "online" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: DASHBOARD_LIST_SIZE,
      select: latestOnlineOrderSelect,
    }),
    prisma.product.findMany({
      where: LOW_STOCK_WHERE,
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: DASHBOARD_LIST_SIZE,
      select: { id: true, name: true, stock: true, unit: true },
    }),
  ]);

  const byDate = new Map(analytics.daily.map((row) => [row.date, row]));
  const week = analytics.daily.map(({ date, revenue, orderCount }) => ({
    date,
    revenue,
    orderCount,
  }));
  const todayRow = byDate.get(toVietnamDateKey(now));

  return {
    today: {
      revenue: todayRow?.revenue ?? 0,
      orderCount: todayRow?.orderCount ?? 0,
    },
    awaitingOnlineCount,
    lowStockCount,
    week,
    latestOnlineOrders,
    lowStockProducts,
    analytics,
  };
}
