import { describe, expect, it } from "vitest";
import {
  weddingDateParts,
  weddingEventDays,
  weddingMonth,
} from "@/lib/wedding-date-calendar";

it("uses the Vietnamese wedding day when UTC is still in the previous month", () => {
  const date = new Date("2028-02-29T17:30:00Z");
  expect(weddingDateParts(date)).toEqual({
    day: 1,
    month: 3,
    year: 2028,
    time: "00:30",
  });
  const calendar = weddingMonth(date);
  expect(calendar.rows[0]).toEqual([null, null, 1, 2, 3, 4, 5]);
});
it("includes leap day and places it under Tuesday for February 2028", () => {
  const calendar = weddingMonth(new Date("2028-02-29T04:00:00Z"));
  expect(calendar.day).toBe(29);
  expect(calendar.rows.at(-1)).toEqual([28, 29, null, null, null, null, null]);
  expect(calendar.rows.flat().filter((day) => day !== null)).toHaveLength(29);
});
it("lays out six calendar rows when a 31-day month starts on Sunday", () => {
  const calendar = weddingMonth(new Date("2026-03-01T04:00:00Z"));
  expect(calendar.rows).toHaveLength(6);
  expect(calendar.rows[0]).toEqual([null, null, null, null, null, null, 1]);
  expect(calendar.rows.at(-1)).toEqual([30, 31, null, null, null, null, null]);
});

describe("weddingEventDays", () => {
  const wedding = new Date("2026-11-09T08:00:00+07:00");
  it("keeps every day of the wedding month that holds an event", () => {
    const days = weddingEventDays(wedding, [
      { title: "Tiệc cưới nhà trai", date: "2026-11-08T16:00:00+07:00" },
      { title: "Lễ thành hôn nhà trai", date: "2026-11-09T08:00:00+07:00" },
    ]);
    expect([...days]).toEqual([
      [8, ["Tiệc cưới nhà trai"]],
      [9, ["Lễ thành hôn nhà trai"]],
    ]);
  });
  it("groups events of one day in entry order", () => {
    const days = weddingEventDays(wedding, [
      { title: "Lễ thành hôn", date: "2026-11-09T08:00:00+07:00" },
      { title: "Tiệc tối", date: "2026-11-09T18:00:00+07:00" },
    ]);
    expect([...days]).toEqual([[9, ["Lễ thành hôn", "Tiệc tối"]]]);
  });
  it("leaves out events in another month or year", () => {
    const days = weddingEventDays(wedding, [
      { title: "Lễ ăn hỏi", date: "2026-10-31T09:00:00+07:00" },
      { title: "Lại mặt", date: "2027-11-09T09:00:00+07:00" },
    ]);
    expect(days.size).toBe(0);
  });
  it("reads the day in Vietnam time, not UTC", () => {
    const days = weddingEventDays(wedding, [
      // 16:30 UTC is still 23:30 on the 8th in Vietnam.
      { title: "Tiệc khuya", date: "2026-11-08T23:30:00+07:00" },
      // 17:30 UTC on 31/10 is already 00:30 on 1/11 in Vietnam.
      { title: "Đón dâu", date: new Date("2026-10-31T17:30:00Z") },
    ]);
    expect([...days.keys()]).toEqual([8, 1]);
  });
});
