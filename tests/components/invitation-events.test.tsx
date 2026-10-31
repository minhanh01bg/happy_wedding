import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, within } from "@testing-library/react";
import { InvitationEvents } from "@/components/wedding/invitation-events";
import { invitationDesign } from "@/lib/invitation-designs";
import {
  LAYOUTS,
  PALETTES,
  eventSchema,
  type WeddingEvent,
} from "@/lib/wedding";

/** Every composition a template can resolve to, including layout fallbacks. */
const DESIGNS = [
  ...new Set(
    LAYOUTS.flatMap((layout) =>
      PALETTES.map((palette) => invitationDesign({ layout, palette }).key),
    ),
  ),
];
const party: WeddingEvent = {
  title: "Tiệc cưới nhà trai",
  date: "2026-11-08T09:00:00.000Z", // 16:00 giờ Việt Nam
  venue: "Nhà hàng minh họa",
  address: "Địa chỉ minh họa",
};
const ceremony: WeddingEvent = {
  title: "Lễ thành hôn nhà trai",
  date: "2026-11-09T01:00:00.000Z", // 08:00 chỉ để xếp thứ tự và lấy ngày
  timeLabel: "Buổi sáng",
  venue: "Tư gia nhà trai",
  address: "Địa chỉ minh họa",
};
function cards(design: string, events: WeddingEvent[]) {
  const { container } = render(
    <InvitationEvents events={events} design={design} couple="A & B" />,
  );
  return [...container.querySelectorAll<HTMLElement>("[data-event-card]")];
}

describe("InvitationEvents written time", () => {
  it("covers all ten designs plus the layout fallbacks", () => {
    expect(DESIGNS).toEqual(
      expect.arrayContaining([
        "loi-yeu",
        "vuon-thuong",
        "song-hy",
        "ngay-chung-doi",
        "dem-sao",
        "nang-thu",
        "loi-hen",
        "thu-tinh",
        "khoanh-khac",
        "ben-nhau",
      ]),
    );
  });

  it.each(DESIGNS)(
    "%s shows the label instead of the clock time and keeps the date",
    (design) => {
      const [partyCard, ceremonyCard] = cards(design, [party, ceremony]);
      const time = within(ceremonyCard).getByText("Buổi sáng · 09/11/2026");
      expect(time.tagName).toBe("TIME");
      expect(time).toHaveAttribute("datetime", "2026-11-09");
      expect(ceremonyCard.textContent).not.toContain("08:00");
      expect(within(partyCard).getByText("16:00 · 08/11/2026")).toBeVisible();

      const calendar = new URL(
        within(ceremonyCard)
          .getByRole("link", { name: /Thêm tiệc này vào lịch/ })
          .getAttribute("href")!,
      );
      expect(calendar.searchParams.get("dates")).toBe("20261109/20261110");
      expect(calendar.searchParams.get("details")).toContain("Buổi sáng");
    },
  );

  it.each(DESIGNS)(
    "%s renders an event without a label as before",
    (design) => {
      const markup = renderToStaticMarkup(
        <InvitationEvents events={[party]} design={design} couple="A & B" />,
      );
      expect(markup).toContain(
        '<time dateTime="2026-11-08T09:00:00.000Z">16:00 · 08/11/2026</time>',
      );
      expect(markup).toContain("dates=20261108T090000Z%2F20261108T120000Z");
      // Old JSON, and an empty label saved from the editor, render identically.
      for (const event of [
        eventSchema.parse(JSON.parse(JSON.stringify(party))),
        eventSchema.parse({ ...party, timeLabel: "" }),
      ]) {
        expect(
          renderToStaticMarkup(
            <InvitationEvents
              events={[event]}
              design={design}
              couple="A & B"
            />,
          ),
        ).toBe(markup);
      }
    },
  );

  it("puts the label in the side time slots of song-hy, khoanh-khac and ben-nhau", () => {
    for (const design of ["song-hy", "khoanh-khac", "ben-nhau"]) {
      const [card] = cards(design, [ceremony]);
      expect(within(card).getByText("Buổi sáng")).toBeInTheDocument();
      const [plain] = cards(design, [party]);
      expect(within(plain).getByText("16:00")).toBeInTheDocument();
    }
  });
});
