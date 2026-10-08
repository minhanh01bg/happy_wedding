import Link from "next/link";
import { invitationDesign } from "@/lib/invitation-designs";
import Image from "next/image";
import { weddingImageSource } from "@/lib/wedding-images";
import { ArrowUpRight } from "lucide-react";
import type { WeddingTemplate } from "@prisma/client";

export function Botanical({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`botanical ${className}`}
      aria-hidden="true"
      viewBox="0 0 160 200"
      fill="none"
    >
      <path
        d="M25 195C43 135 79 79 124 18M69 116C44 107 31 86 29 70c30 0 44 19 40 46ZM85 92c-2-27 13-44 35-51 2 28-10 45-35 51ZM49 154c-22-1-35-12-41-31 27-4 44 6 41 31ZM109 50c-6-17-3-31 7-45 13 19 11 32-7 45Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="M70 116c8-23 28-35 52-29-10 25-28 35-52 29ZM45 157c16-14 32-14 51-4-17 16-36 16-51 4Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}
export function TemplateArtwork({
  template,
  large = false,
}: {
  template: Pick<WeddingTemplate, "palette" | "layout">;
  large?: boolean;
}) {
  const design = invitationDesign(template);
  return (
    <div
      className={`template-art palette-${template.palette} layout-${template.layout} design-${design.key} ${large ? "large" : ""}`}
    >
      {design.artPhoto && (
        <Image
          src={weddingImageSource("/images/couple.jpg")}
          alt=""
          fill
          sizes="(max-width:800px) 90vw, 440px"
          className="art-photo"
        />
      )}
      <Botanical className="branch-left" />
      <Botanical className="branch-right" />
      <div className="art-border">
        <span className="art-kicker">CHÚNG MÌNH KẾT HÔN</span>
        <span className="art-symbol">{design.motif}</span>
        <span className="art-names">
          Minh Anh<span>&</span>Ngọc Hà
        </span>
        <span className="art-line" />
        <span className="art-date">14 . 02 . 2027</span>
        <span className="art-footer">Trân trọng kính mời</span>
      </div>
    </div>
  );
}
export function TemplateCard({ template }: { template: WeddingTemplate }) {
  return (
    <article className="template-card">
      <Link
        className="template-image"
        href={`/templates/${template.slug}`}
        aria-label={`Xem mẫu ${template.name}`}
      >
        <TemplateArtwork template={template} />
        {template.premium && <span className="premium-badge">Cao cấp</span>}
        <span className="template-hover">
          Khám phá mẫu <ArrowUpRight size={18} />
        </span>
      </Link>
      <div className="template-caption">
        <div>
          <span className="fine">{template.category}</span>
          <h3>
            <Link href={`/templates/${template.slug}`}>{template.name}</Link>
          </h3>
        </div>
        <Link
          className="circle-link"
          href={`/templates/${template.slug}`}
          aria-label={`Chi tiết ${template.name}`}
        >
          <ArrowUpRight size={20} />
        </Link>
      </div>
      <Link
        className="template-preview-link text-link"
        href={`/preview/${template.slug}`}
        aria-label={`Xem thiệp đầy đủ ${template.name}`}
      >
        Xem thiệp đầy đủ <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
