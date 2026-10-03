import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { requireCustomerSession } from "@/server/customer-auth/session";
import { money, dateLabel } from "@/lib/wedding";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireCustomerSession();
  const page = Math.max(
    1,
    Math.min(1000, Math.floor(Number((await searchParams).page) || 1)),
  );
  const [orders, count] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: { accountId: session.accountId },
      include: { invitation: { select: { groom: true, bride: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
    }),
    prisma.serviceOrder.count({ where: { accountId: session.accountId } }),
  ]);
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">LỊCH SỬ DỊCH VỤ</p>
          <h1>Đơn của bạn.</h1>
          <p>{count} đơn dịch vụ</p>
        </div>
      </div>
      <div className="panel data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Đơn</th>
              <th>Thiệp</th>
              <th>Gói</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.code}
                  <p>{dateLabel(o.createdAt)}</p>
                </td>
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
                <td>
                  <Link
                    className="button secondary small"
                    href={`/dashboard/orders/${o.id}`}
                  >
                    Xem đơn
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && (
          <p style={{ padding: 25 }} className="fine">
            Chưa có đơn dịch vụ. Tạo thiệp để chọn gói phù hợp.
          </p>
        )}
        <div className="pagination">
          <span>Trang {page}</span>
          <div className="inline-actions">
            {page > 1 && <Link href={`?page=${page - 1}`}>← Trước</Link>}
            {page * 30 < count && <Link href={`?page=${page + 1}`}>Sau →</Link>}
          </div>
        </div>
      </div>
    </>
  );
}
