import { weddingDateParts } from "./wedding-date-calendar";

/**
 * Chỉ dùng thông tin sự kiện công khai; không đưa guest token vào liên kết.
 * Có `timeLabel` (giờ ghi bằng chữ) thì giờ trong `date` không phải giờ thật,
 * nên tạo sự kiện cả ngày theo ngày Việt Nam thay vì một mốc giờ sai.
 */
export function weddingCalendarUrl(
  date: Date | string,
  title: string,
  location: string,
  timeLabel?: string,
) {
  const start = new Date(date);
  const stamp = (value: Date) =>
    value
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: timeLabel
      ? allDay(start)
      : `${stamp(start)}/${stamp(new Date(start.getTime() + 3 * 3600_000))}`,
    location,
    details: timeLabel
      ? `Thời gian: ${timeLabel}. Thiệp không ghi giờ cụ thể nên lịch lưu cả ngày. Bạn có thể điều chỉnh trong lịch theo thông tin của cặp đôi.`
      : "Thời gian kết thúc tạm tính sau 3 giờ. Bạn có thể điều chỉnh trong lịch theo thông tin của cặp đôi.",
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}

/** Google Calendar all-day range: YYYYMMDD/YYYYMMDD, end day exclusive. */
function allDay(date: Date) {
  const { day, month, year } = weddingDateParts(date);
  const ymd = (value: Date) =>
    value.toISOString().slice(0, 10).replaceAll("-", "");
  return `${ymd(new Date(Date.UTC(year, month - 1, day)))}/${ymd(
    new Date(Date.UTC(year, month - 1, day + 1)),
  )}`;
}
