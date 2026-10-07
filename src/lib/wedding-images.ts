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

/** Resolve bundled demonstration photos without changing uploaded images. */
export function weddingImageSource(source: string): string {
  if (source === "/images/couple.jpg")
    return "/images/wedding-couple-studio.jpg";
  if (source === "/images/celebration.jpg")
    return "/images/wedding-couple-moment.jpg";
  return source;
}
