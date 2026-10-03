import { prisma } from "@/server/db/prisma";

const DAY = 86_400_000;
const VIETNAM_OFFSET = 7 * 3_600_000;
export const REPORT_PERIODS = [7, 30, 90] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];
export type RevenuePoint = { date: string; amount: number; orders: number };
export function reportPeriod(raw?: string): ReportPeriod {
  const value = Number(raw);
  return REPORT_PERIODS.includes(value as ReportPeriod)
    ? (value as ReportPeriod)
    : 30;
}
export function vietnamDay(date: Date) {
  return new Date(date.getTime() + VIETNAM_OFFSET).toISOString().slice(0, 10);
}

/** Caller must resolve an owner/manager DB session before requesting this report. */
export async function weddingReport(period: ReportPeriod, now = new Date()) {
  const today =
    Math.floor((now.getTime() + VIETNAM_OFFSET) / DAY) * DAY - VIETNAM_OFFSET;
  const to = new Date(today + DAY);
  const from = new Date(to.getTime() - period * DAY);
  const previousFrom = new Date(from.getTime() - period * DAY);
  const realCustomers = { phoneNormalized: { not: "+84000000000" } };
  const realInvitations = { isDemo: false };
  const realOrders = { invitation: realInvitations };
  const liveEntitlement = { status: "paid", expiresAt: { gt: now } };
  const [
    customers,
    activeCustomers,
    newCustomers,
    invitations,
    published,
    suspended,
    templates,
    activeTemplates,
    premiumTemplates,
    plans,
    activePlans,
    pending,
    awaitingReview,
    payments,
    allRevenue,
    previousRevenue,
    recentOrders,
    expired,
  ] = await Promise.all([
    prisma.customerAccount.count({ where: realCustomers }),
    prisma.customerAccount.count({
      where: { ...realCustomers, disabledAt: null },
    }),
    prisma.customerAccount.count({
      where: { ...realCustomers, createdAt: { gte: from, lt: to } },
    }),
    prisma.invitation.count({ where: realInvitations }),
    prisma.invitation.count({
      where: {
        ...realInvitations,
        status: "published",
        owner: { disabledAt: null },
        orders: { some: liveEntitlement },
      },
    }),
    prisma.invitation.count({
      where: { ...realInvitations, status: "suspended" },
    }),
    prisma.weddingTemplate.count(),
    prisma.weddingTemplate.count({ where: { active: true } }),
    prisma.weddingTemplate.count({ where: { active: true, premium: true } }),
    prisma.servicePlan.count(),
    prisma.servicePlan.count({ where: { active: true } }),
    prisma.serviceOrder.count({ where: { ...realOrders, status: "pending" } }),
    prisma.serviceOrder.count({
      where: { ...realOrders, status: "pending", paymentNote: { not: "" } },
    }),
    prisma.weddingPayment.findMany({
      where: { order: realOrders, receivedAt: { gte: from, lt: to } },
      select: {
        amount: true,
        receivedAt: true,
        orderId: true,
        order: { select: { planName: true } },
      },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.weddingPayment.aggregate({
      where: { order: realOrders },
      _sum: { amount: true },
    }),
    prisma.weddingPayment.aggregate({
      where: { order: realOrders, receivedAt: { gte: previousFrom, lt: from } },
      _sum: { amount: true },
    }),
    prisma.serviceOrder.findMany({
      where: realOrders,
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        account: { select: { displayName: true } },
        invitation: { select: { groom: true, bride: true } },
      },
    }),
    prisma.invitation.count({
      where: {
        ...realInvitations,
        status: "published",
        orders: { none: liveEntitlement },
      },
    }),
  ]);
  const daily: RevenuePoint[] = Array.from({ length: period }, (_, index) => ({
    date: vietnamDay(new Date(from.getTime() + index * DAY)),
    amount: 0,
    orders: 0,
  }));
  const points = new Map(daily.map((point) => [point.date, point]));
  const dailyOrders = new Map<string, Set<string>>();
  const sales = new Map<
    string,
    { name: string; amount: number; orders: Set<string> }
  >();
  for (const payment of payments) {
    const day = vietnamDay(payment.receivedAt);
    const point = points.get(day)!;
    point.amount += payment.amount;
    const ids = dailyOrders.get(day) ?? new Set<string>();
    ids.add(payment.orderId);
    dailyOrders.set(day, ids);
    point.orders = ids.size;
    const sale = sales.get(payment.order.planName) ?? {
      name: payment.order.planName,
      amount: 0,
      orders: new Set<string>(),
    };
    sale.amount += payment.amount;
    sale.orders.add(payment.orderId);
    sales.set(sale.name, sale);
  }
  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return {
    period,
    from,
    to,
    daily,
    revenue,
    allRevenue: allRevenue._sum.amount ?? 0,
    previousRevenue: previousRevenue._sum.amount ?? 0,
    paidOrders: new Set(payments.map((payment) => payment.orderId)).size,
    customers,
    activeCustomers,
    disabledCustomers: customers - activeCustomers,
    newCustomers,
    invitations,
    published,
    suspended,
    expired,
    templates,
    activeTemplates,
    premiumTemplates,
    plans,
    activePlans,
    pending,
    awaitingReview,
    recentOrders,
    sales: [...sales.values()]
      .map((sale) => ({
        name: sale.name,
        amount: sale.amount,
        orders: sale.orders.size,
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}
