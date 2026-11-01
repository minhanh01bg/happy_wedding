import { readFileSync } from "node:fs";
import path from "node:path";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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
const BRIDE_SHORT = "https://maps.app.goo.gl/TestBride456";
const GROOM_EMBED =
  "https://maps.google.com/maps?q=21.0285,105.8542&z=16&hl=vi&output=embed";
const BRIDE_EMBED =
  "https://maps.google.com/maps?q=10.7769,106.7009&z=16&hl=vi&output=embed";

const groomParty: WeddingEvent = {
  title: "Tiệc cưới nhà trai",
  side: "groom",
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
  side: "bride",
  date: "2026-11-08T05:00:00.000Z",
  venue: "Tư gia Minh Họa",
  address: "Số 2 đường Minh Họa, TP.HCM — địa chỉ minh họa",
  mapUrl: BRIDE_SHORT,
  lat: 10.7769,
  lng: 106.7009,
};
const brideCeremony: WeddingEvent = {
  ...brideParty,
  title: "Lễ vu quy nhà gái",
  date: "2026-11-09T00:00:00.000Z",
};
/** Hai bên, mỗi bên hai tiệc ở cùng một nơi — đúng dáng thiệp cần gộp. */
const FOUR_AT_TWO = [groomParty, groomCeremony, brideParty, brideCeremony];

function renderEvents(events: WeddingEvent[], design = "loi-yeu") {
  const { container } = render(
    <InvitationEvents events={events} design={design} couple="A & B" />,
  );
  const section = container.querySelector<HTMLElement>("#lich-tiec")!;
  return {
    section,
    cards: [...section.querySelectorAll<HTMLElement>("[data-event-card]")],
    frames: [...section.querySelectorAll("iframe")],
  };
}

