import { expect, it } from "vitest";
import { weddingDateParts, weddingMonth } from "@/lib/wedding-date-calendar";

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
