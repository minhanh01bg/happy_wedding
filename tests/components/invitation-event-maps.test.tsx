import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { render, within } from "@testing-library/react";
import { InvitationEvents } from "@/components/wedding/invitation-events";
import { invitationDesign } from "@/lib/invitation-designs";
import { LAYOUTS, PALETTES, type WeddingEvent } from "@/lib/wedding";

const DESIGNS = [
  ...new Set(
    LAYOUTS.flatMap((layout) =>
      PALETTES.map((palette) => invitationDesign({ layout, palette }).key),
    ),
  ),
];
/** The ten catalog compositions; the rest are layout-name fallbacks. */
const CATALOG = DESIGNS.filter((design) => !LAYOUTS.includes(design as never));

/* Dữ liệu giả, cùng dạng link Google Maps thật. */
const GROOM_SHORT = "https://maps.app.goo.gl/TestGroom123";
const BRIDE_PIN =
  "https://maps.google.com/?q=10.7769,106.7009&entry=gps&g_st=ic";
const groomParty: WeddingEvent = {
  title: "Tiệc cưới nhà trai",
  date: "2026-11-08T09:00:00.000Z",
  venue: "Nhà hàng Minh Họa",
  address: "Số 1 đường Minh Họa, Hà Nội — địa chỉ minh họa",
  mapUrl: GROOM_SHORT,
  lat: 21.0285,
  lng: 105.8542,
};
const groomCeremony: WeddingEvent = {
  ...groomParty,
  title: "Lễ thành hôn nhà trai",
  date: "2026-11-09T01:00:00.000Z",
  timeLabel: "Buổi sáng",
};
const brideParty: WeddingEvent = {
  title: "Tiệc cưới nhà gái",
  date: "2026-11-07T09:00:00.000Z",
  venue: "Tư gia nhà gái",
  address: "Địa chỉ minh họa",
  mapUrl: BRIDE_PIN,
};

function renderEvents(events: WeddingEvent[], design = "loi-yeu") {
  const { container } = render(
    <InvitationEvents events={events} design={design} couple="A & B" />,
  );
  const block = container.querySelector<HTMLElement>("[data-event-maps]")!;
  return {
    container,
    block,
    maps: [...block.querySelectorAll<HTMLElement>("[data-event-map]")],
    frames: [...block.querySelectorAll("iframe")],
  };
}

describe("Đường đến tiệc", () => {
  it("draws one map for two parties at the same place", () => {
    const { block, maps, frames } = renderEvents([groomParty, groomCeremony]);
    expect(within(block).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Đường đến tiệc",
    );
    expect(maps).toHaveLength(1);
    expect(frames).toHaveLength(1);
    const [frame] = frames;
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(frame).toHaveAttribute("loading", "lazy");
    expect(frame).not.toHaveAttribute("allowfullscreen");
    expect(frame).not.toHaveAttribute("allow");
    expect(frame).toHaveAttribute(
      "src",
      "https://maps.google.com/maps?q=21.0285,105.8542&z=16&hl=vi&output=embed",
    );
    expect(frame).toHaveAttribute(
      "title",
      "Bản đồ đường đến Nhà hàng Minh Họa (nhà trai)",
    );
    const caption = within(maps[0]);
    expect(caption.getByText("Nhà trai")).toBeInTheDocument();
    expect(caption.getByText("Nhà hàng Minh Họa")).toBeInTheDocument();
    expect(
      caption.getByText("Số 1 đường Minh Họa, Hà Nội — địa chỉ minh họa"),
    ).toBeInTheDocument();
    expect(
      caption.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "Tiệc cưới nhà trai: 16:00 · 08/11/2026",
      "Lễ thành hôn nhà trai: Buổi sáng · 09/11/2026",
    ]);
  });

  it("draws a labelled map for each side when the families are apart", () => {
    const { maps, frames } = renderEvents([
      brideParty,
      groomParty,
      groomCeremony,
    ]);
    expect(maps).toHaveLength(2);
    expect(
      maps.map((map) => [
        map.querySelector("figcaption span")?.textContent,
        map.querySelector("figcaption strong")?.textContent,
        within(map).getAllByRole("listitem").length,
      ]),
    ).toEqual([
      ["Nhà gái", "Tư gia nhà gái", 1],
      ["Nhà trai", "Nhà hàng Minh Họa", 2],
    ]);
    expect(frames.map((frame) => frame.getAttribute("src"))).toEqual([
      "https://maps.google.com/maps?q=10.7769,106.7009&z=16&hl=vi&output=embed",
      "https://maps.google.com/maps?q=21.0285,105.8542&z=16&hl=vi&output=embed",
    ]);
    expect(frames.map((frame) => frame.getAttribute("title"))).toEqual([
      "Bản đồ đường đến Tư gia nhà gái (nhà gái)",
      "Bản đồ đường đến Nhà hàng Minh Họa (nhà trai)",
    ]);
    for (const frame of frames) {
      expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    }
  });

  it("searches the venue text when there is no pin (the demo invitation)", () => {
    const { frames } = renderEvents([
      {
        title: "Tiệc cưới",
        date: "2027-02-14T04:00:00.000Z",
        venue: "Nhà hàng The Garden",
        address: "Hà Nội — địa điểm minh họa",
      },
    ]);
    const src = new URL(frames[0].getAttribute("src")!);
    expect(src.searchParams.get("q")).toBe(
      "Nhà hàng The Garden, Hà Nội — địa điểm minh họa",
    );
    expect(src.searchParams.get("output")).toBe("embed");
  });

  it.each(DESIGNS)(
    "%s keeps directions on the saved link and renders the map block",
    (design) => {
      const { container, frames } = renderEvents(
        [groomParty, { ...brideParty, mapUrl: undefined }],
        design,
      );
      const links = [...container.querySelectorAll("[data-event-card]")].map(
        (card) =>
          within(card as HTMLElement).getByRole("link", {
            name: /Chỉ đường đến tiệc/,
          }),
      );
      expect(links[0]).toHaveAttribute("href", GROOM_SHORT);
      expect(new URL(links[1].getAttribute("href")!).hostname).toBe(
        "www.google.com",
      );
      for (const link of links) {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
      expect(frames).toHaveLength(2);
    },
  );
});

describe("Đường đến tiệc styles", () => {
  const css = readFileSync(
    path.resolve(
      __dirname,
      "../../src/components/wedding/invitation-events.module.css",
    ),
    "utf8",
  );
  const rule = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
  };

  it("gives every map a rounded frame with a fixed aspect ratio", () => {
    expect(rule("\n.mapFrame")).toMatch(/aspect-ratio: 4 \/ 3/);
    expect(rule("\n.mapFrame")).toMatch(/border-radius: \d+px/);
    expect(rule("\n.mapFrame iframe")).toMatch(/border-radius: \d+px/);
    expect(rule('.maps[data-count="1"] .mapFrame')).toMatch(/aspect-ratio/);
  });

  it.each(CATALOG)("dresses the map frame for %s", (design) => {
    expect(rule(`.${design} .mapFrame`)).not.toBe("");
    expect(rule(`.${design} .mapFrame iframe`)).toMatch(/border-radius: \d+px/);
  });

  it("does not animate the map block", () => {
    const block = css.slice(css.indexOf("Đường đến tiệc"));
    expect(block).not.toMatch(/animation|transition/);
  });
});
