import { Fragment } from "react";
import { invitationDesign } from "@/lib/invitation-designs";
import { demonstrationPhotos } from "@/lib/wedding-images";
import { weddingCalendarUrl } from "@/lib/wedding-calendar";
import Link from "next/link";
import type {
  Invitation,
  WeddingTemplate,
  GuestResponse,
} from "@prisma/client";
import { CalendarPlus } from "lucide-react";
import { readEvents, readPhotos, dateLabel } from "@/lib/wedding";
import { WEDDING_MUSIC } from "@/lib/wedding-music";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";
import { Music } from "./music";
import { InvitationMotion } from "./invitation-motion";
import { InvitationStory } from "./invitation-story";
import { InvitationAlbum } from "./invitation-album";
import { GiftAccounts, type GiftAccount } from "./gift-accounts";
import { InvitationEvents, InvitationDateCalendar } from "./invitation-events";
import { InvitationHero } from "./invitation-hero";
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
  const sections = {
    countdown: (
      <section className="wedding-section wedding-countdown">
        <p className="eyebrow">CHÚNG MÌNH SẮP CHUNG MỘT NHÀ</p>
        <h2>Cùng đếm ngược ngày vui</h2>
        <InvitationDateCalendar date={invitation.weddingDate} />
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
    ),
    story: (
      <InvitationStory
        invitation={invitation}
        design={design.key}
        photos={photos}
      />
    ),
    events: (
      <InvitationEvents
        events={events}
        design={design.key}
        couple={`${invitation.groom} & ${invitation.bride}`}
      />
    ),
    album: !!photos.length && (
      <section className="wedding-section" id="album">
        <p className="eyebrow">MỖI KHOẢNH KHẮC, MỘT KỶ NIỆM</p>
        <h2>Những khoảnh khắc của hai người</h2>
        <InvitationAlbum
          design={design.key}
          photos={photos}
          couple={`${invitation.groom} & ${invitation.bride}`}
        />
      </section>
    ),
  };
  const orders: Record<string, (keyof typeof sections)[]> = {
    "loi-yeu": ["countdown", "story", "events", "album"],
    "vuon-thuong": ["story", "album", "countdown", "events"],
    "song-hy": ["events", "countdown", "story", "album"],
    "ngay-chung-doi": ["story", "events", "album", "countdown"],
    "dem-sao": ["countdown", "album", "story", "events"],
    "nang-thu": ["album", "story", "events", "countdown"],
    "loi-hen": ["events", "story", "countdown", "album"],
    "thu-tinh": ["story", "countdown", "album", "events"],
    "khoanh-khac": ["album", "countdown", "story", "events"],
    "ben-nhau": ["story", "album", "events", "countdown"],
  };
  const sectionOrder = orders[design.key] || orders["loi-yeu"];
  return (
    <InvitationMotion>
      <article
        className={`wedding-page palette-${invitation.template.palette} layout-${invitation.template.layout} design-${design.key}`}
      >
        <InvitationOpening
          variant={design.opening}
          design={design.key}
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
        <InvitationHero
          invitation={invitation}
          design={design.key}
          photos={photos}
          guestName={guestName}
        />
        {sectionOrder.map((section) => (
          <Fragment key={section}>{sections[section]}</Fragment>
        ))}
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
