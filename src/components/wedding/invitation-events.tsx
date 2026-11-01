import { CalendarPlus, MapPin, Heart } from "lucide-react";
import { dateLabel, type WeddingEvent } from "@/lib/wedding";
import { weddingCalendarUrl } from "@/lib/wedding-calendar";
import {
  directionsUrl,
  groupEventVenues,
  mapEmbedUrl,
  type EventVenue,
} from "@/lib/event-map";
import { eventIsoDay, eventTimeLabel, eventWeekday } from "@/lib/rsvp-events";
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

const pad = (value: number) => String(value).padStart(2, "0");

/** `dateTime` của dòng giờ: cả ngày khi giờ ghi bằng chữ, không thì giờ ISO. */
function eventDateTime(event: WeddingEvent) {
  return event.timeLabel
    ? eventIsoDay(event)
    : new Date(event.date).toISOString();
}

/**
 * Lịch tiệc: mỗi địa điểm một thẻ, theo thứ tự xuất hiện đầu tiên (gộp ở
 * `groupEventVenues`). Thẻ một tiệc giữ đúng dáng cũ của từng mẫu; thẻ nhiều
 * tiệc là một khung: bên + tên địa điểm, mỗi tiệc một dòng kẻ mảnh có link
 * thêm vào lịch, bản đồ, rồi địa chỉ và nút chỉ đường. Bản đồ nằm trong mọi
 * thẻ; iframe không gửi referrer, để token khách mời trên URL thiệp không lọt
 * sang Google. Thứ tự và chỉ số tiệc (eventIndex của RSVP) không đổi.
 */
export function InvitationEvents({
  events,
  design,
  couple,
}: {
  events: WeddingEvent[];
  design: string;
  couple: string;
}) {
  const places = groupEventVenues(events);
  const calendarUrl = (event: WeddingEvent) =>
    weddingCalendarUrl(
      event.date,
      `${event.title} — ${couple}`,
      `${event.venue}, ${event.address}`,
      event.timeLabel,
    );
  return (
    <section
      className={`wedding-section ${styles.events}`}
      id="lich-tiec"
      data-event-composition={design}
    >
      <p className="eyebrow">TRÂN TRỌNG KÍNH MỜI</p>
      <h2>Ngày vui, có bạn.</h2>
      <div
        className={`${styles.grid} ${styles[design] || ""}`}
        data-count={places.length}
        data-grouped={
          places.some((place) => place.events.length > 1) || undefined
        }
      >
        {places.map((place, index) => (
          <PlaceCard
            key={place.events[0].index}
            place={place}
            number={index + 1}
            design={design}
            calendarUrl={calendarUrl}
          />
        ))}
      </div>
    </section>
  );
}

