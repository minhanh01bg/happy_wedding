import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { money, dateLabel } from "@/lib/wedding";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function AdminDashboard() {
  const [customers, invitations, pending, revenue, orders, templates] =
    await Promise.all([
      prisma.customerAccount.count({
        where: { phoneNormalized: { not: "+84000000000" } },
      }),
      prisma.invitation.count({ where: { isDemo: false } }),
      prisma.serviceOrder.count({ where: { status: "pending" } }),
      prisma.serviceOrder.aggregate({
        where: { status: "paid", invitation: { isDemo: false } },
        _sum: { total: true },
      }),
      prisma.serviceOrder.findMany({
        where: { invitation: { isDemo: false } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          account: { select: { displayName: true } },
          invitation: { select: { groom: true, bride: true } },
        },
      }),
      prisma.weddingTemplate.count({ where: { active: true } }),
    ]);
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">HỶ STUDIO / VẬN HÀNH</p>
          <h1>Một nơi để chăm sóc mọi lời mời.</h1>
          <p>
            {templates} mẫu đang bán · Dữ liệu thực, không gồm thiệp minh họa.
          </p>
        </div>
        <Link href="/admin/orders?status=pending" className="button small">
          Kiểm tra thanh toán
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <p>Khách hàng</p>
          <strong>{customers}</strong>
        </div>
        <div className="stat-card">
          <p>Thiệp đã tạo</p>
          <strong>{invitations}</strong>
        </div>
        <div className="stat-card">
          <p>Chờ thanh toán</p>
          <strong>{pending}</strong>
        </div>
        <div className="stat-card">
          <p>Doanh thu đã xác nhận</p>
          <strong style={{ fontSize: 27 }}>
            {money(revenue._sum.total || 0)}
          </strong>
        </div>
      </div>
      <section className="panel">
        <h2>Đơn dịch vụ gần đây</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Đơn</th>
                <th>Khách</th>
                <th>Thiệp</th>
                <th>Gói</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="muted-link" href={`/admin/orders/${o.id}`}>
                      {o.code}
                    </Link>
                    <p>{dateLabel(o.createdAt, true)}</p>
                  </td>
                  <td>{o.account.displayName}</td>
                  <td>
                    {o.invitation.groom} & {o.invitation.bride}
                  </td>
                  <td>{o.planName}</td>
                  <td>{money(o.total)}</td>
                  <td>
                    <span className={`badge ${o.status}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && (
            <p className="fine" style={{ padding: 25 }}>
              Chưa có đơn. Khách hàng tạo thiệp và chọn gói sẽ xuất hiện tại
              đây.
            </p>
          )}
        </div>
      </section>
      <div className="notice">
        Trước khi mở bán: cấu hình tài khoản nhận tiền và kênh hỗ trợ, xác nhận
        bảng giá và điều khoản dịch vụ. SePay là tích hợp tùy chọn được bật qua
        cấu hình máy chủ.
      </div>
    </>
  );
}
