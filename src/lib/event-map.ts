/**
 * Bản đồ cho tiệc: kiểm link Google Maps, đọc tọa độ ghim từ link dài, dựng
 * URL nhúng và gộp các tiệc cùng địa điểm thành một thẻ. Mọi hàm ở đây là hàm
 * thuần, không gọi mạng: link rút gọn `maps.app.goo.gl` không được server tự
 * giải (ADR 0009), nên bản đồ của nó tìm theo địa điểm + địa chỉ, trừ khi tiệc
 * đã có `lat`/`lng`.
 */
import { EVENT_SIDE_LABELS, eventSide } from "./rsvp-events";

/** Khung bao Việt Nam (đất liền và đảo gần bờ); tọa độ ngoài khung bị bỏ. */
export const VIETNAM_BOUNDS = {
  lat: { min: 8, max: 23.5 },
  lng: { min: 102, max: 110 },
} as const;

/** Nguồn iframe bản đồ được phép trong CSP `frame-src`. */
export const MAP_FRAME_ORIGINS = [
  "https://maps.google.com",
  "https://www.google.com",
] as const;

export type MapCoordinates = { lat: number; lng: number };

type MappableEvent = {
  title: string;
  venue: string;
  address: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  side?: "groom" | "bride";
};

export function inVietnam(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= VIETNAM_BOUNDS.lat.min &&
    lat <= VIETNAM_BOUNDS.lat.max &&
    lng >= VIETNAM_BOUNDS.lng.min &&
    lng <= VIETNAM_BOUNDS.lng.max
  );
}

/**
 * Chỉ https, không user/password/cổng, và chỉ host Google Maps:
 * `maps.app.goo.gl`, `maps.google.com/` và `maps.google.com/maps…`,
 * `goo.gl/maps…`, `www.google.com/maps…`, `google.com/maps…`. Path khác của
 * `maps.google.com` (vd. `/url?q=…` chuyển hướng ra ngoài) bị từ chối.
 */
export function isGoogleMapsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return false;
  }
  const mapsPath = /^\/maps(?:\/|$)/.test(url.pathname);
  switch (url.hostname) {
    case "maps.app.goo.gl":
      return url.pathname.length > 1;
    case "maps.google.com":
      return url.pathname === "/" || mapsPath;
    case "goo.gl":
    case "www.google.com":
    case "google.com":
      return mapsPath;
    default:
      return false;
  }
}

const NUMBER = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
const PIN = new RegExp(String.raw`!3d${NUMBER}!4d${NUMBER}`);
const VIEWPORT = new RegExp(String.raw`@${NUMBER},${NUMBER}`);
const QUERY = new RegExp(String.raw`^\s*${NUMBER}\s*,\s*${NUMBER}\s*$`);

function coordinates(lat: string, lng: string): MapCoordinates | null {
  const point = { lat: Number(lat), lng: Number(lng) };
  return inVietnam(point.lat, point.lng) ? point : null;
}

/**
 * Đọc tọa độ từ link Google Maps dài, theo thứ tự tin cậy: ghim của địa điểm
 * (`!3d<lat>!4d<lng>`), rồi `q=`/`query=<lat>,<lng>`, cuối cùng tâm khung nhìn
 * `@<lat>,<lng>` (thường lệch khỏi ghim). Link rút gọn, link không phải Google
 * Maps hoặc tọa độ ngoài Việt Nam trả `null`.
 */
export function parseMapCoordinates(
  value: string | undefined,
): MapCoordinates | null {
  if (!value || !isGoogleMapsUrl(value)) return null;
  const url = new URL(value);
  let path = url.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // Giữ nguyên path khi có chuỗi %-mã hóa hỏng.
  }
  const pin = PIN.exec(path) ?? PIN.exec(url.search);
  if (pin) return coordinates(pin[1], pin[2]);
  for (const key of ["q", "query"]) {
    const match = QUERY.exec(url.searchParams.get(key) ?? "");
    if (match) return coordinates(match[1], match[2]);
  }
  const viewport = VIEWPORT.exec(path);
  return viewport ? coordinates(viewport[1], viewport[2]) : null;
}

/** Tọa độ đã lưu của tiệc, nếu không có thì đọc từ `mapUrl`. */
export function eventCoordinates(event: MappableEvent): MapCoordinates | null {
  if (event.lat !== undefined && event.lng !== undefined) {
    return inVietnam(event.lat, event.lng)
      ? { lat: event.lat, lng: event.lng }
      : null;
  }
  return parseMapCoordinates(event.mapUrl);
}

