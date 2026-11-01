import { describe, expect, it } from "vitest";
import {
  directionsUrl,
  eventCoordinates,
  groupEventVenues,
  isGoogleMapsUrl,
  mapEmbedUrl,
  parseMapCoordinates,
  withMapUrl,
} from "@/lib/event-map";
import {
  DEMO_CONTENT,
  eventSchema,
  invitationSchema,
  readEvents,
} from "@/lib/wedding";

/*
 * Dữ liệu giả, cùng dạng link Google Maps thật. Nhà trai: link rút gọn, và
 * link địa điểm nó chuyển tới, có ghim `!3d!4d` khác tâm khung nhìn `@`.
 */
const GROOM_SHORT = "https://maps.app.goo.gl/TestGroom123";
const GROOM_PLACE =
  "https://www.google.com/maps/place/Nh%C3%A0+h%C3%A0ng+Minh+H%E1%BB%8Da/@21.0301,105.8467,15z/data=!4m7!3m6!1s0x3135ab0000000001:0x00000000000000aa!8m2!3d21.0285!4d105.8542!15s…!16s%2Fg%2F11test00000?entry=tts&…";
/** Link nhà gái: ghim GPS, không tên địa điểm, path `/`, tọa độ ở `q=`. */
const BRIDE_SHORT = "https://maps.app.goo.gl/TestBride456?g_st=ic";
const BRIDE_PIN =
  "https://maps.google.com/?q=10.7769,106.7009&entry=gps&g_st=ic";

const GROOM_POINT = { lat: 21.0285, lng: 105.8542 };
const GROOM_VIEWPORT = { lat: 21.0301, lng: 105.8467 };
const BRIDE_POINT = { lat: 10.7769, lng: 106.7009 };

const party = {
  title: "Tiệc cưới nhà trai",
  date: "2026-11-08T09:00:00.000Z",
  venue: "Nhà hàng Minh Họa",
  address: "Số 1 đường Minh Họa, Hà Nội — địa chỉ minh họa",
};

describe("Google Maps link in the event schema", () => {
  it.each([
    GROOM_SHORT,
    GROOM_PLACE,
    BRIDE_SHORT,
    BRIDE_PIN,
    "https://goo.gl/maps/abc123",
    "https://google.com/maps?q=21.03,105.85",
    "https://www.google.com/maps/search/?api=1&query=Nh%C3%A0+h%C3%A0ng",
    "https://maps.google.com/maps?q=21.03,105.85",
  ])("accepts %s", (mapUrl) => {
    expect(isGoogleMapsUrl(mapUrl)).toBe(true);
    expect(eventSchema.parse({ ...party, mapUrl }).mapUrl).toBe(mapUrl);
  });

  it.each([
    "http://maps.app.goo.gl/TestGroom123",
    "http://www.google.com/maps/place/x",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://evil.example/maps/place/x",
    "https://www.google.com.evil.example/maps",
    "https://maps.app.goo.gl.evil.example/abc",
    "https://user:pass@www.google.com/maps",
    "https://www.google.com:8443/maps",
    "https://goo.gl/abc123",
    "https://www.google.com/search?q=maps",
    "https://www.google.com/mapsx",
    "https://maps.app.goo.gl/",
    "maps.app.goo.gl/TestGroom123",
  ])("rejects %s with a Vietnamese message", (mapUrl) => {
    expect(isGoogleMapsUrl(mapUrl)).toBe(false);
    const result = eventSchema.safeParse({ ...party, mapUrl });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["mapUrl"],
      message: "Link bản đồ phải là link Google Maps bắt đầu bằng https://",
    });
  });

  it("trims the link, drops an empty one and caps its length", () => {
    expect(
      eventSchema.parse({ ...party, mapUrl: `  ${GROOM_SHORT} ` }).mapUrl,
    ).toBe(GROOM_SHORT);
    for (const mapUrl of ["", "   "]) {
      const parsed = eventSchema.parse({ ...party, mapUrl });
      expect(JSON.stringify(parsed)).toBe(JSON.stringify(party));
    }
    const long = `https://www.google.com/maps/place/${"a".repeat(2000)}`;
    expect(eventSchema.safeParse({ ...party, mapUrl: long }).success).toBe(
      false,
    );
  });

  it("accepts a pin inside Vietnam only, and only as a pair", () => {
    expect(eventSchema.parse({ ...party, ...GROOM_POINT })).toMatchObject(
      GROOM_POINT,
    );
    for (const point of [
      { lat: 48.8566, lng: 2.3522 },
      { lat: 21.03, lng: 2.35 },
      { lat: 5, lng: 106.2 },
    ]) {
      const result = eventSchema.safeParse({ ...party, ...point });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "Vị trí bản đồ phải nằm trong Việt Nam",
      );
    }
    expect(
      eventSchema.safeParse({ ...party, lat: "21.03", lng: "105.85" }).success,
    ).toBe(false);
    const invitation = {
      ...DEMO_CONTENT,
      templateId: "template",
      slug: "vu-tu",
    };
    const half = invitationSchema.safeParse({
      ...invitation,
      events: [{ ...party, lat: GROOM_POINT.lat }],
    });
    expect(half.success).toBe(false);
    expect(half.error?.issues[0].message).toBe(
      "Vị trí bản đồ cần đủ cả vĩ độ và kinh độ",
    );
    const saved = invitationSchema.parse({
      ...invitation,
      events: [{ ...party, mapUrl: GROOM_SHORT, ...GROOM_POINT }],
    }).events;
    expect(readEvents(JSON.stringify(saved))).toEqual([
      { ...party, mapUrl: GROOM_SHORT, ...GROOM_POINT },
    ]);
  });
});