describe("Lịch tiệc theo địa điểm", () => {
  it("shows four parties at two places as two cards, each with its own map", () => {
    const { section, cards, frames } = renderEvents(FOUR_AT_TWO);
    expect(cards).toHaveLength(2);
    expect(frames).toHaveLength(2);
    expect(
      within(section).getAllByRole("link", { name: /^Thêm vào lịch/ }),
    ).toHaveLength(4);
    expect(
      within(section).getAllByRole("link", { name: "Chỉ đường đến tiệc" }),
    ).toHaveLength(2);
    // Không còn khối "Đường đến tiệc" riêng dưới các thẻ.
    expect(section.querySelector("[data-event-maps]")).toBeNull();
    expect(section).not.toHaveTextContent("Đường đến tiệc");

    expect(
      cards.map((card) => [
        card.querySelector("p.eyebrow")?.textContent,
        within(card).getByRole("heading", { level: 3 }).textContent,
        card.querySelectorAll("[data-event-row]").length,
      ]),
    ).toEqual([
      ["01 / LỊCH TIỆC", "Nhà traiNhà hàng Minh Họa", 2],
      ["02 / LỊCH TIỆC", "Nhà gáiTư gia Minh Họa", 2],
    ]);
    cards.forEach((card, index) => {
      expect(card).toContainElement(frames[index]);
      expect(card).toHaveAttribute("data-event-count", "2");
    });
    expect(frames.map((frame) => frame.getAttribute("src"))).toEqual([
      GROOM_EMBED,
      BRIDE_EMBED,
    ]);
    expect(frames.map((frame) => frame.getAttribute("title"))).toEqual([
      "Bản đồ đường đến Nhà hàng Minh Họa (nhà trai)",
      "Bản đồ đường đến Tư gia Minh Họa (nhà gái)",
    ]);
    for (const frame of frames) {
      expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
      expect(frame).toHaveAttribute("loading", "lazy");
      expect(frame).not.toHaveAttribute("allowfullscreen");
      expect(frame).not.toHaveAttribute("allow");
    }
  });

  it("lists each party on a thin row: day, time, title and a quiet calendar link", () => {
    const { cards } = renderEvents(FOUR_AT_TWO);
    const rows = [...cards[0].querySelectorAll<HTMLElement>("[data-event-row]")];
    expect(
      rows.map((row) => [
        row.querySelector("time")?.textContent,
        row.querySelector("time")?.getAttribute("datetime"),
        within(row).getByRole("heading", { level: 4 }).textContent,
      ]),
    ).toEqual([
      [
        "Chủ nhật · 08/11/2026 · 16:00",
        "2026-11-08T09:00:00.000Z",
        "Tiệc cưới nhà trai",
      ],
      [
        "Thứ hai · 09/11/2026 · Buổi sáng",
        "2026-11-09",
        "Lễ thành hôn nhà trai",
      ],
    ]);
    const add = within(rows[1]).getByRole("link", {
      name: "Thêm vào lịch: Lễ thành hôn nhà trai",
    });
    expect(add).toHaveAttribute("target", "_blank");
    expect(add).toHaveAttribute("rel", "noopener noreferrer");
    const entry = new URL(add.getAttribute("href")!);
    // Giờ ghi bằng chữ → sự kiện cả ngày, như nút cũ.
    expect(entry.searchParams.get("dates")).toBe("20261109/20261110");
    expect(entry.searchParams.get("text")).toBe("Lễ thành hôn nhà trai — A & B");
    expect(entry.searchParams.get("location")).toBe(
      "Nhà hàng Minh Họa, Số 1 đường Minh Họa, Hà Nội — địa chỉ minh họa",
    );
    // Không có hộp con trong thẻ: địa điểm và địa chỉ chỉ hiện một lần.
    expect(within(cards[0]).getAllByText("Nhà hàng Minh Họa")).toHaveLength(1);
    expect(
      within(cards[0]).getAllByText(
        "Số 1 đường Minh Họa, Hà Nội — địa chỉ minh họa",
      ),
    ).toHaveLength(1);
    // Ngày lớn bỏ ở thẻ nhiều tiệc: lịch tháng phía trên đã khoanh ngày.
    expect(cards[0].textContent).not.toMatch(/11 \/ 2026/);
  });

  it("puts map, address, then directions in that order inside the card", () => {
    const { cards } = renderEvents(FOUR_AT_TWO);
    const card = cards[1];
    const parts = [
      card.querySelector("ul"),
      card.querySelector("[data-event-map]"),
      within(card).getByText("Số 2 đường Minh Họa, TP.HCM — địa chỉ minh họa"),
      within(card).getByRole("link", { name: "Chỉ đường đến tiệc" }),
    ];
    for (let i = 1; i < parts.length; i++) {
      expect(
        parts[i - 1]!.compareDocumentPosition(parts[i]!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(
      within(card).getByRole("link", { name: "Chỉ đường đến tiệc" }),
    ).toHaveAttribute("href", BRIDE_SHORT);
  });

  it("keeps one card per party when every party has its own place", () => {
    const elsewhere: WeddingEvent = {
      title: "Tiệc báo hỷ",
      date: "2026-11-15T05:00:00.000Z",
      venue: "Trung tâm tiệc cưới Minh Họa",
      address: "Địa chỉ minh họa",
    };
    const { cards, frames } = renderEvents([groomParty, brideParty, elsewhere]);
    expect(cards).toHaveLength(3);
    expect(frames).toHaveLength(3);
    cards.forEach((card, index) => {
      expect(card).toHaveAttribute("data-event-count", "1");
      expect(card).toContainElement(frames[index]);
      expect(card.querySelector("p.eyebrow")).toHaveTextContent(
        `0${index + 1} / LỊCH TIỆC`,
      );
      // Thẻ một tiệc giữ nút cũ.
      expect(
        within(card).getByRole("link", { name: "Thêm tiệc này vào lịch" }),
      ).toBeInTheDocument();
    });
    expect(
      cards.map(
        (card) => within(card).getByRole("heading", { level: 3 }).textContent,
      ),
    ).toEqual(["Tiệc cưới nhà trai", "Tiệc cưới nhà gái", "Tiệc báo hỷ"]);
    // Không có ghim: bản đồ tìm theo tên + địa chỉ.
    const src = new URL(frames[2].getAttribute("src")!);
    expect(src.searchParams.get("q")).toBe(
      "Trung tâm tiệc cưới Minh Họa, Địa chỉ minh họa",
    );
    expect(src.searchParams.get("output")).toBe("embed");
  });

  it("keeps the rows in the saved event order (RSVP eventIndex)", () => {
    const { cards } = renderEvents([
      groomParty,
      brideParty,
      groomCeremony,
      brideCeremony,
    ]);
    expect(
      cards.map((card) =>
        [...card.querySelectorAll("[data-event-row] h4")].map(
          (title) => title.textContent,
        ),
      ),
    ).toEqual([
      ["Tiệc cưới nhà trai", "Lễ thành hôn nhà trai"],
      ["Tiệc cưới nhà gái", "Lễ vu quy nhà gái"],
    ]);
  });

  it.each(DESIGNS)(
    "%s renders one card per place with its map and directions inside",
    (design) => {
      const { cards, frames } = renderEvents(
        [...FOUR_AT_TWO, { ...brideParty, venue: "Nhà hàng khác", mapUrl: "" }],
        design,
      );
      expect(cards).toHaveLength(3);
      expect(frames).toHaveLength(3);
      const links = cards.map((card) =>
        within(card).getByRole("link", { name: /Chỉ đường đến tiệc/ }),
      );
      expect(links[0]).toHaveAttribute("href", GROOM_SHORT);
      expect(links[1]).toHaveAttribute("href", BRIDE_SHORT);
      expect(new URL(links[2].getAttribute("href")!).hostname).toBe(
        "www.google.com",
      );
      cards.forEach((card, index) => {
        expect(card).toContainElement(frames[index]);
        expect(links[index]).toHaveAttribute("target", "_blank");
        expect(links[index]).toHaveAttribute("rel", "noopener noreferrer");
      });
      expect(cards[0]).toHaveTextContent("Nhà trai");
      expect(cards[1]).toHaveTextContent("Nhà gái");
    },
  );
});

describe("Lịch tiệc theo địa điểm: hydrate", () => {
  it("hydrates quietly when the phone's browser tags each map iframe first", async () => {
    const view = (
      <InvitationEvents events={FOUR_AT_TWO} design="loi-yeu" couple="A & B" />
    );
    const root = document.createElement("div");
    root.innerHTML = renderToString(view);
    document.body.append(root);
    // Chrome trên iPhone ghi token khung con của nó lên mọi iframe trước khi
    // React hydrate; thuộc tính đó không có trong props của trang.
    for (const frame of root.querySelectorAll("iframe")) {
      frame.setAttribute("__gcrchildframeremotetoken", "0123456789abcdef");
    }
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const hydrated = await act(async () => hydrateRoot(root, view));
      expect(error.mock.calls.flat().join("\n")).not.toMatch(
        /didn't match the client/,
      );
      await act(async () => hydrated.unmount());
    } finally {
      error.mockRestore();
      root.remove();
    }
  });
});

describe("Lịch tiệc theo địa điểm: styles", () => {
  const css = readFileSync(
    path.resolve(
      __dirname,
      "../../src/components/wedding/invitation-events.module.css",
    ),
    "utf8",
  );
  /** Every rule whose selector list ends with `selector`, joined. */
  const rules = (selector: string) => {
    const found: string[] = [];
    let start = css.indexOf(`${selector} {`);
    while (start >= 0) {
      found.push(css.slice(start, css.indexOf("}", start)));
      start = css.indexOf(`${selector} {`, start + 1);
    }
    return found.join("\n");
  };
  const section = (from: string, to?: string) =>
    css.slice(css.indexOf(from), to ? css.indexOf(to) : undefined);

  it("gives every map a fixed shape at least 220px tall", () => {
    expect(rules("\n.mapFrame")).toMatch(/aspect-ratio: 4 \/ 3/);
    expect(rules("\n.mapFrame")).toMatch(/min-height: 220px/);
    expect(rules("\n.mapFrame")).toMatch(/border-radius: \d+px/);
    expect(rules("\n.mapFrame iframe")).toMatch(/border-radius: inherit/);
    expect(rules("\n.mapFrame iframe")).toMatch(/width: 100%/);
  });

  it.each(CATALOG)("dresses the map frame for %s", (design) => {
    expect(rules(`.${design} .mapFrame`)).toMatch(/border-radius: \d+px/);
  });

  it("draws no box inside a place card", () => {
    const inside = section("Thẻ địa điểm");
    expect(inside).not.toMatch(/box-shadow/);
    expect(rules("\n.mapFrame")).not.toMatch(/border:|box-shadow/);
    expect(rules("\n.agenda > li")).not.toMatch(/background|border:/);
  });

  it("keeps the rows' calendar link a 44px target", () => {
    expect(rules(".events .agenda a")).toMatch(/min-height: 44px/);
  });

  it("stacks the cards on phones and pairs them on wide screens", () => {
    expect(rules("\n.grid")).toMatch(
      /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(css).toMatch(
      /@media \(max-width: 760px\) \{\s*\.grid \{\s*grid-template-columns: 1fr;/,
    );
  });

  it("does not animate the place card or its map", () => {
    expect(section("Thẻ địa điểm", "Bản đồ trong thẻ")).not.toMatch(
      /animation|transition/,
    );
    expect(section("Bản đồ trong thẻ")).not.toMatch(/animation|transition/);
  });
});
