import type { Metadata } from "next";
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
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