function PlaceCard({
  place,
  number,
  design,
  calendarUrl,
}: {
  place: EventVenue<WeddingEvent>;
  number: number;
  design: string;
  calendarUrl: (event: WeddingEvent) => string;
}) {
  const eyebrow = <p className="eyebrow">{pad(number)} / LỊCH TIỆC</p>;
  const directions = (
    <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
      <MapPin size={16} aria-hidden="true" />
      Chỉ đường đến tiệc
    </a>
  );
  const map = (
    <div className={styles.mapFrame} data-event-map>
      <iframe
        src={mapEmbedUrl(
          place.coordinates ?? `${place.venue}, ${place.address}`,
        )}
        title={`Bản đồ đường đến ${place.venue}${place.side ? ` (${place.side.toLocaleLowerCase("vi")})` : ""}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
  // Nét riêng của từng mẫu, dùng chung cho thẻ một tiệc và thẻ nhiều tiệc.
  const gardenMark = (
    <div className={styles.gardenMark} aria-hidden="true">
      ❦
    </div>
  );
  const ceremonyHeader = (
    <div className={styles.ceremonyHeader}>
      <span aria-hidden="true">囍</span>
      <p>TRÂN TRỌNG KÍNH MỜI</p>
    </div>
  );
  const star = (
    <span className={styles.star} aria-hidden="true">
      ✧
    </span>
  );
  const tape = <span className={styles.tape} aria-hidden="true" />;
  const letterFold = (
    <span className={styles.letterFold} aria-hidden="true">
      ♡
    </span>
  );
  const scene = (time?: string) => (
    <header className={styles.scene}>
      <span>CẢNH {pad(number)}</span>
      {time && <span>{time}</span>}
    </header>
  );

  if (place.events.length > 1) {
    const ornament = {
      "vuon-thuong": gardenMark,
      "song-hy": ceremonyHeader,
      "dem-sao": star,
      "nang-thu": tape,
      "khoanh-khac": scene(),
    }[design];
    return (
      <article
        className={`event-card ${styles.card} ${styles.place}`}
        data-event-card
        data-event-count={place.events.length}
      >
        {ornament}
        <header className={styles.placeHead}>
          {eyebrow}
          <h3>
            {place.side && <span className={styles.side}>{place.side}</span>}
            <span className={styles.placeName}>{place.venue}</span>
          </h3>
        </header>
        <ul className={styles.agenda}>
          {place.events.map(({ event, index }) => (
            <li key={index} data-event-row>
              <time dateTime={eventDateTime(event)}>
                {eventWeekday(event)} · {dateLabel(event.date)} ·{" "}
                {eventTimeLabel(event)}
              </time>
              <h4>{event.title}</h4>
              <a
                href={calendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CalendarPlus size={14} aria-hidden="true" />
                Thêm vào lịch
                <span className={styles.srOnly}>: {event.title}</span>
              </a>
            </li>
          ))}
        </ul>
        {map}
        <footer className={styles.placeFoot}>
          <p>{place.address}</p>
          <div className={styles.actions}>{directions}</div>
        </footer>
        {design === "thu-tinh" && letterFold}
      </article>
    );
  }

  const [{ event }] = place.events;
  const { day, month, year } = weddingDateParts(event.date);
  // Giờ ghi bằng chữ (vd "Buổi sáng") thay giờ ở mọi chỗ; ngày vẫn hiện.
  const time = eventTimeLabel(event);
  const stamp = (
    <div className={styles.stamp}>
      <span>{pad(day)}</span>
      <small>
        {pad(month)} / {year}
      </small>
    </div>
  );
  const title = (
    <header className={styles.title}>
      {eyebrow}
      <h3>{event.title}</h3>
      <time dateTime={eventDateTime(event)}>
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
      {directions}
      <a href={calendarUrl(event)} target="_blank" rel="noopener noreferrer">
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
          {gardenMark}
          {title}
          <div className={styles.archDate}>{stamp}</div>
          {venue}
          {actions}
          {map}
        </>
      );
      break;
    case "song-hy":
      content = (
        <>
          {ceremonyHeader}
          {title}
          <div className={styles.ceremonyDate}>
            {stamp}
            <span>{time}</span>
          </div>
          {venue}
          {actions}
          {map}
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
          {map}
        </>
      );
      break;
    case "dem-sao":
      content = (
        <>
          {star}
          {title}
          <div className={styles.orbit}>{stamp}</div>
          {venue}
          <div className={styles.nightFoot}>{actions}</div>
          {map}
        </>
      );
      break;
    case "nang-thu":
      content = (
        <>
          {tape}
          <div className={styles.journalTop}>
            {stamp}
            <span>Hẹn bạn nhé ♡</span>
          </div>
          {title}
          {venue}
          {actions}
          {map}
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
          {map}
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
          {map}
          {letterFold}
        </>
      );
      break;
    case "khoanh-khac":
      content = (
        <>
          {scene(time)}
          <div className={styles.frame}>
            {title}
            {stamp}
          </div>
          {venue}
          {actions}
          {map}
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
          {map}
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
          {map}
        </>
      );
  }
  return (
    <article
      className={`event-card ${styles.card}`}
      data-event-card
      data-event-count={1}
    >
      {content}
    </article>
  );
}