describe("parseMapCoordinates", () => {
  it("reads the place pin (!3d!4d) of the groom's link, not the @ viewport", () => {
    expect(parseMapCoordinates(GROOM_PLACE)).toEqual(GROOM_POINT);
  });

  it("reads q=lat,lng from the bride's GPS pin on maps.google.com/", () => {
    expect(new URL(BRIDE_PIN).pathname).toBe("/");
    expect(parseMapCoordinates(BRIDE_PIN)).toEqual(BRIDE_POINT);
  });

  it("falls back to query= and then to the @ viewport", () => {
    expect(
      parseMapCoordinates(
        "https://www.google.com/maps/search/?api=1&query=21.0285%2C105.8542",
      ),
    ).toEqual(GROOM_POINT);
    expect(
      parseMapCoordinates("https://www.google.com/maps/@21.0301,105.8467,15z"),
    ).toEqual(GROOM_VIEWPORT);
  });

  it("returns null for short links, text queries, other hosts and pins abroad", () => {
    for (const url of [
      GROOM_SHORT,
      BRIDE_SHORT,
      undefined,
      "",
      "https://maps.google.com/?q=Nh%C3%A0+h%C3%A0ng",
      "https://example.com/maps/@21.03,105.85,15z",
      "http://maps.google.com/?q=21.03,105.85",
      "https://www.google.com/maps/place/x/data=!3d48.8566!4d2.3522",
      "https://maps.google.com/?q=48.8566,2.3522",
    ]) {
      expect(parseMapCoordinates(url)).toBeNull();
    }
  });
});

describe("event coordinates and links", () => {
  it("prefers the saved pin, then the link, then nothing", () => {
    expect(
      eventCoordinates({ ...party, mapUrl: GROOM_SHORT, ...GROOM_POINT }),
    ).toEqual(GROOM_POINT);
    expect(
      eventCoordinates({ ...party, mapUrl: BRIDE_PIN, ...GROOM_POINT }),
    ).toEqual(GROOM_POINT);
    expect(eventCoordinates({ ...party, mapUrl: BRIDE_PIN })).toEqual(
      BRIDE_POINT,
    );
    expect(eventCoordinates({ ...party, mapUrl: GROOM_SHORT })).toBeNull();
    expect(eventCoordinates({ ...party, lat: 21.03 })).toBeNull();
  });

  it("re-reads the pin whenever the editor changes the link", () => {
    expect(withMapUrl(party, GROOM_PLACE)).toEqual({
      ...party,
      mapUrl: GROOM_PLACE,
      ...GROOM_POINT,
    });
    const stale = { ...party, mapUrl: GROOM_PLACE, ...GROOM_POINT };
    expect(withMapUrl(stale, BRIDE_SHORT)).toMatchObject({
      mapUrl: BRIDE_SHORT,
      lat: undefined,
      lng: undefined,
    });
    expect(withMapUrl(stale, "")).toMatchObject({
      mapUrl: "",
      lat: undefined,
      lng: undefined,
    });
  });

  it("builds the key-less embed URL from a pin or from the venue text", () => {
    expect(mapEmbedUrl(GROOM_POINT)).toBe(
      "https://maps.google.com/maps?q=21.0285,105.8542&z=16&hl=vi&output=embed",
    );
    const byText = new URL(mapEmbedUrl(`${party.venue}, ${party.address}`));
    expect(byText.origin + byText.pathname).toBe(
      "https://maps.google.com/maps",
    );
    expect(Object.fromEntries(byText.searchParams)).toEqual({
      q: "Nhà hàng Minh Họa, Số 1 đường Minh Họa, Hà Nội — địa chỉ minh họa",
      z: "16",
      hl: "vi",
      output: "embed",
    });
    // The text cannot add parameters of its own.
    expect(
      new URL(mapEmbedUrl("A & B #1 &output=x")).searchParams.get("output"),
    ).toBe("embed");
  });

  it("sends directions to the saved link, else to a search for the venue", () => {
    expect(directionsUrl({ ...party, mapUrl: GROOM_SHORT })).toBe(GROOM_SHORT);
    const search = new URL(directionsUrl(party));
    expect(search.origin + search.pathname).toBe(
      "https://www.google.com/maps/search/",
    );
    expect(search.searchParams.get("query")).toBe(
      `${party.venue}, ${party.address}`,
    );
  });
});

