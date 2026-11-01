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

/**
 * Days of the wedding's month (Vietnam time) that hold at least one event,
 * each with its event titles in entry order. Events in other months are left
 * out: the calendar shows only the wedding's month.
 */
export function weddingEventDays(
  date: Date,
  events: readonly { title: string; date: string | Date }[],
) {
  const { month, year } = weddingDateParts(date);
  const days = new Map<number, string[]>();
  for (const event of events) {
    const parts = weddingDateParts(event.date);
    if (parts.month === month && parts.year === year) {
      days.set(parts.day, [...(days.get(parts.day) ?? []), event.title]);
    }
  }
  return days;
}
