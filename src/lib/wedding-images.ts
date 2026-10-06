/** Resolve bundled demonstration photos without changing uploaded images. */
export function weddingImageSource(source: string): string {
  if (source === "/images/couple.jpg")
    return "/images/wedding-couple-studio.jpg";
  if (source === "/images/celebration.jpg")
    return "/images/wedding-couple-moment.jpg";
  return source;
}
