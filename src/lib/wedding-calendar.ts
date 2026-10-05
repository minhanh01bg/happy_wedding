/** Chỉ dùng thông tin sự kiện công khai; không đưa guest token vào liên kết. */
export function weddingCalendarUrl(
  date: Date | string,
  title: string,
  location: string,
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
    dates: `${stamp(start)}/${stamp(new Date(start.getTime() + 3 * 3600_000))}`,
    location,
    details:
      "Thời gian kết thúc tạm tính sau 3 giờ. Bạn có thể điều chỉnh trong lịch theo thông tin của cặp đôi.",
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}
