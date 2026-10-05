import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ArrowUpRight } from "lucide-react";
import { Header, Footer } from "@/components/wedding/shell";
import { TemplateArtwork } from "@/components/wedding/template-card";
import { prisma } from "@/server/db/prisma";
export const dynamic = "force-dynamic";
export default async function TemplateDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const template = await prisma.weddingTemplate.findFirst({
    where: { slug: (await params).slug, active: true },
  });
  if (!template) notFound();
  return (
    <>
      <Header />
      <main className="section template-detail">
        <div>
          <TemplateArtwork template={template} large />
        </div>
        <div>
          <Link className="text-link" href="/templates">
            ← Bộ sưu tập
          </Link>
          <p className="eyebrow">
            {template.category} · {template.premium ? "CAO CẤP" : "CƠ BẢN"}
          </p>
          <h1>{template.name}</h1>
          <p>{template.description}</p>
          <ul className="feature-list">
            {[
              "Thông tin cô dâu, chú rể & gia đình",
              "Lịch tiệc hai nhà & chỉ đường",
              "Album ảnh & đếm ngược ngày cưới",
              "Xác nhận tham dự & lời chúc",
              "Lời mời cá nhân & danh sách khách",
              "Nhạc nền tùy chọn & QR mừng cưới",
            ].map((s) => (
              <li key={s}>
                <Check size={17} />
                {s}
              </li>
            ))}
          </ul>
          <Link
            href={`/dashboard/new?template=${template.id}`}
            className="button"
          >
            Tạo thiệp với mẫu này <ArrowUpRight size={18} />
          </Link>
          <Link className="button secondary" href={`/preview/${template.slug}`}>
            Xem thiệp đầy đủ
          </Link>
          <p className="fine">
            Tạo bản nháp miễn phí.{" "}
            {template.premium
              ? "Xuất bản với gói có quyền sử dụng mẫu cao cấp."
              : "Xuất bản với bất kỳ gói dịch vụ nào."}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
