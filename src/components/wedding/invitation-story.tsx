import Image from "next/image";
import { weddingImageSource } from "@/lib/wedding-images";
import type { Invitation } from "@prisma/client";

/**
 * `sizes` for one story print, matching its rendered width in globals.css.
 * The section spans the page inset clamp(20px, 6vw, 100px) a side: 88vw of
 * content up to 1666px. Lời yêu lays its prints in the first column of a
 * 1.1fr / 1fr grid (gap 80px, at most 1000px), padded 60px on the right; on
 * phones the prints are min(88vw, 450px) wide. The large print's 12px border
 * leaves the column minus 84px; the small one is 43% of the column less its
 * 8px border. Song hỷ's print sits in a 720px frame (its section bordered
 * 4px), Ngày chung đôi's lead takes 1.5fr of 1200px, Lời hẹn's spans up to
 * 1200px and Khoảnh khắc's fills the page; other prints stay inside 90vw on
 * phones and 600px above. As for the cover, these are guest-page widths; the
 * dashboard preview's .workspace is narrower, so there they only run large.
 */
function storyPhotoSizes(design: string, detail: boolean) {
  const shared = "(max-width:760px) 90vw, 600px";
  switch (design) {
    case "loi-yeu":
      return detail
        ? "(max-width:511px) calc(37.9vw - 16px), (max-width:760px) 178px, (max-width:1136px) calc(19.9vw - 34px), 192px"
        : "(max-width:511px) calc(88vw - 84px), (max-width:760px) 366px, (max-width:1136px) calc(46.1vw - 125px), 398px";
    case "song-hy":
      return "(max-width:827px) calc(88vw - 80px), 648px";
    case "ngay-chung-doi":
      return detail
        ? shared
        : "(max-width:760px) 88vw, (max-width:1364px) calc(52.8vw - 30px), 690px";
    case "loi-hen":
      return "(max-width:1364px) 88vw, 1200px";
    case "khoanh-khac":
      return detail
        ? "(max-width:760px) calc(100vw - 50px), calc(42vw - 40px)"
        : "100vw";
    default:
      return shared;
  }
}

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
        sizes={storyPhotoSizes(design, detail)}
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
                {design === "loi-yeu" && (
                  <span className="story-script" aria-hidden="true">
                    Thương
                  </span>
                )}
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
