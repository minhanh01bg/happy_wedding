import localFont from "next/font/local";

/*
 * Letter fonts for invitation designs. They are not preloaded: the browser
 * fetches a face only when a design's CSS uses it, so other templates pay
 * nothing.
 */
export const scriptFont = localFont({
  src: "../../app/fonts/Ephesis-Regular.woff2",
  variable: "--font-script",
  display: "swap",
  preload: false,
  fallback: ["cursive"],
  adjustFontFallback: false,
});
export const displayFont = localFont({
  src: [
    {
      path: "../../app/fonts/CormorantGaramond.woff2",
      weight: "300 700",
      style: "normal",
    },
    {
      path: "../../app/fonts/CormorantGaramond-Italic.woff2",
      weight: "300 700",
      style: "italic",
    },
  ],
  variable: "--font-display",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});
