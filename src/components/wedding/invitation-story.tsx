import Image from "next/image";
import { weddingImageSource } from "@/lib/wedding-images";
import type { Invitation } from "@prisma/client";

/** Each composition uses the couple's actual text; decorative chapters never invent milestones. */
export function InvitationStory({
  invitation,
  design,
  photos,
}: {
  invitation: Invitation;
  design: string;
  photos: string[];
}) {
  const sources = [...new Set(photos.map(weddingImageSource))];
  const pair: Record<string, [number, number]> = {
    "vuon-thuong": [0, 4],
    "song-hy": [3, 5],
    "ngay-chung-doi": [1, 2],
    "dem-sao": [2, 5],
    "nang-thu": [4, 0],
    "loi-hen": [2, 4],
    "thu-tinh": [1, 0],
    "khoanh-khac": [5, 2],
    "ben-nhau": [4, 5],
  };
  const curated = invitation.isDemo ? pair[design] : undefined;
  const first =
    (curated && sources[curated[0]]) ||
    sources.find(
      (source) => source !== weddingImageSource(invitation.coverUrl),
    ) ||
    weddingImageSource(invitation.coverUrl);
  const second =
    (curated && sources[curated[1]] && sources[curated[1]] !== first
      ? sources[curated[1]]
      : undefined) || sources.find((source) => source !== first);
  const picture = (source: string, detail = false) => (
    <figure
      className={`invitation-story-image ${detail ? "story-secondary" : "story-primary"}`}
      data-story-image
    >
      <Image
        src={source}
        alt={
          detail
            ? `Kỷ niệm của ${invitation.groom} và ${invitation.bride}`
            : `${invitation.groom} và ${invitation.bride} — câu chuyện của chúng mình`
        }
        fill
        sizes="(max-width:760px) 90vw, 600px"
      />
      <figcaption>
        {detail
          ? "Những ngày bên nhau"
          : `${invitation.groom} & ${invitation.bride}`}
      </figcaption>
    </figure>
  );
  const words = (
    <div className="story-words">
      <span className="story-chapter" aria-hidden="true">
        01 / CHÚNG MÌNH
      </span>
      <blockquote>{invitation.headline}</blockquote>
      <p>{invitation.story}</p>
      <span className="story-signature">
        {invitation.groom} & {invitation.bride}
      </span>
    </div>
  );
  const families = (
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
  );
  const heading = (
    <header className="story-heading">
      <p className="eyebrow">CÂU CHUYỆN CỦA CHÚNG MÌNH</p>
      <h2>
        Một đời thương,
        <br />
        <em>một đời bên nhau.</em>
      </h2>
    </header>
  );
  const main = picture(first);
  const detail = second ? picture(second, true) : null;
  const content = (() => {
    switch (design) {
      case "vuon-thuong":
        return (
          <>
            {heading}
            <div className="story-garden">
              <div className="story-wreath">
                {main}
                <span aria-hidden="true">❦</span>
              </div>
              {words}
              <div className="story-garden-detail">
                {detail}
                {families}
              </div>
            </div>
          </>
        );
      case "song-hy":
        return (
          <>
            {heading}
            {families}
            <div className="story-ceremony">
              <span className="ceremony-seal" aria-hidden="true">
                囍
              </span>
              {main}
              {words}
            </div>
          </>
        );
      case "ngay-chung-doi":
        return (
          <>
            <div className="story-editorial-masthead">
              {heading}
              <span aria-hidden="true">CHUYÊN SAN NGÀY CƯỚI</span>
            </div>
            <div className="story-editorial-lead">
              {main}
              {words}
            </div>
            <div className="story-editorial-foot">
              {families}
              {detail}
            </div>
          </>
        );
      case "dem-sao":
        return (
          <>
            {heading}
            <div className="story-constellation">
              <span className="story-stars" aria-hidden="true">
                ✧ · ✦ · ✧
              </span>
              {words}
              <div className="story-moon">{main}</div>
              {detail}
            </div>
            {families}
          </>
        );
      case "nang-thu":
        return (
          <>
            {heading}
            <div className="story-journal">
              {main}
              <div className="journal-note">
                {words}
                <span aria-hidden="true">mình cùng nhau nhé ♡</span>
              </div>
              {detail}
            </div>
            {families}
          </>
        );
      case "loi-hen":
        return (
          <>
            <div className="story-minimal-letter">
              {heading}
              {words}
            </div>
            {main}
            <div className="story-minimal-foot">
              <span aria-hidden="true">&</span>
              {families}
            </div>
          </>
        );
      case "thu-tinh":
        return (
          <>
            {heading}
            <div className="story-envelope">
              <div className="story-letter-paper">
                {words}
                {families}
              </div>
              <div className="story-letter-prints">
                {main}
                {detail}
              </div>
            </div>
          </>
        );
      case "khoanh-khac":
        return (
          <>
            <div className="story-cinema-scene">
              {main}
              <div className="story-cinema-title">{heading}</div>
            </div>
            <div className="story-cinema-interlude">
              {words}
              {detail}
            </div>
            {families}
          </>
        );
      case "ben-nhau":
        return (
          <>
            {heading}
            <div className="story-diptych">
              {main}
              {detail}
              <span aria-hidden="true">BÊN NHAU</span>
            </div>
            <div className="story-diptych-note">
              {words}
              {families}
            </div>
          </>
        );
      default:
        return (
          <>
            {heading}
            <div className="story-romance">
              <div className="story-romance-prints">
                {main}
                {detail}
              </div>
              {words}
            </div>
            {families}
          </>
        );
    }
  })();
  return (
    <section
      className={`wedding-section wedding-story story-composition story-${design}`}
      data-story-composition={design}
    >
      {content}
    </section>
  );
}
