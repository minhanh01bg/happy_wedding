import Link from "next/link";
import { Check } from "lucide-react";
import type { ServicePlan } from "@prisma/client";
import { money } from "@/lib/wedding";
export function PlanCards({ plans }: { plans: ServicePlan[] }) {
  return (
    <div className="pricing-grid">
      {plans.map((p, i) => (
        <article
          key={p.id}
          className={`price-card ${i === 1 ? "featured" : ""}`}
        >
          {i === 1 && (
            <span className="price-ribbon">CHO NGÀY VUI TRỌN VẸN</span>
          )}
          <p className="eyebrow">
            0{i + 1} / {p.months} THÁNG
          </p>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <div className="price">
            {money(p.price)}
            <span>/ thiệp</span>
          </div>
          <Link
            className={`button ${i !== 1 ? "secondary" : ""}`}
            href={`/dashboard/new?plan=${p.id}`}
          >
            Chọn gói {p.name}
          </Link>
          <ul className="feature-list">
            {[
              `${p.maxPhotos} ảnh trong album`,
              `Lưu thiệp ${p.months} tháng từ khi kích hoạt`,
              p.premiumTemplates
                ? "Sử dụng tất cả mẫu cao cấp"
                : "Các mẫu cơ bản",
              "RSVP, lời chúc, tiệc hai nhà",
              "Tối đa 2.000 lời mời cá nhân",
              "Xuất danh sách khách CSV",
              p.removeBranding
                ? "Ẩn thương hiệu Hỷ Studio"
                : "Dấu thương hiệu Hỷ Studio",
            ].map((s) => (
              <li key={s}>
                <Check size={16} />
                {s}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
