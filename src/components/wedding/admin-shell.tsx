"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  PanelsTopLeft,
  Package,
  Heart,
  Users,
  Settings,
  History,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Brand } from "./shell";
import { Logout } from "./actions";

const items = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Đơn dịch vụ", icon: ClipboardList },
  { href: "/admin/templates", label: "Mẫu thiệp", icon: PanelsTopLeft },
  { href: "/admin/plans", label: "Gói dịch vụ", icon: Package },
  { href: "/admin/invitations", label: "Thiệp khách hàng", icon: Heart },
  { href: "/admin/customers", label: "Khách hàng", icon: Users },
  { href: "/admin/settings", label: "Cấu hình", icon: Settings },
  { href: "/admin/audit", label: "Nhật ký", icon: History },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const current = items.find((item) =>
    item.href === "/admin"
      ? pathname === item.href
      : pathname.startsWith(item.href + "/") || pathname === item.href,
  );
  useEffect(() => {
    const desktop = matchMedia("(min-width: 901px)");
    const close = () => {
      if (desktop.matches) drawer.current?.close();
    };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  const links = (mobile = false) => (
    <nav className="admin-side-nav" aria-label="Quản trị">
      <p className="admin-nav-label">KHÔNG GIAN QUẢN TRỊ</p>
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={current?.href === href ? "page" : undefined}
          onClick={() => {
            if (mobile) drawer.current?.close();
          }}
        >
          <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="admin-shell">
      <a href="#admin-content" className="admin-skip-link">
        Đi đến nội dung quản trị
      </a>
      <aside className="admin-sidebar">
        <Brand />
        {links()}
        <div className="admin-sidebar-foot">
          <p>Hỷ Studio</p>
          <span>Chăm chút từng ngày vui.</span>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <button
              ref={menu}
              className="admin-menu-button secondary"
              type="button"
              aria-label="Mở menu quản trị"
              aria-haspopup="dialog"
              onClick={() => drawer.current?.showModal()}
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <span>{current?.label || "Quản trị"}</span>
          </div>
          <div className="admin-topbar-actions">
            <Link href="/" className="admin-website-link">
              Xem website <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Logout admin />
          </div>
        </header>
        <main
          id="admin-content"
          className="workspace admin-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      <dialog
        ref={drawer}
        className="admin-drawer"
        aria-labelledby="admin-menu-title"
        onClick={(event) => {
          if (
            event.target === event.currentTarget &&
            event.clientX > event.currentTarget.getBoundingClientRect().right
          )
            drawer.current?.close();
        }}
        onClose={() => menu.current?.focus({ preventScroll: true })}
      >
        <div className="admin-drawer-heading">
          <h2 id="admin-menu-title">Quản trị</h2>
          <button
            className="secondary admin-menu-button"
            type="button"
            aria-label="Đóng menu quản trị"
            onClick={() => drawer.current?.close()}
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {links(true)}
      </dialog>
    </div>
  );
}
