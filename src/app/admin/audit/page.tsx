import { prisma } from "@/server/db/prisma";
import { dateLabel } from "@/lib/wedding";
export default async function Audit() {
  const rows = await prisma.adminAuditEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { identity: { select: { username: true } } },
  });
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">DẤU VẾT VẬN HÀNH</p>
          <h1>Nhật ký quản trị</h1>
          <p>
            100 thao tác gần nhất, gồm xác nhận thanh toán và thay đổi cấu hình.
          </p>
        </div>
      </div>
      <section className="panel data-table-wrap">
        <table className="data-table admin-card-table">
          <thead>
            <tr>
              <th scope="col">Thời gian</th>
              <th scope="col">Người thực hiện</th>
              <th scope="col">Thao tác</th>
              <th scope="col">Đối tượng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Thời gian">
                  <div className="admin-cell-value">
                    {dateLabel(r.createdAt, true)}
                  </div>
                </td>
                <td data-label="Người thực hiện">
                  <div className="admin-cell-value">
                    {r.identity?.username || "Webhook hệ thống"}
                  </div>
                </td>
                <td data-label="Thao tác">
                  <div className="admin-cell-value">{r.action}</div>
                </td>
                <td data-label="Đối tượng">
                  <div className="admin-cell-value">
                    {r.entityType}
                    <p>{r.entityId}</p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="fine" style={{ padding: 25 }}>
            Chưa có thao tác quản trị.
          </p>
        )}
      </section>
    </>
  );
}
