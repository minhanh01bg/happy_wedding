export const DEMO_PHOTOS = [
  "/images/wedding-couple-studio.jpg",
  "/images/wedding-couple-highfive.jpg",
  "/images/wedding-couple-moment.jpg",
  "/images/wedding-couple-traditional.jpg",
  "/images/wedding-couple-riverside.jpg",
  "/images/wedding-couple-journey.jpg",
];

/** Upgrade only the original stock album on old demonstration invitations. */
export function demonstrationPhotos(
  photos: string[],
  isDemo: boolean,
): string[] {
  const legacy = [
    "/images/couple.jpg",
    "/images/flowers.jpg",
    "/images/celebration.jpg",
  ];
  return isDemo &&
    photos.length === legacy.length &&
    photos.every((photo, index) => photo === legacy[index])
    ? DEMO_PHOTOS
    : photos;
}

/** Cover each look shows on a demonstration invitation that kept the stock cover. */
const DEMO_COVERS: Record<string, string> = {
  "song-hy": "/images/wedding-couple-traditional.jpg",
  "ngay-chung-doi": "/images/wedding-couple-riverside.jpg",
  "nang-thu": "/images/wedding-couple-riverside.jpg",
  "loi-hen": "/images/wedding-couple-journey.jpg",
  "thu-tinh": "/images/wedding-couple-highfive.jpg",
  "khoanh-khac": "/images/wedding-couple-moment.jpg",
};

/**
 * The cover photo of the invitation hero, before `weddingImageSource`. The
 * link preview (og:image) uses the same pick, so the shared card matches the
 * page.
 */
export function heroCover(
  invitation: { isDemo: boolean; coverUrl: string },
  design: string,
  photos: string[],
): string {
  return invitation.isDemo &&
    invitation.coverUrl === "/images/couple.jpg" &&
    photos.includes(DEMO_COVERS[design])
    ? DEMO_COVERS[design]
    : invitation.coverUrl;
}

/** Resolve bundled demonstration photos without changing uploaded images. */
export function weddingImageSource(source: string): string {
  if (source === "/images/couple.jpg")
    return "/images/wedding-couple-studio.jpg";
  if (source === "/images/celebration.jpg")
    return "/images/wedding-couple-moment.jpg";
  return source;
}
