import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { MutationButton } from "@/components/wedding/actions";
import { dateLabel, money } from "@/lib/wedding";
export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const query = await searchParams;
  const q = (query.q || "").slice(0, 100);
  const page = Math.max(1, Math.min(1000, Math.floor(Number(query.page) || 1)));
  const status = ["active", "disabled"].includes(query.status || "")
    ? query.status!
    : "all";
  const base = { phoneNormalized: { not: "+84000000000" } };
  const where = {
    ...(status === "active"
      ? { disabledAt: null }
      : status === "disabled"
        ? { disabledAt: { not: null } }
        : {}),
    phoneNormalized: { not: "+84000000000" },
    ...(q
      ? {
          OR: [
            { displayName: { contains: q } },
            { phoneNormalized: { contains: q } },
          ],
        }
      : {}),
  };
  const [customers, count, total, active] = await Promise.all([
    prisma.customerAccount.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        phoneNormalized: true,
        createdAt: true,
        disabledAt: true,
        _count: { select: { invitations: true, serviceOrders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
    prisma.customerAccount.count({ where }),
    prisma.customerAccount.count({ where: base }),
    prisma.customerAccount.count({ where: { ...base, disabledAt: null } }),
  ]);
  const paid = await prisma.serviceOrder.groupBy({
    by: ["accountId"],
    where: {
      accountId: { in: customers.map((customer) => customer.id) },
      status: "paid",
      invitation: { isDemo: false },
    },
    _count: { id: true },
    _sum: { total: true },
  });
  const paidByCustomer = new Map(paid.map((row) => [row.accountId, row]));
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">KHÁCH HÀNG</p>
          <h1>Tài khoản & hoạt động</h1>
          <p>{count} tài khoản phù hợp</p>
        </div>
      </div>
      <div className="stats-grid">
        {[
          ["Tổng tài khoản", total],
          ["Đang hoạt động", active],
          ["Đã khóa", total - active],
          ["Phù hợp bộ lọc", count],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <form className="panel inline-actions">
        <label>
          Tìm khách
          <input
            name="q"
            defaultValue={q}
            placeholder="Tên hoặc số điện thoại"
          />
        </label>
        <label>
          Trạng thái tài khoản
          <select name="status" defaultValue={status}>
            <option value="all">Tất cả</option>
            <option value="active">Hoạt động</option>
            <option value="disabled">Đã khóa</option>
          </select>
        </label>
        <button type="submit">Tìm kiếm</button>
      </form>
      <section className="panel data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Điện thoại</th>
              <th>Thiệp / đơn</th>
              <th>Gói đã thanh toán</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.displayName}</td>
                <td>{c.phoneNormalized}</td>
                <td>
                  {c._count.invitations} thiệp / {c._count.serviceOrders} đơn
                </td>
                <td>
                  {paidByCustomer.get(c.id)?._count.id || 0} đơn
                  <p>{money(paidByCustomer.get(c.id)?._sum.total || 0)}</p>
                </td>
                <td>{dateLabel(c.createdAt)}</td>
                <td>
                  <span
                    className={`badge ${c.disabledAt ? "suspended" : "published"}`}
                  >
                    {c.disabledAt ? "Đã khóa" : "Hoạt động"}
                  </span>
                </td>
                <td>
                  <MutationButton
                    endpoint="admin/customer-status"
                    data={{ id: c.id, disabled: !c.disabledAt }}
                  >
                    {c.disabledAt ? "Mở tài khoản" : "Khóa tài khoản"}
                  </MutationButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && (
          <p className="notice">
            Không có tài khoản phù hợp. Hãy thử đổi tên, số điện thoại hoặc
            trạng thái.
          </p>
        )}
        <p className="fine" style={{ marginTop: 20 }}>
          Khóa tài khoản thu hồi phiên đăng nhập và ngừng truy cập công khai các
          thiệp của khách.
        </p>
        <div className="pagination">
          <span>Trang {page}</span>
          <div className="inline-actions">
            {page > 1 && (
              <Link
                href={`?q=${encodeURIComponent(q)}&status=${status}&page=${page - 1}`}
              >
                ← Trước
              </Link>
            )}
            {page * 30 < count && (
              <Link
                href={`?q=${encodeURIComponent(q)}&status=${status}&page=${page + 1}`}
              >
                Sau →
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
