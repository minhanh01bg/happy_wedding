import type { Metadata } from "next";
import localFont from "next/font/local";

const bodyFont = localFont({
  src: [
    {
      path: "./fonts/BeVietnamPro-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/BeVietnamPro-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/BeVietnamPro-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    { path: "./fonts/BeVietnamPro-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
const headingFont = localFont({
  src: [
    { path: "./fonts/Lora.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/Lora-Italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-heading",
  display: "swap",
  fallback: ["Georgia", "serif"],
});
import "./globals.css";

export const metadata: Metadata = {
  metadataBase:
    URL.parse(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3200") ||
    undefined,
  title: {
    default: "Hỷ Studio — Thiệp cưới kể câu chuyện của bạn",
    template: "%s | Hỷ Studio",
  },
  description:
    "Tạo thiệp cưới online, chia sẻ lời mời riêng và quản lý khách tham dự. Một khởi đầu đẹp cho ngày chung đôi.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`${bodyFont.variable} ${headingFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
