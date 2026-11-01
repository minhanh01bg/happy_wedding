import { CalendarPlus, MapPin, Heart } from "lucide-react";
import { dateLabel, type WeddingEvent } from "@/lib/wedding";
import { weddingCalendarUrl } from "@/lib/wedding-calendar";
import {
  weddingDateParts,
  weddingEventDays,
  weddingMonth,
} from "@/lib/wedding-date-calendar";
import styles from "./invitation-events.module.css";

/** The wedding day's ring, and a second hand-drawn one for other event days. */
const RINGS = {
  wedding:
    "M52 13C43 3 17 3 8 16 0 29 10 47 32 48 53 49 62 34 57 21 53 11 41 6 27 8",
  event:
    "M11 40C3 28 9 9 30 6 51 3 62 17 58 30 54 44 37 50 23 47 10 44 4 34 8 23",
};

/** "A", "A và B", "A, B và C". */
function joinTitles(titles: string[]) {
  const last = titles[titles.length - 1];
  return titles.length > 1
    ? `${titles.slice(0, -1).join(", ")} và ${last}`
    : last;
}

/**
 * UTC is used only to lay out an already-resolved Vietnamese calendar month.
 * The wedding day and every other day of that month with an event are circled.
 */
export function InvitationDateCalendar({
  date,
  events = [],
}: {
  date: Date;
  events?: readonly Pick<WeddingEvent, "title" | "date">[];
}) {
  const { day, month, year, rows } = weddingMonth(date);
  const eventDays = weddingEventDays(date, events);
  const circled = new Set([day, ...eventDays.keys()]);
  return (
    <div className={styles.calendar} data-wedding-calendar>
      <p className="eyebrow">
        {circled.size > 1
          ? "KHOANH TRÒN NHỮNG NGÀY ĐẶC BIỆT"
          : "KHOANH TRÒN MỘT NGÀY ĐẶC BIỆT"}
      </p>
      <table>
        <caption>
          Tháng {month} · {year}
        </caption>
        <thead>
          <tr>
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label, i) => (
              <th
                key={label}
                scope="col"
                aria-label={
                  [
                    "Thứ hai",
                    "Thứ ba",
                    "Thứ tư",
                    "Thứ năm",
                    "Thứ sáu",
                    "Thứ bảy",
                    "Chủ nhật",
                  ][i]
                }
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, week) => (
            <tr key={week}>
              {row.map((value, column) => {
                const wedding = value === day;
                const titles =
                  value === null ? undefined : eventDays.get(value);
                return (
                  <td key={column}>
                    {value !== null &&
                      (circled.has(value) ? (
                        <span
                          className={styles.selected}
                          data-wedding-day={wedding ? day : undefined}
                          data-event-day={wedding ? undefined : value}
                          aria-label={`${titles ? joinTitles(titles) : "Ngày cưới"}: ${value}/${month}/${year}`}
                        >
                          <Heart aria-hidden="true" />
                          <svg
                            className={styles.ring}
                            data-ring
                            viewBox="0 0 64 54"
                            aria-hidden="true"
                          >
                            <path
                              pathLength={1}
                              d={wedding ? RINGS.wedding : RINGS.event}
                            />
                          </svg>
                          {value}
                        </span>
                      ) : (
                        <span>{value}</span>
                      ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.calendarNote}>Hẹn bạn vào ngày {dateLabel(date)}</p>
    </div>
  );
}

export function InvitationEvents({
  events,
  design,
  couple,
}: {
  events: WeddingEvent[];
  design: string;
  couple: string;
}) {
  return (
    <section
      className={`wedding-section ${styles.events}`}
      id="lich-tiec"
      data-event-composition={design}
    >
      <p className="eyebrow">TRÂN TRỌNG KÍNH MỜI</p>
      <h2>Ngày vui, có bạn.</h2>
      <div className={`${styles.grid} ${styles[design] || ""}`}>
        {events.map((event, index) => {
          const {
            day,
            month,
            year,
            time: clock,
          } = weddingDateParts(event.date);
          // Giờ ghi bằng chữ (vd "Buổi sáng") thay giờ ở mọi chỗ; ngày vẫn hiện.
          const time = event.timeLabel || clock;
          const stamp = (
            <div className={styles.stamp}>
              <span>{String(day).padStart(2, "0")}</span>
              <small>
                {String(month).padStart(2, "0")} / {year}
              </small>
            </div>
          );
          const title = (
            <header className={styles.title}>
              <p className="eyebrow">0{index + 1} / LỊCH TIỆC</p>
              <h3>{event.title}</h3>
              <time
                dateTime={
                  event.timeLabel
                    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    : new Date(event.date).toISOString()
                }
              >
                {time} · {dateLabel(event.date)}
              </time>
            </header>
          );
          const venue = (
            <div className={styles.venue}>
              <strong>{event.venue}</strong>
              <p>{event.address}</p>
            </div>
          );
          const actions = (
            <footer className={styles.actions}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={16} aria-hidden="true" />
                Chỉ đường đến tiệc
              </a>
              <a
                href={weddingCalendarUrl(
                  event.date,
                  `${event.title} — ${couple}`,
                  `${event.venue}, ${event.address}`,
                  event.timeLabel,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CalendarPlus size={16} aria-hidden="true" />
                Thêm tiệc này vào lịch
              </a>
            </footer>
          );
          let content;
          switch (design) {
            case "vuon-thuong":
              content = (
                <>
                  <div className={styles.gardenMark} aria-hidden="true">
                    ❦
                  </div>
                  {title}
                  <div className={styles.archDate}>{stamp}</div>
                  {venue}
                  {actions}
                </>
              );
              break;
            case "song-hy":
              content = (
                <>
                  <div className={styles.ceremonyHeader}>
                    <span aria-hidden="true">囍</span>
                    <p>TRÂN TRỌNG KÍNH MỜI</p>
                  </div>
                  {title}
                  <div className={styles.ceremonyDate}>
                    {stamp}
                    <span>{time}</span>
                  </div>
                  {venue}
                  {actions}
                </>
              );
              break;
            case "ngay-chung-doi":
              content = (
                <>
                  <aside className={styles.issue}>
                    {stamp}
                    <span>ĐỊA ĐIỂM HẸN</span>
                  </aside>
                  <div className={styles.column}>
                    {title}
                    {venue}
                    {actions}
                  </div>
                </>
              );
              break;
            case "dem-sao":
              content = (
                <>
                  <span className={styles.star} aria-hidden="true">
                    ✧
                  </span>
                  {title}
                  <div className={styles.orbit}>{stamp}</div>
                  {venue}
                  <div className={styles.nightFoot}>{actions}</div>
                </>
              );
              break;
            case "nang-thu":
              content = (
                <>
                  <span className={styles.tape} aria-hidden="true" />
                  <div className={styles.journalTop}>
                    {stamp}
                    <span>Hẹn bạn nhé ♡</span>
                  </div>
                  {title}
                  {venue}
                  {actions}
                </>
              );
              break;
            case "loi-hen":
              content = (
                <>
                  <div className={styles.rowHeading}>
                    {stamp}
                    {title}
                  </div>
                  <dl className={styles.details}>
                    <div>
                      <dt>Địa điểm</dt>
                      <dd>{event.venue}</dd>
                    </div>
                    <div>
                      <dt>Địa chỉ</dt>
                      <dd>{event.address}</dd>
                    </div>
                  </dl>
                  {actions}
                </>
              );
              break;
            case "thu-tinh":
              content = (
                <>
                  <header className={styles.letterHeader}>
                    <span>Gửi bạn, lời mời ngày vui</span>
                    {stamp}
                  </header>
                  <div className={styles.letterBody}>
                    {title}
                    {venue}
                  </div>
                  {actions}
                  <span className={styles.letterFold} aria-hidden="true">
                    ♡
                  </span>
                </>
              );
              break;
            case "khoanh-khac":
              content = (
                <>
                  <header className={styles.scene}>
                    <span>CẢNH {String(index + 1).padStart(2, "0")}</span>
                    <span>{time}</span>
                  </header>
                  <div className={styles.frame}>
                    {title}
                    {stamp}
                  </div>
                  {venue}
                  {actions}
                </>
              );
              break;
            case "ben-nhau":
              content = (
                <>
                  <div className={styles.dateHalf}>
                    {stamp}
                    <span>{time}</span>
                  </div>
                  <div className={styles.infoHalf}>
                    {title}
                    {venue}
                    {actions}
                  </div>
                </>
              );
              break;
            default:
              content = (
                <>
                  <div className={styles.ribbon}>Một ngày chung vui</div>
                  {title}
                  {stamp}
                  {venue}
                  {actions}
                </>
              );
          }
          return (
            <article
              className={`event-card ${styles.card}`}
              data-event-card
              key={`${event.title}-${event.date}-${event.venue}`}
            >
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
