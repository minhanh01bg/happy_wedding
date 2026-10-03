import Image from "next/image";
import Link from "next/link";
import type {
  Invitation,
  WeddingTemplate,
  GuestResponse,
} from "@prisma/client";
import { MapPin, CalendarPlus } from "lucide-react";
import { readEvents, readPhotos, dateLabel } from "@/lib/wedding";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";
import { Music } from "./music";

export function InvitationView({
  invitation,
  wishes = [],
  guestName,
  guestToken,
  preview = false,
  removeBranding = false,
}: {
  invitation: Invitation & { template: WeddingTemplate };
  wishes?: Pick<GuestResponse, "id" | "name" | "message">[];
  guestName?: string;
  guestToken?: string;
  preview?: boolean;
  removeBranding?: boolean;
}) {
  const events = readEvents(invitation.eventsJson);
  const photos = readPhotos(invitation.photosJson);
  const calendarDates = `${invitation.weddingDate
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}/${new Date(
    invitation.weddingDate.getTime() + 3 * 3600_000,
  )
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}`;
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Lễ cưới ${invitation.groom} & ${invitation.bride}`)}&dates=${calendarDates}&location=${encodeURIComponent(events[0]?.address || "")}`;
  return (
    <article
      className={`wedding-page palette-${invitation.template.palette} layout-${invitation.template.layout}`}
    >
      {invitation.isDemo && (
        <div className="demo-banner">
          THIỆP MINH HỌA · Tên, lịch tiệc và địa điểm là dữ liệu mẫu.
        </div>
      )}
      <div className="wedding-top">
        <span>
          THE WEDDING OF {invitation.groom.toUpperCase()} &{" "}
          {invitation.bride.toUpperCase()}
        </span>
        <a href="#rsvp">Xác nhận tham dự ↓</a>
      </div>
      <section className="wedding-hero">
        <div className="wedding-hero-copy">
          <p className="eyebrow">WE’RE GETTING MARRIED</p>
          <h1>
            {invitation.groom}
            <em>&</em>
            {invitation.bride}
          </h1>
          <p>{invitation.headline}</p>
          <p className="wedding-date">
            {dateLabel(invitation.weddingDate).replaceAll("/", " . ")}
          </p>
          {guestName && (
            <p className="guest-name">Trân trọng kính mời {guestName}</p>
          )}
          <a className="button" href="#rsvp">
            Đến chung vui cùng chúng mình
          </a>
        </div>
        <div className="wedding-hero-image">
          <Image
            src={invitation.coverUrl}
            alt={`${invitation.groom} và ${invitation.bride} — ảnh thiệp cưới`}
            fill
            sizes="(max-width:800px) 95vw, 550px"
            priority
          />
        </div>
      </section>
      <section className="wedding-section">
        <p className="eyebrow">CHÚNG MÌNH SẮP CHUNG MỘT NHÀ</p>
        <h2>Save the date</h2>
        <Countdown date={invitation.weddingDate.toISOString()} />
        <a
          className="text-link"
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: 25 }}
        >
          <CalendarPlus size={16} />
          Thêm vào lịch của bạn
        </a>
      </section>
      <section className="wedding-section">
        <p className="eyebrow">CÂU CHUYỆN CỦA CHÚNG MÌNH</p>
        <h2>
          Một đời thương,
          <br />
          <em>một đời bên nhau.</em>
        </h2>
        <p>{invitation.story}</p>
        <div className="family-grid">
          <div>
            <h3>Gia đình nhà trai</h3>
            <p>{invitation.groomParents}</p>
          </div>
          <div>
            <h3>Gia đình nhà gái</h3>
            <p>{invitation.brideParents}</p>
          </div>
        </div>
      </section>
      <section className="wedding-section">
        <p className="eyebrow">TRÂN TRỌNG KÍNH MỜI</p>
        <h2>Ngày vui, có bạn.</h2>
        <div className="event-grid">
          {events.map((event, i) => (
            <article
              className="event-card"
              key={`${event.title}-${event.date}-${event.venue}`}
            >
              <p className="eyebrow">0{i + 1} / WEDDING CELEBRATION</p>
              <h3 style={{ marginTop: 20 }}>{event.title}</h3>
              <strong>{dateLabel(event.date, true)}</strong>
              <p>{event.venue}</p>
              <p>{event.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={16} />
                Chỉ đường đến tiệc
              </a>
            </article>
          ))}
        </div>
      </section>
      {!!photos.length && (
        <section className="wedding-section">
          <p className="eyebrow">MỖI KHOẢNH KHẮC, MỘT KỶ NIỆM</p>
          <h2>Our moments</h2>
          <div className="wedding-album">
            {photos.map((photo, i) => (
              <div key={photo}>
                <Image
                  src={photo}
                  alt={`Kỷ niệm của ${invitation.groom} & ${invitation.bride}, ảnh ${i + 1}`}
                  fill
                  sizes="(max-width:800px) 45vw, 300px"
                />
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="wedding-section" id="rsvp">
        <p className="eyebrow">SỰ HIỆN DIỆN CỦA BẠN LÀ NIỀM VUI</p>
        <h2>Bạn sẽ đến chứ?</h2>
        <p>Cho chúng mình biết để chuẩn bị đón bạn thật chu đáo nhé.</p>
        <RsvpForm
          slug={invitation.slug}
          events={events}
          guestName={guestName}
          guestToken={guestToken}
          disabled={preview}
        />
      </section>
      {!!wishes.length && (
        <section className="wedding-section">
          <p className="eyebrow">YÊU THƯƠNG ĐƯỢC GỬI ĐẾN</p>
          <h2>Những lời chúc ở lại.</h2>
          <div className="wedding-wishes">
            {wishes.map((w) => (
              <article key={w.id}>
                <h3>{w.name}</h3>
                <p>{w.message}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {invitation.giftBank && invitation.giftAccount && (
        <section className="wedding-section">
          <p className="eyebrow">GỬI CHÚT YÊU THƯƠNG</p>
          <h2>Quà mừng ngày cưới</h2>
          <p>Sự hiện diện của bạn đã là món quà quý giá nhất với chúng mình.</p>
          <div className="qr-box">
            <Image
              src={`https://img.vietqr.io/image/${invitation.giftBank}-${invitation.giftAccount}-compact2.png?accountName=${encodeURIComponent(invitation.giftName)}`}
              alt={`QR chuyển khoản mừng cưới cho ${invitation.giftName}`}
              width={240}
              height={290}
              unoptimized
            />
          </div>
          <p style={{ marginTop: 0 }}>
            {invitation.giftName}
            <br />
            {invitation.giftAccount} · BIN {invitation.giftBank}
          </p>
        </section>
      )}
      <footer className="wedding-thanks">
        <h2>Thank you!</h2>
        <p>Cảm ơn bạn đã cùng chúng mình viết nên một ngày thật đẹp.</p>
        <p>
          {invitation.groom} & {invitation.bride}
        </p>
        {!removeBranding && (
          <Link href="/">THIỆP CƯỚI ĐƯỢC CHĂM CHÚT BỞI HỶ STUDIO</Link>
        )}
      </footer>
      {invitation.musicUrl && <Music url={invitation.musicUrl} />}
    </article>
  );
}
