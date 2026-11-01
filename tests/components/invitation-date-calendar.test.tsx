import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render } from "@testing-library/react";
import { InvitationDateCalendar } from "@/components/wedding/invitation-events";

// Thiệp thật: ngày cưới chính 09/11/2026 08:00 giờ Việt Nam.
const wedding = new Date("2026-11-09T08:00:00+07:00");
const party = {
  title: "Tiệc cưới nhà trai",
  date: "2026-11-08T16:00:00+07:00",
};
const ceremony = {
  title: "Lễ thành hôn nhà trai",
  date: "2026-11-09T08:00:00+07:00",
};

function calendar(events?: { title: string; date: string }[]) {
  const { container } = render(
    <InvitationDateCalendar date={wedding} events={events} />,
  );
  const circled = [
    ...container.querySelectorAll<HTMLElement>(
      "[data-wedding-day], [data-event-day]",
    ),
  ];
  return {
    eyebrow: container.querySelector(".eyebrow")!.textContent,
    circled: circled.map((day) => ({
      day: day.textContent,
      wedding: day.dataset.weddingDay,
      event: day.dataset.eventDay,
      label: day.getAttribute("aria-label"),
      ring: !!day.querySelector("svg[data-ring] path"),
      heart: !!day.querySelector("svg:not([data-ring])"),
    })),
  };
}

describe("InvitationDateCalendar", () => {
  it("circles both the 8th and the 9th, each with its event name", () => {
    expect(calendar([party, ceremony])).toEqual({
      eyebrow: "KHOANH TRÒN NHỮNG NGÀY ĐẶC BIỆT",
      circled: [
        {
          day: "8",
          wedding: undefined,
          event: "8",
          label: "Tiệc cưới nhà trai: 8/11/2026",
          ring: true,
          heart: true,
        },
        {
          day: "9",
          wedding: "9",
          event: undefined,
          label: "Lễ thành hôn nhà trai: 9/11/2026",
          ring: true,
          heart: true,
        },
      ],
    });
  });

  it("draws the other event day with its own hand-drawn ring", () => {
    const { container } = render(
      <InvitationDateCalendar date={wedding} events={[party, ceremony]} />,
    );
    const ring = (selector: string) =>
      container.querySelector(`${selector} svg[data-ring] path`)!;
    expect(ring("[data-event-day]").getAttribute("d")).not.toBe(
      ring("[data-wedding-day]").getAttribute("d"),
    );
  });

  it("renders one circled day, as before, when every event is on the wedding day", () => {
    const before = renderToStaticMarkup(
      <InvitationDateCalendar date={wedding} />,
    );
    expect(before).toContain('aria-label="Ngày cưới: 9/11/2026"');
    expect(before).toContain("KHOANH TRÒN MỘT NGÀY ĐẶC BIỆT");
    expect(
      renderToStaticMarkup(
        <InvitationDateCalendar date={wedding} events={[]} />,
      ),
    ).toBe(before);

    const same = calendar([ceremony]);
    expect(same.eyebrow).toBe("KHOANH TRÒN MỘT NGÀY ĐẶC BIỆT");
    expect(same.circled).toHaveLength(1);
    expect(same.circled[0]).toMatchObject({
      wedding: "9",
      label: "Lễ thành hôn nhà trai: 9/11/2026",
    });
    // Only the spoken label names the event; the drawing is unchanged.
    expect(
      renderToStaticMarkup(
        <InvitationDateCalendar date={wedding} events={[ceremony]} />,
      ),
    ).toBe(
      before.replace(
        'aria-label="Ngày cưới: 9/11/2026"',
        'aria-label="Lễ thành hôn nhà trai: 9/11/2026"',
      ),
    );
  });

  it("joins the names of several events on one day", () => {
    const { circled } = calendar([
      ceremony,
      { title: "Tiệc tối", date: "2026-11-09T18:00:00+07:00" },
      { title: "Tiệc trưa", date: "2026-11-09T11:00:00+07:00" },
    ]);
    expect(circled.map((day) => day.label)).toEqual([
      "Lễ thành hôn nhà trai, Tiệc tối và Tiệc trưa: 9/11/2026",
    ]);
  });

  it("does not circle an event in another month", () => {
    const { eyebrow, circled } = calendar([
      { title: "Lễ ăn hỏi", date: "2026-10-31T09:00:00+07:00" },
      ceremony,
    ]);
    expect(eyebrow).toBe("KHOANH TRÒN MỘT NGÀY ĐẶC BIỆT");
    expect(circled.map((day) => day.day)).toEqual(["9"]);
  });

  it("circles the 8th for an event at 23:30 on the 8th, Vietnam time", () => {
    const { circled } = calendar([
      { title: "Tiệc khuya", date: "2026-11-08T23:30:00+07:00" },
      ceremony,
    ]);
    expect(circled.map((day) => [day.day, day.label])).toEqual([
      ["8", "Tiệc khuya: 8/11/2026"],
      ["9", "Lễ thành hôn nhà trai: 9/11/2026"],
    ]);
  });
});
