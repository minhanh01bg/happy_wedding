import { weddingDateParts } from "./wedding-date-calendar";
import type { WeddingEvent } from "./wedding";

/** Cách form RSVP và trang khách mời gọi tên một tiệc: bên, ngày, giờ. */
export type EventSide = NonNullable<WeddingEvent["side"]>;
export const EVENT_SIDES = [
  "groom",
  "bride",
] as const satisfies readonly EventSide[];
export const EVENT_SIDE_LABELS: Record<EventSide, string> = {
  groom: "Nhà trai",
  bride: "Nhà gái",
};

/**
 * Bên của tiệc. `side` ghi rõ thì dùng nó; thiệp cũ chưa có `side` thì đoán
 * theo tên, không phân biệt hoa thường: "nhà trai" là nhà trai, "nhà gái"
 * hoặc "vu quy" là nhà gái. Không đoán được thì là tiệc chung (undefined).
 */
export function eventSide(
  event: Pick<WeddingEvent, "title" | "side">,
): EventSide | undefined {
  if (event.side) return event.side;
  // Bàn phím macOS/iOS có thể gửi chữ Việt ở dạng tổ hợp (NFD).
  const title = event.title.normalize("NFC").toLocaleLowerCase("vi");
  if (title.includes("nhà trai")) return "groom";
  if (title.includes("nhà gái") || title.includes("vu quy")) return "bride";
  return undefined;
}

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];
const pad = (value: number) => String(value).padStart(2, "0");

/** Thứ và ngày theo giờ Việt Nam, ví dụ "Chủ nhật · 08/11". */
export function eventDayLabel(event: Pick<WeddingEvent, "date">) {
  const { day, month, year } = weddingDateParts(event.date);
  const weekday =
    WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} · ${pad(day)}/${pad(month)}`;
}

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD, cho thuộc tính `dateTime`. */
export function eventIsoDay(event: Pick<WeddingEvent, "date">) {
  const { day, month, year } = weddingDateParts(event.date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Giờ ghi bằng chữ nếu có, không thì giờ Việt Nam, ví dụ "16:00". */
export function eventTimeLabel(
  event: Pick<WeddingEvent, "date" | "timeLabel">,
) {
  return event.timeLabel || weddingDateParts(event.date).time;
}
