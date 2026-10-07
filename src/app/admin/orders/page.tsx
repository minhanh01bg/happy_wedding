import Link from "next/link";
import { DropdownField } from "@/components/kit/dropdown-field";
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
      <form className="panel inline-actions admin-filter">
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
          <DropdownField
            key={status || "all"}
            aria-label="Trạng thái"
            name="status"
            placeholder="Tất cả trạng thái"
            defaultValue={status || ""}
            options={[
              { value: "", label: "Tất cả trạng thái" },
              ...["pending", "paid", "cancelled"].map((value) => ({
                value,
                label: STATUS_LABELS[value],
              })),
            ]}
          />
        </label>
        <div className="admin-filter-actions">
          <button type="submit">Lọc đơn</button>
          {(q || status) && (
            <Link href="/admin/orders" className="button secondary">
              Xóa bộ lọc
            </Link>
          )}
        </div>
      </form>
      <section className="panel data-table-wrap">
        <table className="data-table admin-card-table">
          <caption className="sr-only">Danh sách đơn dịch vụ</caption>
          <thead>
            <tr>
              <th scope="col">Mã đơn</th>
              <th scope="col">Khách hàng</th>
              <th scope="col">Thiệp</th>
              <th scope="col">Gói</th>
              <th scope="col">Tổng tiền</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td data-label="Mã đơn">
                  <div className="admin-cell-value">
                    {o.code}
                    <p>{dateLabel(o.createdAt, true)}</p>
                  </div>
                </td>
                <td data-label="Khách hàng">
                  <div className="admin-cell-value">
                    {o.account.displayName}
                    <p>{o.account.phoneNormalized}</p>
                  </div>
                </td>
                <td data-label="Thiệp">
                  <div className="admin-cell-value">
                    {o.invitation.groom} & {o.invitation.bride}
                  </div>
                </td>
                <td data-label="Gói">
                  <div className="admin-cell-value">
                    {o.planName}
                    {o.paymentNote && <p>Đã báo chuyển khoản</p>}
                  </div>
                </td>
                <td data-label="Tổng tiền">
                  <div className="admin-cell-value">{money(o.total)}</div>
                </td>
                <td data-label="Trạng thái">
                  <div className="admin-cell-value">
                    <span className={`badge ${o.status}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>
                </td>
                <td data-label="Thao tác">
                  <div className="admin-cell-value">
                    <Link
                      className="button secondary small"
                      href={`/admin/orders/${o.id}`}
                    >
                      Kiểm tra đơn
                    </Link>
                  </div>
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
