import { prisma } from "@/server/db/prisma";
import { TemplateArtwork } from "@/components/wedding/template-card";
import { AdminRecordForm } from "@/components/wedding/admin-form";
export default async function AdminTemplates() {
  const templates = await prisma.weddingTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">BỘ SƯU TẬP</p>
          <h1>Quản lý mẫu thiệp</h1>
          <p>Năm bố cục, sáu phối màu. Tạo biến thể và quản lý mẫu đang bán.</p>
        </div>
      </div>
      <section className="panel">
        <details>
          <summary className="admin-add-summary">+ Thêm mẫu mới</summary>
          <div style={{ marginTop: 25 }}>
            <AdminRecordForm kind="templates" />
          </div>
        </details>
      </section>
      <div className="invitation-grid">
        {templates.map((t) => (
          <article className="invitation-tile" key={t.id}>
            <div className="tile-art">
              <TemplateArtwork template={t} />
            </div>
            <div className="tile-body">
              <h2>{t.name}</h2>
              <p>
                {t.category} · {t.premium ? "Cao cấp" : "Essential"} ·{" "}
                {t.active ? "Đang cung cấp" : "Đã ngừng"}
              </p>
              <details className="admin-editor">
                <summary>Chỉnh sửa mẫu</summary>
                <AdminRecordForm
                  kind="templates"
                  initial={{
                    id: t.id,
                    name: t.name,
                    slug: t.slug,
                    category: t.category,
                    description: t.description,
                    palette: t.palette,
                    layout: t.layout,
                    premium: t.premium,
                    active: t.active,
                    sortOrder: t.sortOrder,
                  }}
                />
              </details>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