describe("groupEventVenues", () => {
  const ceremony = {
    ...party,
    title: "Lễ thành hôn nhà trai",
    date: "2026-11-09T01:00:00.000Z",
  };
  const bride = {
    title: "Tiệc cưới nhà gái",
    date: "2026-11-07T09:00:00.000Z",
    venue: "Tư gia nhà gái",
    address: "Địa chỉ minh họa",
    mapUrl: BRIDE_PIN,
  };

  it("gives the two groom parties at one place a single venue", () => {
    const venues = groupEventVenues([
      { ...party, mapUrl: GROOM_SHORT, ...GROOM_POINT },
      { ...ceremony, mapUrl: GROOM_PLACE },
    ]);
    expect(venues).toHaveLength(1);
    expect(venues[0]).toMatchObject({
      venue: party.venue,
      coordinates: GROOM_POINT,
      side: "Nhà trai",
    });
    expect(venues[0].events.map(({ index }) => index)).toEqual([0, 1]);
  });

  it("matches venue + address after normalizing when a pin is missing", () => {
    const venues = groupEventVenues([
      party,
      {
        ...ceremony,
        venue: "  nhà hàng   MINH HOẠ ",
        address: "So 1 Duong Minh Hoạ - Ha Noi, địa chỉ minh hoạ",
        ...GROOM_POINT,
      },
    ]);
    expect(venues).toHaveLength(1);
    expect(venues[0].coordinates).toEqual(GROOM_POINT);
  });

  it("keeps the groom's and the bride's places apart, each with its side", () => {
    const venues = groupEventVenues([
      { ...party, mapUrl: GROOM_SHORT, ...GROOM_POINT },
      bride,
      { ...ceremony, mapUrl: GROOM_SHORT, ...GROOM_POINT },
    ]);
    expect(
      venues.map(({ side, venue, coordinates }) => ({
        side,
        venue,
        coordinates,
      })),
    ).toEqual([
      { side: "Nhà trai", venue: party.venue, coordinates: GROOM_POINT },
      { side: "Nhà gái", venue: bride.venue, coordinates: BRIDE_POINT },
    ]);
    expect(venues[0].events.map(({ index }) => index)).toEqual([0, 2]);
  });

  it("splits one name at two pins and joins two names at one pin", () => {
    expect(
      groupEventVenues([
        { ...party, ...GROOM_POINT },
        { ...ceremony, ...BRIDE_POINT },
      ]),
    ).toHaveLength(2);
    expect(
      groupEventVenues([
        { ...party, ...GROOM_POINT },
        { ...ceremony, venue: "Nhà văn hóa thôn", ...GROOM_POINT },
      ]),
    ).toHaveLength(1);
  });

  it("names the side from `side`, then the title, else leaves it out", () => {
    const [shared] = groupEventVenues([
      party,
      { ...ceremony, title: "Lễ vu quy" },
    ]);
    expect(shared.side).toBe("Nhà trai và nhà gái");
    const [explicit] = groupEventVenues([{ ...party, side: "bride" as const }]);
    expect(explicit.side).toBe("Nhà gái");
    const [common] = groupEventVenues([{ ...party, title: "Tiệc cưới" }]);
    expect(common.side).toBeUndefined();
  });
});
