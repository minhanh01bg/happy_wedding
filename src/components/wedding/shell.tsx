import Link from "next/link";
import { ArrowUpRight, Heart } from "lucide-react";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Hỷ Studio — Trang chủ">
      <span className="brand-mark">
        <Heart size={18} strokeWidth={1.3} />
      </span>
      hỷ<span className="brand-small">STUDIO</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Điều hướng chính">
        <Link href="/templates">Bộ sưu tập</Link>
        <Link href="/pricing">Gói dịch vụ</Link>
        <Link href="/w/thiep-mau">Thiệp mẫu</Link>
      </nav>
      <Link className="button small" href="/dashboard">
        Thiệp của tôi <ArrowUpRight size={16} />
      </Link>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Brand />
        <p>Một lời mời đẹp. Một kỷ niệm dài lâu.</p>
      </div>
      <div>
        <Link href="/templates">Bộ sưu tập</Link>
        <Link href="/pricing">Gói dịch vụ</Link>
        <Link href="/support">Hướng dẫn & hỗ trợ</Link>
        <Link href="/policies">Điều khoản & quyền riêng tư</Link>
        <Link href="/login">Quản trị</Link>
      </div>
      <p className="fine">
        © {new Date().getFullYear()} Hỷ Studio · Được chăm chút tại Việt Nam.
      </p>
    </footer>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-title">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
