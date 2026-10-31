import { expect, it } from "vitest";
import { weddingCalendarUrl } from "@/lib/wedding-calendar";
it("preserves the event instant and Vietnamese details without changing the party date", () => {
  const url = new URL(
    weddingCalendarUrl(
      "2027-02-13T11:00:00+07:00",
      "Tiệc nhà gái & gia đình",
      "Tư gia, Bắc Ninh",
    ),
  );
  expect(url.origin).toBe("https://calendar.google.com");
  expect(url.searchParams.get("dates")).toBe(
    "20270213T040000Z/20270213T070000Z",
  );
  expect(url.searchParams.get("text")).toBe("Tiệc nhà gái & gia đình");
  expect(url.searchParams.get("location")).toBe("Tư gia, Bắc Ninh");
  expect(url.searchParams.get("details")).toContain("tạm tính");
  expect(url.searchParams.has("guest")).toBe(false);
});
it("adds a labelled event as an all-day Vietnamese date, never a clock time", () => {
  // 00:30 ngày 09/11 giờ Việt Nam vẫn là 08/11 theo UTC.
  const url = new URL(
    weddingCalendarUrl(
      "2026-11-08T17:30:00.000Z",
      "Lễ thành hôn nhà trai",
      "Tư gia nhà trai",
      "Buổi sáng",
    ),
  );
  expect(url.searchParams.get("dates")).toBe("20261109/20261110");
  expect(url.searchParams.get("details")).toContain("Thời gian: Buổi sáng");
  expect(url.searchParams.get("details")).not.toContain("tạm tính sau 3 giờ");
  expect(url.searchParams.get("location")).toBe("Tư gia nhà trai");
});
it("rolls an all-day range over the end of the month and year", () => {
  const url = new URL(
    weddingCalendarUrl("2026-12-31T02:00:00.000Z", "Tiệc", "", "Buổi trưa"),
  );
  expect(url.searchParams.get("dates")).toBe("20261231/20270101");
});
