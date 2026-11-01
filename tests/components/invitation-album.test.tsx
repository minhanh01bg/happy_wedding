import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { InvitationAlbum } from "@/components/wedding/invitation-album";
import { DEMO_PHOTOS } from "@/lib/wedding-images";

const DESIGNS = [
  "loi-yeu",
  "vuon-thuong",
  "song-hy",
  "ngay-chung-doi",
  "dem-sao",
  "nang-thu",
  "loi-hen",
  "thu-tinh",
  "khoanh-khac",
  "ben-nhau",
];

/* Nhãn trang trí trên từng ảnh trong album (nút ảnh mới là chỗ chạm). */
function labels(design: string) {
  const { container } = render(
    <InvitationAlbum
      photos={DEMO_PHOTOS}
      couple="Minh & Hoa"
      design={design}
    />,
  );
  return [
    ...container.querySelectorAll<HTMLElement>("[data-album-photo] > span"),
  ];
}

describe("nhãn Xem ảnh trên album", () => {
  it("draws the arrow as an SVG icon, never the ↗ that iOS turns into an emoji", () => {
    const spans = labels("loi-yeu");
    expect(spans).toHaveLength(DEMO_PHOTOS.length);
    spans.forEach((span, index) => {
      expect(span).toHaveAttribute("aria-hidden", "true");
      expect(span.querySelector("b")).toHaveTextContent(
        String(index + 1).padStart(2, "0"),
      );
      expect(span.querySelector(".album-photo-cta")).toHaveTextContent(
        "Xem ảnh",
      );
      expect(span.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(span.textContent).not.toContain("↗");
    });
  });

  it("keeps Nắng thu's handwritten caption without an arrow", () => {
    labels("nang-thu").forEach((span) => {
      expect(span).toHaveTextContent("Một ngày thật đẹp ♡");
      expect(span.querySelector("svg, .album-photo-cta")).toBeNull();
    });
  });

  it("has no ↗ in any design's album", () => {
    for (const design of DESIGNS) {
      const { container, unmount } = render(
        <InvitationAlbum
          photos={DEMO_PHOTOS}
          couple="Minh & Hoa"
          design={design}
        />,
      );
      expect(container.textContent, design).not.toContain("↗");
      unmount();
    }
  });
});
