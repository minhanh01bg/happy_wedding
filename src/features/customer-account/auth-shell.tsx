import {
  ArrowRight,
  Heart,
  PackageCheck,
  ShieldCheck,
  ShoppingBasket,
  Store,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/shared/theme-toggle";

export function CustomerAuthShell({
  storeName,
  mode,
  children,
}: {
  storeName: string;
  mode: "login" | "register";
  children: ReactNode;
}) {
  return (
    <main className="bg-muted/30 min-h-dvh">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 sm:px-6">
        <Link
          href="/shop"
          className="font-heading flex min-h-11 min-w-0 items-center gap-2 text-lg font-bold"
        >
          <Store aria-hidden="true" className="text-primary size-6 shrink-0" />
          <span className="max-w-44 truncate sm:max-w-xs">{storeName}</span>
        </Link>
        <ThemeToggle />
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 pb-8 sm:px-6 sm:pb-12 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pt-5">
        <section className="bg-card border-border order-1 min-w-0 rounded-3xl border p-6 shadow-sm sm:p-10 lg:order-2 lg:p-12">
          <p className="text-primary mb-3 text-xs font-bold tracking-widest uppercase">
            Tài khoản của bạn
          </p>
          <h1 className="font-heading text-3xl leading-tight font-bold text-balance">
            {mode === "login" ? "Đăng nhập khách hàng" : "Tạo tài khoản"}
          </h1>
          <p className="text-muted-foreground mt-3 mb-8 text-sm leading-relaxed">
            {mode === "login"
              ? "Chào mừng bạn trở lại! Đăng nhập để theo dõi đơn hàng và tiếp tục mua sắm."
              : "Tạo tài khoản để quản lý đơn hàng và lưu những sản phẩm bạn yêu thích."}
          </p>
          {children}
          <div className="border-border mt-6 border-t pt-4 text-center">
            <Link
              href="/login?next=%2Fadmin"
              className="text-muted-foreground hover:text-primary focus-visible:ring-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <ShieldCheck aria-hidden="true" className="size-4" /> Đăng nhập
              quản trị
            </Link>
          </div>
        </section>
        <aside
          aria-label="Khám phá cửa hàng"
          className="bg-primary text-primary-foreground relative order-2 flex min-w-0 flex-col justify-between overflow-hidden rounded-3xl p-6 sm:p-10 lg:order-1 lg:p-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full border-[40px] border-white/5"
          />
          <div className="relative">
            <p className="mb-4 text-xs font-bold tracking-widest uppercase">
              Mua sắm cùng {storeName}
            </p>
            <h2 className="font-heading max-w-sm text-3xl leading-tight font-bold text-balance sm:text-4xl">
              Những món cần thiết, ngay trong tầm tay.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Khám phá sản phẩm, chọn món cho hôm nay và đặt hàng ngay tại cửa
              hàng trực tuyến.
            </p>
            <Link
              href="/shop"
              className="text-foreground focus-visible:ring-ring bg-background hover:bg-muted mt-6 inline-flex min-h-12 items-center gap-3 rounded-xl px-5 text-sm font-bold shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Khám phá sản phẩm{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div
            aria-hidden="true"
            className="relative my-8 hidden items-center justify-center sm:flex"
          >
            <div className="absolute size-56 rounded-full border border-white/15" />
            <div className="flex size-44 items-center justify-center rounded-[2.5rem] border border-white/20 bg-white/10 shadow-xl">
              <ShoppingBasket className="size-28" strokeWidth={1.2} />
            </div>
            <span className="absolute top-0 right-5 flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <Heart className="size-6" />
            </span>
            <span className="absolute bottom-0 left-5 flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <PackageCheck className="size-6" />
            </span>
          </div>
          <div className="relative mt-8 grid grid-cols-1 gap-4 border-t border-white/20 pt-6 sm:grid-cols-2 lg:mt-0">
            <div className="flex items-start gap-3">
              <PackageCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <div>
                <p className="text-sm font-bold">Theo dõi đơn hàng</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Xem lại các đơn trong tài khoản.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Heart aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Lưu món yêu thích</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Dễ dàng tìm lại khi cần mua.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
