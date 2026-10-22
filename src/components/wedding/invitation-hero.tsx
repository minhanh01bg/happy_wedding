import { Fragment, useId, type CSSProperties } from "react";
import Image from "next/image";
import type { Invitation } from "@prisma/client";
import { dateLabel } from "@/lib/wedding";
import { weddingImageSource } from "@/lib/wedding-images";
import styles from "./invitation-hero.module.css";

/** Each cover has its own reading hierarchy; data and guest actions stay shared. */
export function InvitationHero({
  invitation,
  design,
  photos,
  guestName,
}: {
  invitation: Invitation;
  design: string;
  photos: string[];
  guestName?: string;
}) {
  const demoCovers: Record<string, string> = {
    "song-hy": "/images/wedding-couple-traditional.jpg",
    "ngay-chung-doi": "/images/wedding-couple-riverside.jpg",
    "nang-thu": "/images/wedding-couple-riverside.jpg",
    "loi-hen": "/images/wedding-couple-journey.jpg",
    "thu-tinh": "/images/wedding-couple-highfive.jpg",
    "khoanh-khac": "/images/wedding-couple-moment.jpg",
  };
  const cover =
    invitation.isDemo &&
    invitation.coverUrl === "/images/couple.jpg" &&
    photos.includes(demoCovers[design])
      ? demoCovers[design]
      : invitation.coverUrl;
  // Lời yêu writes each name by hand, so its heading plays its own entrance.
  const signed = design === "loi-yeu";
  const names = signed ? (
    <h1 tabIndex={-1} data-motion="own">
      <span>{invitation.groom}</span>
      <em>&</em>
      <span>{invitation.bride}</span>
    </h1>
  ) : (
    <h1 tabIndex={-1}>
      {invitation.groom}
      <em>&</em>
      {invitation.bride}
    </h1>
  );
  const date = (
    <p className={styles.date}>
      {dateLabel(invitation.weddingDate).replaceAll("/", " . ")}
    </p>
  );
  const copy = (
    <div className={styles.copy} data-hero-copy>
      <p className="eyebrow">CHÚNG MÌNH KẾT HÔN</p>
      {names}
      <p>{invitation.headline}</p>
      {date}
      {guestName && <p>Trân trọng kính mời {guestName}</p>}
      <a className="button" href="#rsvp">
        Đến chung vui cùng chúng mình
      </a>
    </div>
  );
  const photo = (secondary = false) => (
    <div
      className={`${styles.photo} ${secondary ? styles.secondary : ""}`}
      data-hero-photo
    >
      <Image
        src={weddingImageSource(
          secondary
            ? photos.find(
                (p) => weddingImageSource(p) !== weddingImageSource(cover),
              ) || cover
            : cover,
        )}
        alt={`${invitation.groom} và ${invitation.bride} — ảnh thiệp cưới`}
        fill
        sizes="(max-width: 760px) 95vw, 75vw"
        priority={!secondary}
      />
    </div>
  );
  let content;
  switch (design) {
    case "vuon-thuong":
      content = (
        <>
          <div className={styles.wreath} aria-hidden="true">
            ❦
          </div>
          <div className={styles.arch}>{photo()}</div>
          <aside>{copy}</aside>
        </>
      );
      break;
    case "song-hy":
      content = (
        <>
          <header className={styles.proclamation}>
            <span aria-hidden="true">囍</span>
            <p>TRÂN TRỌNG BÁO TIN VUI</p>
            {date}
          </header>
          {copy}
          <div className={styles.ceremony}>{photo()}</div>
        </>
      );
      break;
    case "ngay-chung-doi":
      content = (
        <>
          <header className={styles.masthead}>
            NGÀY CHUNG ĐÔI{" "}
            <small>Ấn bản đặc biệt · {dateLabel(invitation.weddingDate)}</small>
          </header>
          <div className={styles.lead}>
            {photo()}
            <span>Một ngày để nhớ. Một đời để thương.</span>
          </div>
          <aside>{copy}</aside>
        </>
      );
      break;
    case "dem-sao":
      content = (
        <>
          <div className={styles.orbit}>
            <span aria-hidden="true">✧</span>
            {photo()}
          </div>
          <div className={styles.constellation}>{copy}</div>
          <span className={styles.star} aria-hidden="true">
            ✦
          </span>
        </>
      );
      break;
    case "nang-thu":
      content = (
        <>
          <div className={styles.scrapbook}>
            <figure>
              {photo()}
              <figcaption>Ngày mình chung một nhà</figcaption>
            </figure>
            <div className={styles.note}>{copy}</div>
          </div>
        </>
      );
      break;
    case "loi-hen":
      content = (
        <>
          <header className={styles.letterhead}>
            MỘT LỜI HẸN · MỘT ĐỜI BÊN NHAU
          </header>
          {copy}
          <div className={styles.panorama}>{photo()}</div>
        </>
      );
      break;
    case "thu-tinh":
      content = (
        <>
          <div className={styles.envelope}>
            <div className={styles.stationery}>{copy}</div>
            <span className={styles.stamp} aria-hidden="true">
              ♡
            </span>
          </div>
          <figure className={styles.postcard}>
            {photo()}
            <figcaption>Gửi bạn, một lời mời thương.</figcaption>
          </figure>
        </>
      );
      break;
    case "khoanh-khac":
      content = (
        <>
          <div className={styles.screen}>{photo()}</div>
          <div className={styles.credits}>
            <span>THƯỚC PHIM NGÀY CƯỚI</span>
            {copy}
            <p>Cuộn xuống để bước vào câu chuyện ↓</p>
          </div>
        </>
      );
      break;
    case "ben-nhau":
      content = (
        <>
          <div className={styles.diptych}>
            {photo()}
            {photo(true)}
          </div>
          <div className={styles.bridge}>{copy}</div>
        </>
      );
      break;
    case "loi-yeu":
      content = (
        <>
          <div className={styles.letterArch}>
            {photo()}
            <LetterSeal
              text={`${invitation.groom} & ${invitation.bride} · ${dateLabel(
                invitation.weddingDate,
              ).replaceAll("/", " . ")} · `}
            />
          </div>
          <div className={styles.loveLetter}>{copy}</div>
        </>
      );
      break;
    default:
      content = (
        <>
          <div className={styles.romantic}>
            {photo()}
            <span aria-hidden="true">♡</span>
          </div>
          <div className={styles.promise}>{copy}</div>
        </>
      );
  }
  return (
    <section
      className={`wedding-hero ${styles.hero}`}
      data-hero-composition={design}
      data-invitation-hero
    >
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
      {content}
    </section>
  );
}

