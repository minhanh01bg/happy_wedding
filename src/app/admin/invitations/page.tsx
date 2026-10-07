import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { MutationButton } from "@/components/wedding/actions";
import { STATUS_LABELS } from "@/components/wedding/status";
import { dateLabel } from "@/lib/wedding";
export default async function Invitations({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const query = await searchParams;
  const q = (query.q || "").slice(0, 100);
  const page = Math.max(1, Math.min(1000, Math.floor(Number(query.page) || 1)));
  const where = {
    isDemo: false,
    ...(q
      ? {
          OR: [
            { groom: { contains: q } },
            { bride: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {}),
  };
  const [rows, count] = await Promise.all([
    prisma.invitation.findMany({
      where,
      include: {
        owner: { select: { displayName: true } },
        template: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      skip: (page - 1) * 30,
    }),
    prisma.invitation.count({ where }),
  ]);
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">NỘI DUNG KHÁCH HÀNG</p>
          <h1>Những tấm thiệp</h1>
          <p>{count} thiệp phù hợp</p>
        </div>
      </div>
      <form className="panel inline-actions admin-filter">
        <label>
          Tìm thiệp
          <input
            name="q"
            defaultValue={q}
            placeholder="Tên cô dâu, chú rể, đường dẫn"
          />
        </label>
        <button type="submit">Tìm kiếm</button>
      </form>
      <section className="panel data-table-wrap">
        <table className="data-table admin-card-table">
          <thead>
            <tr>
              <th scope="col">Cặp đôi</th>
              <th scope="col">Khách hàng</th>
              <th scope="col">Mẫu / ngày cưới</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td data-label="Cặp đôi">
                  <div className="admin-cell-value">
                    {i.groom} & {i.bride}
                    <p>/w/{i.slug}</p>
                  </div>
                </td>
                <td data-label="Khách hàng">
                  <div className="admin-cell-value">{i.owner.displayName}</div>
                </td>
                <td data-label="Mẫu / ngày cưới">
                  <div className="admin-cell-value">
                    {i.template.name}
                    <p>{dateLabel(i.weddingDate)}</p>
                  </div>
                </td>
                <td data-label="Trạng thái">
                  <div className="admin-cell-value">
                    <span className={`badge ${i.status}`}>
                      {STATUS_LABELS[i.status]}
                    </span>
                  </div>
                </td>
                <td data-label="Thao tác">
                  <div className="admin-cell-value">
                    <div className="table-actions">
                      {i.status === "published" && (
                        <Link
                          className="button secondary small"
                          href={`/w/${i.slug}`}
                        >
                          Xem thiệp
                        </Link>
                      )}
                      <MutationButton
                        endpoint="admin/invitation-status"
                        data={{ id: i.id, suspended: i.status !== "suspended" }}
                      >
                        {i.status === "suspended"
                          ? "Mở khóa về bản nháp"
                          : "Tạm khóa thiệp"}
                      </MutationButton>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
