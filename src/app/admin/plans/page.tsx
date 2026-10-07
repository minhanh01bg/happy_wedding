import { prisma } from "@/server/db/prisma";
import { AdminRecordForm } from "@/components/wedding/admin-form";
import { money } from "@/lib/wedding";
export default async function Plans() {
  const plans = await prisma.servicePlan.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">BẢNG GIÁ DỊCH VỤ</p>
          <h1>Gói & quyền lợi</h1>
          <p>
            Thay đổi áp dụng cho đơn mới. Giá và quyền lợi trên đơn cũ được giữ
            nguyên.
          </p>
        </div>
      </div>
      <section className="panel">
        <details>
          <summary className="admin-add-summary">+ Thêm gói dịch vụ</summary>
          <div style={{ marginTop: 25 }}>
            <AdminRecordForm kind="plans" />
          </div>
        </details>
      </section>
      {plans.map((p) => (
        <section className="panel" key={p.id}>
          <h2>
            {p.name} · {money(p.price)}
          </h2>
          <p>
            {p.months} tháng · {p.maxPhotos} ảnh ·{" "}
            {p.active ? "Đang cung cấp" : "Đã ngừng"}
          </p>
          <details className="admin-editor">
            <summary>Chỉnh sửa gói</summary>
            <AdminRecordForm
              kind="plans"
              initial={{
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                months: p.months,
                maxPhotos: p.maxPhotos,
                premiumTemplates: p.premiumTemplates,
                removeBranding: p.removeBranding,
                active: p.active,
                sortOrder: p.sortOrder,
              }}
            />
          </details>
        </section>
      ))}
    </>
  );
}
