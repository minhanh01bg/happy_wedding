import Link from "next/link";
import { DropdownField } from "@/components/kit/dropdown-field";
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
      <form className="panel inline-actions admin-filter">
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
          <DropdownField
            key={status}
            aria-label="Trạng thái tài khoản"
            name="status"
            defaultValue={status}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Hoạt động" },
              { value: "disabled", label: "Đã khóa" },
            ]}
          />
        </label>
        <button type="submit">Tìm kiếm</button>
      </form>
      <section className="panel data-table-wrap">
        <table className="data-table admin-card-table">
          <thead>
            <tr>
              <th scope="col">Khách hàng</th>
              <th scope="col">Điện thoại</th>
              <th scope="col">Thiệp / đơn</th>
              <th scope="col">Gói đã thanh toán</th>
              <th scope="col">Ngày tạo</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td data-label="Khách hàng">
                  <div className="admin-cell-value">{c.displayName}</div>
                </td>
                <td data-label="Điện thoại">
                  <div className="admin-cell-value">{c.phoneNormalized}</div>
                </td>
                <td data-label="Thiệp / đơn">
                  <div className="admin-cell-value">
                    {c._count.invitations} thiệp / {c._count.serviceOrders} đơn
                  </div>
                </td>
                <td data-label="Gói đã thanh toán">
                  <div className="admin-cell-value">
                    {paidByCustomer.get(c.id)?._count.id || 0} đơn
                    <p>{money(paidByCustomer.get(c.id)?._sum.total || 0)}</p>
                  </div>
                </td>
                <td data-label="Ngày tạo">
                  <div className="admin-cell-value">
                    {dateLabel(c.createdAt)}
                  </div>
                </td>
                <td data-label="Trạng thái">
                  <div className="admin-cell-value">
                    <span
                      className={`badge ${c.disabledAt ? "suspended" : "published"}`}
                    >
                      {c.disabledAt ? "Đã khóa" : "Hoạt động"}
                    </span>
                  </div>
                </td>
                <td data-label="Thao tác">
                  <div className="admin-cell-value">
                    <MutationButton
                      endpoint="admin/customer-status"
                      data={{ id: c.id, disabled: !c.disabledAt }}
                    >
                      {c.disabledAt ? "Mở tài khoản" : "Khóa tài khoản"}
                    </MutationButton>
                  </div>
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
