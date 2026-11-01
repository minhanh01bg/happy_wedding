import { describe, expect, it } from "vitest";

import {
  eventDayLabel,
  eventWeekday,
  eventIsoDay,
  eventSide,
  eventTimeLabel,
} from "@/lib/rsvp-events";
import { eventSchema } from "@/lib/wedding";

const base = {
  date: "2026-11-08T16:00:00+07:00",
  venue: "Nhà hàng minh họa",
  address: "Địa chỉ minh họa",
};

describe("eventSide", () => {
  it("uses an explicit side over the title", () => {
    expect(eventSide({ title: "Tiệc cưới nhà gái", side: "groom" })).toBe(
      "groom",
    );
    expect(eventSide({ title: "Tiệc báo hỷ", side: "bride" })).toBe("bride");
  });

  it.each([
    ["Tiệc cưới nhà trai", "groom"],
    ["LỄ THÀNH HÔN NHÀ TRAI", "groom"],
    ["Tiệc cưới Nhà Gái", "bride"],
    ["Lễ Vu Quy", "bride"],
    // Chữ Việt dạng tổ hợp (NFD) như bàn phím macOS gửi.
    ["Tiệc cưới nhà gái".normalize("NFD"), "bride"],
  ] as const)("infers %s from the title", (title, side) => {
    expect(eventSide({ title })).toBe(side);
  });

  it.each(["Tiệc cưới", "Lễ thành hôn", "Tiệc báo hỷ", "Nhà hàng trai gái"])(
    "leaves %s without a side",
    (title) => {
      expect(eventSide({ title })).toBeUndefined();
    },
  );
});

describe("event side in the schema", () => {
  it("keeps old JSON without side valid", () => {
    expect(
      eventSchema.parse({ title: "Tiệc cưới", ...base }),
    ).not.toHaveProperty("side");
  });

  it("accepts groom and bride, rejects anything else", () => {
    expect(
      eventSchema.parse({ title: "Tiệc", side: "bride", ...base }).side,
    ).toBe("bride");
    expect(
      eventSchema.safeParse({ title: "Tiệc", side: "both", ...base }).success,
    ).toBe(false);
    expect(
      eventSchema.safeParse({ title: "Tiệc", side: "", ...base }).success,
    ).toBe(false);
  });
});

describe("event day and time labels", () => {
  it("names the weekday and day in Vietnam time", () => {
    expect(eventDayLabel({ date: "2026-11-08T09:00:00.000Z" })).toBe(
      "Chủ nhật · 08/11",
    );
    expect(eventDayLabel({ date: "2026-11-09T08:00:00+07:00" })).toBe(
      "Thứ hai · 09/11",
    );
    // 23:30 UTC ngày 8 đã là ngày 9 ở Việt Nam.
    expect(eventDayLabel({ date: "2026-11-08T23:30:00.000Z" })).toBe(
      "Thứ hai · 09/11",
    );
    expect(eventIsoDay({ date: "2026-11-08T23:30:00.000Z" })).toBe(
      "2026-11-09",
    );
    expect(eventWeekday({ date: "2026-11-08T23:30:00.000Z" })).toBe("Thứ hai");
    expect(eventWeekday({ date: "2026-11-08T09:00:00.000Z" })).toBe(
      "Chủ nhật",
    );
  });

  it("prefers the written time over the clock", () => {
    expect(eventTimeLabel({ date: "2026-11-08T09:00:00.000Z" })).toBe("16:00");
    expect(
      eventTimeLabel({
        date: "2026-11-09T01:00:00.000Z",
        timeLabel: "Buổi sáng",
      }),
    ).toBe("Buổi sáng");
  });
});