/** Đổi link của tiệc trong editor: tọa độ đi theo link mới, không giữ cái cũ. */
export function withMapUrl<T extends MappableEvent>(event: T, mapUrl: string) {
  const point = parseMapCoordinates(mapUrl.trim());
  return { ...event, mapUrl, lat: point?.lat, lng: point?.lng };
}

/** Bản đồ nhúng không cần API key; không có tọa độ thì tìm theo chữ. */
export function mapEmbedUrl(place: MapCoordinates | string) {
  const q =
    typeof place === "string"
      ? encodeURIComponent(place)
      : `${place.lat},${place.lng}`;
  return `${MAP_FRAME_ORIGINS[0]}/maps?q=${q}&z=16&hl=vi&output=embed`;
}

/** Link của nút “Chỉ đường đến tiệc”, cho một tiệc hoặc một địa điểm. */
export function directionsUrl(
  place: Pick<MappableEvent, "venue" | "address" | "mapUrl">,
) {
  return (
    place.mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.venue}, ${place.address}`)}`
  );
}

/**
 * Khóa địa điểm của tiệc: `side` (khi có), địa điểm và địa chỉ đã trim. Thẻ
 * chỉ ghi địa điểm + địa chỉ một lần, nên chỉ chữ giống hệt mới chung thẻ; NFC
 * để chữ gõ từ bàn phím macOS/iOS (NFD) vẫn khớp với chữ đã dựng sẵn.
 */
function placeKey(event: MappableEvent) {
  return JSON.stringify([
    event.side ?? null,
    event.venue.normalize("NFC").trim(),
    event.address.normalize("NFC").trim(),
  ]);
}

/**
 * "Nhà trai", "Nhà gái", "Nhà trai và nhà gái"; tiệc chung thì không ghi.
 * Bên của từng tiệc theo `eventSide` của RSVP, để thiệp và form gọi giống nhau.
 */
function venueSide(events: readonly Pick<MappableEvent, "title" | "side">[]) {
  const sides = new Set(events.map(eventSide));
  const groom = sides.has("groom");
  const bride = sides.has("bride");
  if (groom && bride) return "Nhà trai và nhà gái";
  return groom
    ? EVENT_SIDE_LABELS.groom
    : bride
      ? EVENT_SIDE_LABELS.bride
      : undefined;
}

export type EventVenue<T extends MappableEvent> = {
  venue: string;
  address: string;
  /** Tọa độ của tiệc đầu tiên ở đây có tọa độ, cho bản đồ nhúng. */
  coordinates: MapCoordinates | null;
  /** Link của tiệc đầu tiên ở đây có link, cho nút chỉ đường. */
  mapUrl?: string;
  /** Bên tổ chức các tiệc ở đây, để ghi trên thẻ và bản đồ. */
  side?: string;
  /** Các tiệc ở địa điểm này, kèm vị trí trong mảng tiệc (eventIndex RSVP). */
  events: { event: T; index: number }[];
};

/**
 * Mỗi địa điểm một mục (một thẻ trên thiệp), theo thứ tự xuất hiện đầu tiên.
 * Hai tiệc chung chỗ khi cùng `side` (tiệc không ghi `side` đi với nhau), cùng
 * địa điểm và cùng địa chỉ sau khi trim. Thứ tự và `index` của tiệc giữ nguyên.
 */
export function groupEventVenues<T extends MappableEvent>(
  events: readonly T[],
): EventVenue<T>[] {
  const venues = new Map<string, EventVenue<T>>();
  events.forEach((event, index) => {
    const key = placeKey(event);
    const point = eventCoordinates(event);
    const venue = venues.get(key);
    if (venue) {
      venue.events.push({ event, index });
      venue.coordinates ??= point;
      venue.mapUrl ||= event.mapUrl || undefined;
    } else {
      venues.set(key, {
        venue: event.venue.trim(),
        address: event.address.trim(),
        coordinates: point,
        mapUrl: event.mapUrl || undefined,
        events: [{ event, index }],
      });
    }
  });
  return [...venues.values()].map((venue) => ({
    ...venue,
    side: venueSide(venue.events.map(({ event }) => event)),
  }));
}
