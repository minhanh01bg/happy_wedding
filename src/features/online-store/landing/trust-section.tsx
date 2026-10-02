import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Headphones,
  Store,
} from "lucide-react";

export interface TrustSectionProps {
  storeName?: string;
  hotline?: string;
}

export function TrustSection({
  storeName = "Cửa hàng",
  hotline,
}: TrustSectionProps) {
  const features = [
    {
      icon: CheckCircle2,
      title: "Cam kết chất lượng",
      description: "Hàng thiết yếu có nguồn gốc rõ ràng, kiểm duyệt kỹ lưỡng.",
    },
    {
      icon: DollarSign,
      title: "Giá niêm yết rõ ràng",
      description: "Đúng giá từ quầy POS, không phụ phí ẩn hay nâng giá ảo.",
    },
    {
      icon: Store,
      title: "Nhận hàng linh hoạt",
      description: "Giao tận nơi hoặc nhận trực tiếp tại cửa hàng.",
    },
    {
      icon: Headphones,
      title: "Hỗ trợ trực tiếp",
      description: hotline
        ? `${storeName} sẵn sàng hỗ trợ qua hotline ${hotline}.`
        : `${storeName} luôn sẵn sàng hỗ trợ quý khách chu đáo.`,
    },
  ];

  return (
    <section className="border-border relative overflow-hidden border-y bg-[linear-gradient(135deg,var(--primary)_0%,color-mix(in_oklab,var(--primary)_82%,black)_100%)] py-14 text-white sm:py-20">
      <div className="absolute -top-32 -right-24 size-80 rounded-full border border-white/10" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16">
        <div className="desktop-rise">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide uppercase">
            Tận tâm từ cửa hàng đến nhà bạn
          </span>
          <h2 className="font-heading mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl lg:leading-tight">
            Mua sắm an tâm cùng {storeName}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            Từ lúc chọn hàng đến khi nhận đơn, mọi thông tin đều minh bạch để
            bạn mua nhanh hơn và an tâm hơn mỗi ngày.
          </p>
          <Link
            href="#catalog"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-lg shadow-emerald-950/15 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-800 focus-visible:outline-none"
          >
            Bắt đầu mua sắm
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="desktop-stagger grid gap-3 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm transition-[background-color,transform] hover:-translate-y-1 hover:bg-white/15 sm:p-6"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-sm">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
