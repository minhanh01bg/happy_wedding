import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { MutationButton } from "@/components/wedding/actions";
import { dateLabel } from "@/lib/wedding";
export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const query = await searchParams;
  const q = (query.q || "").slice(0, 100);
  const page = Math.max(1, Math.min(1000, Math.floor(Number(query.page) || 1)));
  const where = {
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
  const [customers, count] = await Promise.all([
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
  ]);
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">KHÁCH HÀNG</p>
          <h1>Tài khoản & hoạt động</h1>
          <p>{count} tài khoản phù hợp</p>
        </div>
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
        <button type="submit">Tìm kiếm</button>
      </form>
      <section className="panel data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Điện thoại</th>
              <th>Thiệp / đơn</th>
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
        <p className="fine" style={{ marginTop: 20 }}>
          Khóa tài khoản thu hồi phiên đăng nhập và ngừng truy cập công khai các
          thiệp của khách.
        </p>
        <div className="pagination">
          <span>Trang {page}</span>
          <div className="inline-actions">
            {page > 1 && (
              <Link href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>
                ← Trước
              </Link>
            )}
            {page * 30 < count && (
              <Link href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>
                Sau →
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
