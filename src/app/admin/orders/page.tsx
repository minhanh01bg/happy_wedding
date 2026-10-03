import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { money, dateLabel } from "@/lib/wedding";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const query = await searchParams;
  const status = ["pending", "paid", "cancelled"].includes(query.status || "")
    ? query.status
    : undefined;
  const q = (query.q || "").slice(0, 100);
  const page = Math.max(1, Math.min(1000, Math.floor(Number(query.page) || 1)));
  const where = {
    invitation: { isDemo: false },
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q } },
            { account: { displayName: { contains: q } } },
            { account: { phoneNormalized: { contains: q } } },
          ],
        }
      : {}),
  };
  const [rows, count] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      include: {
        account: { select: { displayName: true, phoneNormalized: true } },
        invitation: { select: { groom: true, bride: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
    prisma.serviceOrder.count({ where }),
  ]);
  const href = (p: number) =>
    `?${new URLSearchParams({ page: String(p), q, ...(status ? { status } : {}) })}`;
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">THANH TOÁN & KÍCH HOẠT</p>
          <h1>Đơn dịch vụ</h1>
          <p>{count} đơn phù hợp</p>
        </div>
      </div>
      <form className="panel inline-actions">
        <label>
          Tìm khách / mã đơn
          <input
            name="q"
            defaultValue={q}
            placeholder="Mã đơn, tên hoặc số điện thoại"
          />
        </label>
        <label>
          Trạng thái
          <select name="status" defaultValue={status || ""}>
            <option value="">Tất cả</option>
            {["pending", "paid", "cancelled"].map((s) => (
              <option value={s} key={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Lọc đơn</button>
      </form>
      <section className="panel data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Thiệp</th>
              <th>Gói</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.code}
                  <p>{dateLabel(o.createdAt, true)}</p>
                </td>
                <td>
                  {o.account.displayName}
                  <p>{o.account.phoneNormalized}</p>
                </td>
                <td>
                  {o.invitation.groom} & {o.invitation.bride}
                </td>
                <td>
                  {o.planName}
                  {o.paymentNote && <p>Đã báo chuyển khoản</p>}
                </td>
                <td>{money(o.total)}</td>
                <td>
                  <span className={`badge ${o.status}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td>
                  <Link
                    className="button secondary small"
                    href={`/admin/orders/${o.id}`}
                  >
                    Kiểm tra đơn
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="fine" style={{ padding: 25 }}>
            Không có đơn phù hợp.
          </p>
        )}
        <div className="pagination">
          <span>Trang {page}</span>
          <div className="inline-actions">
            {page > 1 && <Link href={href(page - 1)}>← Trước</Link>}
            {page * 30 < count && <Link href={href(page + 1)}>Sau →</Link>}
          </div>
        </div>
      </section>
    </>
  );
}
