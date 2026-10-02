import { describe, expect, it } from "vitest";

import {
  allocateOrderDiscount,
  summarizeSales,
  type AnalyticsOrder,
} from "@/server/admin/sales-analytics";

const now = new Date("2026-09-24T18:30:00Z");
const order = (overrides: Partial<AnalyticsOrder> = {}): AnalyticsOrder => ({
  id: "order",
  createdAt: new Date("2026-09-24T18:00:00Z"),
  status: "paid",
  channel: "pos",
  total: 310,
  discount: 11,
  items: [
    {
      id: "a",
      productId: "p1",
      nameSnapshot: "Bugi",
      unit: "cái",
      quantity: 1.5,
      lineTotal: 150,
      costPriceSnapshot: 60,
    },
    {
      id: "b",
      productId: "p2",
      nameSnapshot: "Dầu",
      unit: "lít",
      quantity: 1,
      lineTotal: 150,
      costPriceSnapshot: 200,
    },
  ],
  ...overrides,
});

describe("sales analytics", () => {
  it("phân bổ giảm giá toàn đơn theo phần dư lớn nhất, không giảm lần hai giảm giá dòng", () => {
    expect(allocateOrderDiscount([150, 150], 11)).toEqual([6, 5]);
    expect(allocateOrderDiscount([1, 2, 3], 100)).toEqual([1, 2, 3]);
    expect(allocateOrderDiscount([0, 0], 10)).toEqual([0, 0]);
  });
  it("doanh thu gồm ship, lợi nhuận chỉ tiền hàng ròng trừ giá vốn chụp theo số lượng lẻ", () => {
    const result = summarizeSales([order()], 7, now);
    expect(result.totals).toMatchObject({
      revenue: 310,
      orderCount: 1,
      merchandiseRevenue: 289,
      grossProfit: -1,
      unknownCostLineCount: 0,
    });
    expect(result.topQuantity[0]).toMatchObject({
      productId: "p1",
      quantity: 1.5,
      revenue: 144,
      grossProfit: 54,
    });
    expect(result.topProfit.map((row) => row.grossProfit)).toEqual([54, -55]);
    expect(result.daily.at(-1)).toMatchObject({
      date: "2026-09-25",
      grossProfit: -1,
      byChannel: { pos: 310, online: 0 },
    });
  });
  it("dòng giá vốn cũ không tạo lợi nhuận giả và gom hàng tùy ý theo tên + đơn vị", () => {
    const legacy = order({
      items: [
        {
          id: "old",
          productId: null,
          nameSnapshot: "Công sửa",
          unit: "lần",
          quantity: 2.5,
          lineTotal: 100,
          costPriceSnapshot: null,
        },
      ],
      discount: 0,
      total: 100,
      channel: "online",
    });
    const result = summarizeSales(
      [legacy, { ...legacy, id: "again" }],
      14,
      now,
    );
    expect(result.totals).toMatchObject({
      grossProfit: 0,
      unknownCostLineCount: 2,
      revenue: 200,
    });
    expect(result.topQuantity).toHaveLength(1);
    expect(result.topQuantity[0]).toMatchObject({
      quantity: 5,
      revenue: 200,
      unknownCostLineCount: 2,
    });
    expect(result.topProfit).toEqual([]);
    expect(result.byChannel.online).toEqual({ revenue: 200, orderCount: 2 });
  });
  it("kỳ từ 00:00 Việt Nam đến hiện tại, bỏ đơn hủy và ngày tương lai", () => {
    const result = summarizeSales(
      [
        order({ id: "start", createdAt: new Date("2026-09-18T17:00:00Z") }),
        order({ id: "before", createdAt: new Date("2026-09-18T16:59:59Z") }),
        order({ id: "future", createdAt: new Date(now.getTime() + 1) }),
        order({ id: "cancelled", status: "cancelled" }),
      ],
      7,
      now,
    );
    expect(result.totals.orderCount).toBe(1);
    expect(result.daily).toHaveLength(7);
    expect(result.daily[0]).toMatchObject({
      date: "2026-09-19",
      orderCount: 1,
    });
  });
  it("cùng sản phẩm đổi đơn vị không cộng kg với g, tên lấy từ lần ghi nhận mới nhất", () => {
    const newest = order({
      id: "new",
      items: [
        {
          ...order().items[0],
          nameSnapshot: "Tên mới",
          quantity: 1,
          unit: "kg",
        },
      ],
    });
    const old = order({
      id: "old",
      createdAt: new Date("2026-09-24T17:30:00Z"),
      items: [
        {
          ...order().items[0],
          nameSnapshot: "Tên cũ",
          quantity: 500,
          unit: "g",
        },
        {
          ...order().items[0],
          id: "same-unit",
          nameSnapshot: "Tên cũ",
          quantity: 2,
          unit: "kg",
        },
      ],
    });
    const result = summarizeSales([old, newest], 7, now);
    expect(result.topQuantity).toHaveLength(2);
    expect(result.topQuantity.find((row) => row.unit === "kg")).toMatchObject({
      name: "Tên mới",
      quantity: 3,
    });
    expect(result.topQuantity.find((row) => row.unit === "g")).toMatchObject({
      quantity: 500,
    });
  });
});
