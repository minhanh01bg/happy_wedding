import type { CSSProperties } from "react";
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
  const names = (
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
