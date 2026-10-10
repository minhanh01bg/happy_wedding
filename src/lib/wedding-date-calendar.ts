export function weddingDateParts(date: string | Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const value = (key: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === key)!.value;
  return {
    day: Number(value("day")),
    month: Number(value("month")),
    year: Number(value("year")),
    time: `${value("hour")}:${value("minute")}`,
  };
}

/** Build Monday-first cells after converting the event instant to Vietnam time. */
export function weddingMonth(date: Date) {
  const { day, month, year } = weddingDateParts(date);
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const rows = Array.from(
    { length: Math.ceil((offset + days) / 7) },
    (_, week) =>
      Array.from({ length: 7 }, (_, column) => {
        const value = week * 7 + column - offset + 1;
        return value > 0 && value <= days ? value : null;
      }),
  );
  return { day, month, year, rows };
}
