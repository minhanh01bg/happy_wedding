import { ArrowRight, ArrowUpRight, Clock3, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import type { PublicStoreProfile } from "@/types/storefront";

export interface StoreFooterProps {
  profile: PublicStoreProfile;
}

const policyLinks = [
  { href: "/shop/delivery-policy", label: "Chính sách giao hàng" },
  { href: "/shop/payment-policy", label: "Chính sách thanh toán" },
  { href: "/shop/return-policy", label: "Chính sách đổi trả" },
  { href: "/shop/privacy", label: "Chính sách bảo mật" },
];

export function StoreFooter({ profile }: StoreFooterProps) {
  const phoneHref = profile.hotline
    ? `tel:${profile.hotline.replace(/[^\d+]/g, "")}`
    : null;
  const mapHref = profile.mapUrl?.startsWith("https://")
    ? profile.mapUrl
    : null;

  return (
    <footer className="bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 sm:pt-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 px-6 py-9 sm:px-10 sm:py-11 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl"
          />
          <div className="relative max-w-xl">
            <p className="text-xs font-bold tracking-[0.18em] text-emerald-200 uppercase">
              Luôn sẵn sàng đồng hành
            </p>
            <h2 className="font-heading mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Cần hỗ trợ khi mua sắm?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-50/85 sm:text-base">
              {phoneHref
                ? `Liên hệ ${profile.name} để được tư vấn và giải đáp nhanh chóng.`
                : `Khám phá sản phẩm và mua sắm thuận tiện cùng ${profile.name}.`}
            </p>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
            {phoneHref ? (
              <a
                href={phoneHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Phone className="size-4" aria-hidden="true" />
                Gọi ngay {profile.hotline}
              </a>
            ) : null}
            <Link
              href="/shop"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Mua sắm ngay <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-16">
          <div className="sm:col-span-2 lg:col-span-5">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-white">
              {profile.name}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
              Hàng thiết yếu cho mỗi ngày, chọn nhanh tại nhà. Chúng tôi luôn
              mong mang đến trải nghiệm mua sắm thuận tiện và tin cậy.
            </p>
          </div>

          <nav aria-label="Khám phá cửa hàng" className="lg:col-span-2">
            <h3 className="font-heading font-semibold text-white">Khám phá</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li>
                <Link
                  href="/shop"
                  className="transition-colors hover:text-white focus-visible:underline"
                >
                  Cửa hàng trực tuyến
                </Link>
              </li>
              <li>
                <Link
                  href="/shop#catalog"
                  className="transition-colors hover:text-white focus-visible:underline"
                >
                  Xem sản phẩm
                </Link>
              </li>
              <li>
                <Link
                  href="/login?next=%2Fadmin"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white focus-visible:underline"
                >
                  Đăng nhập quản trị
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Chính sách cửa hàng" className="lg:col-span-2">
            <h3 className="font-heading font-semibold text-white">
              Chính sách
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              {policyLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-white focus-visible:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h3 className="font-heading font-semibold text-white">
              Ghé thăm chúng tôi
            </h3>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              {profile.address ? (
                <p className="flex gap-3">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-emerald-300"
                    aria-hidden="true"
                  />
                  <span>{profile.address}</span>
                </p>
              ) : null}
              {profile.openingHours ? (
                <p className="flex gap-3">
                  <Clock3
                    className="mt-0.5 size-4 shrink-0 text-emerald-300"
                    aria-hidden="true"
                  />
                  <span>{profile.openingHours}</span>
                </p>
              ) : null}
              {mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-emerald-300 transition-colors hover:text-emerald-100 focus-visible:underline"
                >
                  Xem bản đồ & chỉ đường
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {profile.name}. Tất cả các quyền được
            bảo lưu.
          </p>
          <p>Đặt hàng thuận tiện · Mua sắm an tâm</p>
        </div>
      </div>
    </footer>
  );
}
