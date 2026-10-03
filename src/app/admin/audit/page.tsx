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
        <table className="data-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người thực hiện</th>
              <th>Thao tác</th>
              <th>Đối tượng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{dateLabel(r.createdAt, true)}</td>
                <td>{r.identity?.username || "Webhook hệ thống"}</td>
                <td>{r.action}</td>
                <td>
                  {r.entityType}
                  <p>{r.entityId}</p>
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
