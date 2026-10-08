import Image from "next/image";
import { invitationDesign } from "@/lib/invitation-designs";
import type { CSSProperties } from "react";
import { demonstrationPhotos, weddingImageSource } from "@/lib/wedding-images";
import { weddingCalendarUrl } from "@/lib/wedding-calendar";
import Link from "next/link";
import type {
  Invitation,
  WeddingTemplate,
  GuestResponse,
} from "@prisma/client";
import { MapPin, CalendarPlus } from "lucide-react";
import { readEvents, readPhotos, dateLabel } from "@/lib/wedding";
import { WEDDING_MUSIC } from "@/lib/wedding-music";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";
import { Music } from "./music";
import { InvitationMotion } from "./invitation-motion";
import { InvitationAlbum } from "./invitation-album";
import { GiftAccounts, type GiftAccount } from "./gift-accounts";
import { Botanical } from "./template-card";
import { InvitationOpening } from "./invitation-opening";

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
  const design = invitationDesign(invitation.template);
  const events = readEvents(invitation.eventsJson);
  const photos = demonstrationPhotos(
    readPhotos(invitation.photosJson),
    invitation.isDemo,
  );
  const storyPhoto =
    photos.find(
      (photo) =>
        weddingImageSource(photo) !== weddingImageSource(invitation.coverUrl),
    ) || invitation.coverUrl;
  const storyDetail = photos.find(
    (photo) => weddingImageSource(photo) !== weddingImageSource(storyPhoto),
  );
  const musicUrl =
    invitation.musicUrl || (invitation.isDemo ? WEDDING_MUSIC.url : "");
  const giftAccounts: GiftAccount[] = [
    {
      side: "Nhà trai",
      bank: invitation.giftBank,
      account: invitation.giftAccount,
      name: invitation.giftName,
    },
    {
      side: "Nhà gái",
      bank: invitation.brideGiftBank,
      account: invitation.brideGiftAccount,
      name: invitation.brideGiftName,
    },
  ].filter(
    (account) => account.bank && account.account && account.name,
  ) as GiftAccount[];
  const mainEvent = events.find(
    (event) =>
      new Date(event.date).getTime() === invitation.weddingDate.getTime(),
  );
  const calendarUrl = weddingCalendarUrl(
    invitation.weddingDate,
    `Lễ cưới ${invitation.groom} & ${invitation.bride}`,
    mainEvent ? `${mainEvent.venue}, ${mainEvent.address}` : "",
  );
  return (
    <InvitationMotion>
      <article
        className={`wedding-page palette-${invitation.template.palette} layout-${invitation.template.layout} design-${design.key}`}
      >
        <InvitationOpening
          variant={design.opening}
          motif={design.motif}
          groom={invitation.groom}
          bride={invitation.bride}
          date={dateLabel(invitation.weddingDate)}
          guestName={guestName}
          hasMusic={!!musicUrl}
        />
        {invitation.isDemo && (
          <div className="demo-banner">
            THIỆP MINH HỌA · Tên, lịch tiệc và địa điểm là dữ liệu mẫu.
          </div>
        )}
        <div className="wedding-top">
          <span>
            LỄ CƯỚI CỦA {invitation.groom.toUpperCase()} &{" "}
            {invitation.bride.toUpperCase()}
          </span>
          <a href="#rsvp">Xác nhận tham dự ↓</a>
        </div>
        <nav className="wedding-shortcuts" aria-label="Các mục trong thiệp">
          <a href="#lich-tiec">Lịch tiệc & chỉ đường</a>
          <a href="#rsvp">Xác nhận tham dự</a>
          {!!photos.length && <a href="#album">Album ảnh</a>}
          {(giftAccounts.length > 0 || invitation.isDemo) && (
            <a href="#gifts">Mừng cưới</a>
          )}
        </nav>
        <section className="wedding-hero">
          <div className="hero-botanical-frame" aria-hidden="true">
            <Botanical />
            <Botanical />
          </div>
          <div className="wedding-petals" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    "--leaf-left": `${((i * 37) % 96) + 2}%`,
                    "--leaf-size": `${6 + (i % 5) * 2}px`,
                    "--leaf-duration": `${11 + (i % 7)}s`,
                    "--leaf-delay": `${-i * 0.73}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="wedding-hero-copy">
            <span className="wedding-design-mark" aria-hidden="true">
              {design.motif}
            </span>
            <p className="eyebrow">CHÚNG MÌNH KẾT HÔN</p>
            <h1 tabIndex={-1}>
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
              src={weddingImageSource(invitation.coverUrl)}
              alt={`${invitation.groom} và ${invitation.bride} — ảnh thiệp cưới`}
              fill
              sizes={
                invitation.template.layout === "cinematic"
                  ? "(max-width:1440px) 100vw, 1440px"
                  : invitation.template.layout === "minimal"
                    ? "(max-width:960px) 90vw, 880px"
                    : "(max-width:800px) 95vw, 550px"
              }
              priority
            />
          </div>
          <span className="hero-design-caption" aria-hidden="true">
            {invitation.groom} &amp; {invitation.bride} · Ngày mình chung đôi
          </span>
        </section>
        <section className="wedding-section wedding-countdown">
          <p className="eyebrow">CHÚNG MÌNH SẮP CHUNG MỘT NHÀ</p>
          <h2>Cùng đếm ngược ngày vui</h2>
          <Countdown date={invitation.weddingDate.toISOString()} />
          <a
            className="text-link"
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: 25 }}
          >
            <CalendarPlus size={16} />
            Thêm ngày cưới vào lịch
          </a>
        </section>
        <section className="wedding-section wedding-story">
          <svg
            className="wedding-story-ornament"
            viewBox="0 0 200 70"
            aria-hidden="true"
          >
            <path d="M10 58 Q65 50 100 10 Q135 50 190 58 M100 10 Q80 42 40 32 Q52 12 82 28 M100 10 Q120 42 160 32 Q148 12 118 28 M65 42 Q50 65 20 54 M135 42 Q150 65 180 54" />
          </svg>
          <p className="eyebrow">CÂU CHUYỆN CỦA CHÚNG MÌNH</p>
          <h2>
            Một đời thương,
            <br />
            <em>một đời bên nhau.</em>
          </h2>
          <div className="wedding-story-layout">
            <div className="wedding-story-collage">
              <div className="wedding-story-photo">
                <div className="wedding-story-print">
                  <Image
                    src={weddingImageSource(storyPhoto)}
                    alt={`${invitation.groom} và ${invitation.bride} — câu chuyện của hai người`}
                    fill
                    sizes="(max-width:800px) 80vw, 420px"
                  />
                </div>
                <span aria-hidden="true">
                  {invitation.groom} &amp; {invitation.bride}
                </span>
              </div>
              {storyDetail && (
                <div className="wedding-story-detail" aria-hidden="true">
                  <Image
                    src={weddingImageSource(storyDetail)}
                    alt=""
                    fill
                    sizes="(max-width:800px) 35vw, 190px"
                  />
                </div>
              )}
            </div>
            <div className="wedding-story-copy">
              <blockquote>{invitation.headline}</blockquote>
              <p>{invitation.story}</p>
              <span className="wedding-story-signature">
                {invitation.groom} &amp; {invitation.bride}
              </span>
            </div>
          </div>
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
        <section className="wedding-section" id="lich-tiec">
          <p className="eyebrow">TRÂN TRỌNG KÍNH MỜI</p>
          <h2>Ngày vui, có bạn.</h2>
          <div className="event-grid">
            {events.map((event, i) => (
              <article
                className="event-card"
                key={`${event.title}-${event.date}-${event.venue}`}
              >
                <span className="event-day-art" aria-hidden="true">
                  {dateLabel(event.date).split("/")[0]}
                </span>
                <p className="eyebrow">0{i + 1} / LỊCH TIỆC</p>
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
                <a
                  href={weddingCalendarUrl(
                    event.date,
                    `${event.title} — ${invitation.groom} & ${invitation.bride}`,
                    `${event.venue}, ${event.address}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CalendarPlus size={16} aria-hidden="true" />
                  Thêm tiệc này vào lịch
                </a>
              </article>
            ))}
          </div>
        </section>
        {!!photos.length && (
          <section className="wedding-section" id="album">
            <p className="eyebrow">MỖI KHOẢNH KHẮC, MỘT KỶ NIỆM</p>
            <h2>Những khoảnh khắc của hai người</h2>
            <InvitationAlbum
              photos={photos}
              couple={`${invitation.groom} & ${invitation.bride}`}
            />
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
        {(giftAccounts.length > 0 || invitation.isDemo) && (
          <section className="wedding-section" id="gifts">
            <p className="eyebrow">GỬI CHÚT YÊU THƯƠNG</p>
            <h2>Quà mừng ngày cưới</h2>
            <p>
              Sự hiện diện của bạn đã là món quà quý giá nhất. Nếu không thể
              đến, bạn có thể gửi lời chúc hoặc mừng cưới từ xa.
            </p>
            {giftAccounts.length ? (
              <>
                <GiftAccounts accounts={giftAccounts} />
                <p>
                  Trước khi xác nhận chuyển khoản, kiểm tra tên người nhận trong
                  ứng dụng ngân hàng. Tiền mừng được gửi trực tiếp đến tài khoản
                  cặp đôi.
                </p>
              </>
            ) : (
              <GiftAccounts accounts={[]} preview />
            )}
          </section>
        )}
        <footer className="wedding-thanks">
          <h2>Trân trọng cảm ơn!</h2>
          <p>Cảm ơn bạn đã cùng chúng mình viết nên một ngày thật đẹp.</p>
          <p>
            {invitation.groom} & {invitation.bride}
          </p>
          {!removeBranding && (
            <Link href="/">THIỆP CƯỚI ĐƯỢC CHĂM CHÚT BỞI HỶ STUDIO</Link>
          )}
        </footer>
        {musicUrl && <Music url={musicUrl} />}
      </article>
    </InvitationMotion>
  );
}
