import { describe, expect, it } from "vitest";
import {
  DEMO_CONTENT,
  eventSchema,
  invitationSchema,
  readEvents,
} from "@/lib/wedding";

const ceremony = {
  title: "Lễ thành hôn nhà trai",
  date: "2026-11-09T01:00:00.000Z",
  venue: "Tư gia nhà trai",
  address: "Địa chỉ minh họa",
};

describe("event timeLabel", () => {
  it("accepts and trims a written time", () => {
    const parsed = eventSchema.parse({
      ...ceremony,
      timeLabel: "  Buổi sáng  ",
    });
    expect(parsed.timeLabel).toBe("Buổi sáng");
    expect(parsed.date).toBe(ceremony.date);
  });

  it("accepts 40 characters and rejects 41 with a Vietnamese message", () => {
    expect(
      eventSchema.safeParse({ ...ceremony, timeLabel: "a".repeat(40) }).success,
    ).toBe(true);
    const result = eventSchema.safeParse({
      ...ceremony,
      timeLabel: "a".repeat(41),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["timeLabel"],
      message: "Giờ ghi bằng chữ tối đa 40 ký tự",
    });
  });

  it("treats an empty or blank label exactly like no label", () => {
    const none = eventSchema.parse(ceremony);
    for (const timeLabel of ["", "   "]) {
      const parsed = eventSchema.parse({ ...ceremony, timeLabel });
      expect(parsed.timeLabel).toBeUndefined();
      expect(JSON.stringify(parsed)).toBe(JSON.stringify(none));
    }
    expect(JSON.stringify(none)).toBe(JSON.stringify(ceremony));
  });

  it("still requires the date and rejects a non-string label", () => {
    expect(
      eventSchema.safeParse({
        title: ceremony.title,
        venue: ceremony.venue,
        address: ceremony.address,
        timeLabel: "Buổi sáng",
      }).success,
    ).toBe(false);
    expect(eventSchema.safeParse({ ...ceremony, timeLabel: 8 }).success).toBe(
      false,
    );
  });

  it("keeps old stored events unchanged and round-trips a label", () => {
    const old = JSON.stringify(DEMO_CONTENT.events);
    expect(JSON.stringify(readEvents(old))).toBe(old);
    const saved = invitationSchema.parse({
      ...DEMO_CONTENT,
      templateId: "template",
      slug: "loi-hen",
      events: [
        { ...DEMO_CONTENT.events[0], timeLabel: "" },
        { ...ceremony, timeLabel: " Buổi sáng " },
      ],
    }).events;
    expect(readEvents(JSON.stringify(saved))).toEqual([
      DEMO_CONTENT.events[0],
      { ...ceremony, timeLabel: "Buổi sáng" },
    ]);
    expect(JSON.stringify(saved[0])).toBe(
      JSON.stringify(DEMO_CONTENT.events[0]),
    );
  });
});
