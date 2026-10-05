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