/** A wax-paper seal whose ring reads the couple's names and day, round and round. */
function LetterSeal({ text }: { text: string }) {
  const ringId = useId();
  const ring = text.toUpperCase();
  // The ring is 2πr ≈ 289 units long; long names write smaller, never overlap.
  const size = Math.min(10.5, 288 / (ring.length * 0.74));
  return (
    <div className={styles.seal} aria-hidden="true">
      {/* The dial turns as an HTML box; turning the svg itself relays it out. */}
      <span className={styles.sealDial}>
        <svg viewBox="0 0 120 120" className={styles.sealRing}>
          <defs>
            <path
              id={ringId}
              d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0"
            />
          </defs>
          <circle cx="60" cy="60" r="58" />
          <circle cx="60" cy="60" r="34" />
          <text fontSize={size}>
            <textPath
              href={`#${ringId}`}
              textLength="288"
              lengthAdjust="spacing"
            >
              {ring}
            </textPath>
          </text>
        </svg>
      </span>
      <svg viewBox="0 0 24 24" className={styles.sealHeart}>
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 3 1.5-1.9 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
      </svg>
    </div>
  );
}

/**
 * Lời yêu: two ribbons cross over the seam below the cover, each one carrying
 * the couple's names and day the opposite way.
 */
export function LetterRibbons({
  groom,
  bride,
  date,
}: {
  groom: string;
  bride: string;
  date: Date;
}) {
  const phrase = (
    <span className={styles.ribbonPhrase}>
      <span className={styles.ribbonNames}>
        {groom} <i>♡</i> {bride}
      </span>
      <span>{dateLabel(date).replaceAll("/", " . ")}</span>
      <span>CHÚNG MÌNH KẾT HÔN</span>
    </span>
  );
  // Eight phrases keep each band full across its whole scroll travel.
  const band = (variant: string) => (
    <div className={`${styles.ribbon} ${styles[variant]}`}>
      <div className={styles.ribbonTrack}>
        {Array.from({ length: 8 }, (_, i) => (
          <Fragment key={i}>{phrase}</Fragment>
        ))}
      </div>
    </div>
  );
  return (
    <div className={`letter-ribbons ${styles.ribbons}`} aria-hidden="true">
      {band("ribbonDeep")}
      {band("ribbonLight")}
    </div>
  );
}
