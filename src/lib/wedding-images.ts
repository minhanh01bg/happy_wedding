/** Version the bundled stock photo without changing customers' uploaded URLs. */
export function weddingImageSource(source: string): string {
  return source === "/images/couple.jpg"
    ? "/images/wedding-couple-forest.jpg"
    : source;
}
