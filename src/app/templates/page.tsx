import { Header, Footer } from "@/components/wedding/shell";
import { TemplateCatalog } from "@/components/wedding/template-catalog";
import { prisma } from "@/server/db/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Bộ sưu tập thiệp cưới" };
export default async function Templates() {
  const templates = await prisma.weddingTemplate.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <Header />
      <main className="section">
        <div className="page-intro">
          <p className="eyebrow">BỘ SƯU TẬP</p>
          <h1>
            Tìm một tấm thiệp
            <br />
            giống <em>hai bạn.</em>
          </h1>
          <p>
            Một chút dịu dàng, một chút riêng tư. Chọn nét đẹp bạn muốn gửi đi.
          </p>
        </div>
        <TemplateCatalog templates={templates} />
      </main>
      <Footer />
    </>
  );
}
