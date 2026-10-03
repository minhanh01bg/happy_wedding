import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireCustomerSession } from "@/server/customer-auth/session";
import { GuestForm } from "@/components/wedding/guest-form";
import { CopyButton, MutationButton } from "@/components/wedding/actions";
import { STATUS_LABELS } from "@/components/wedding/status";
import { readEvents, dateLabel } from "@/lib/wedding";
export default async function Guests({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireCustomerSession();
  const id = (await params).id;
  const invitation = await prisma.invitation.findFirst({
    where: { id, ownerId: session.accountId },
  });
  if (!invitation) notFound();
  const page = Math.max(
    1,
    Math.min(1000, Number((await searchParams).page) || 1),
  );
  const skip = (Math.floor(page) - 1) * 30;
  const [
    guests,
    responses,
    guestCount,
    responseCount,
    attending,
    declined,
    undecided,
  ] = await Promise.all([
    prisma.weddingGuest.findMany({
      where: { invitationId: id },
      include: { responses: { select: { attendance: true, partySize: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: 30,
    }),
    prisma.guestResponse.findMany({
      where: { invitationId: id },
      orderBy: { createdAt: "desc" },
      skip,
      take: 30,
    }),
    prisma.weddingGuest.count({ where: { invitationId: id } }),
    prisma.guestResponse.count({ where: { invitationId: id } }),
    prisma.guestResponse.aggregate({
      where: { invitationId: id, attendance: "attending" },
      _sum: { partySize: true },
      _count: true,
    }),
    prisma.guestResponse.count({
      where: { invitationId: id, attendance: "declined" },
    }),
    prisma.guestResponse.count({
      where: { invitationId: id, attendance: "undecided" },
    }),
  ]);
  const events = readEvents(invitation.eventsJson);
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">NGÀY VUI, CÓ NGƯỜI THƯƠNG</p>
          <h1>Danh sách khách mời</h1>
          <p>
            {invitation.groom} & {invitation.bride} ·{" "}
            <Link className="muted-link" href={`/dashboard/${id}`}>
              Về chỉnh sửa thiệp
            </Link>
          </p>
        </div>
        <a
          href={`/api/wedding/export/${id}`}
          className="button secondary small"
        >
          Xuất phản hồi CSV
        </a>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <p>Đã phản hồi</p>
          <strong>{responseCount}</strong>
        </div>
        <div className="stat-card">
          <p>Khách sẽ đến ({attending._count} phản hồi)</p>
          <strong>{attending._sum.partySize || 0}</strong>
        </div>
        <div className="stat-card">
          <p>Không tham dự</p>
          <strong>{declined}</strong>
        </div>
        <div className="stat-card">
          <p>Chưa quyết định</p>
          <strong>{undecided}</strong>
        </div>
      </div>
      {invitation.status !== "published" && (
        <div className="notice" style={{ marginBottom: 25 }}>
          Lời mời cá nhân chỉ mở được khi thiệp đã xuất bản và gói còn hiệu lực.
        </div>
      )}
      <section className="panel">
        <h2>Gửi lời mời riêng</h2>
        <GuestForm invitationId={id} />
        <p className="fine" style={{ marginTop: 15 }}>
          Mỗi khách có một đường dẫn riêng, hiển thị tên người nhận. Giữ riêng
          đường dẫn này; người biết link có thể cập nhật phản hồi.
        </p>
        <div className="data-table-wrap" style={{ marginTop: 20 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Khách mời ({guestCount})</th>
                <th>Nhóm</th>
                <th>Phản hồi</th>
                <th>Đường dẫn riêng</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{g.group}</td>
                  <td>
                    {g.responses[0]
                      ? `${STATUS_LABELS[g.responses[0].attendance]} · ${g.responses[0].partySize} người`
                      : "Chưa phản hồi"}
                  </td>
                  <td>
                    <Link
                      className="guest-link"
                      href={`/w/${invitation.slug}?guest=${g.token}`}
                    >
                      /w/{invitation.slug}?guest={g.token}
                    </Link>
                    <div style={{ marginTop: 8 }}>
                      <CopyButton
                        value={`/w/${invitation.slug}?guest=${g.token}`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!guests.length && (
          <p className="fine" style={{ padding: 20 }}>
            Chưa có lời mời riêng. Thêm khách ở phía trên để bắt đầu.
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Phản hồi & lời chúc</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Khách</th>
                <th>Tham dự</th>
                <th>Tiệc</th>
                <th>Lời chúc</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name}
                    <p>{dateLabel(r.createdAt, true)}</p>
                  </td>
                  <td>
                    <span className="badge">{STATUS_LABELS[r.attendance]}</span>
                    <p>{r.partySize} người</p>
                  </td>
                  <td>{events[r.eventIndex]?.title || "Tiệc đã thay đổi"}</td>
                  <td style={{ maxWidth: 350 }}>
                    <p
                      style={{
                        whiteSpace: "pre-line",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {r.message || "Không có lời nhắn"}
                    </p>
                    {r.message && (
                      <div className="table-actions" style={{ marginTop: 10 }}>
                        <span className={`badge ${r.wishStatus}`}>
                          {STATUS_LABELS[r.wishStatus]}
                        </span>
                        {r.wishStatus !== "approved" && (
                          <MutationButton
                            endpoint="moderate"
                            data={{ id: r.id, status: "approved" }}
                          >
                            Duyệt lời chúc
                          </MutationButton>
                        )}
                        {r.wishStatus !== "hidden" && (
                          <MutationButton
                            endpoint="moderate"
                            data={{ id: r.id, status: "hidden" }}
                          >
                            Ẩn
                          </MutationButton>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!responses.length && (
          <p className="fine" style={{ padding: 20 }}>
            Chưa có phản hồi. Khi khách gửi xác nhận, thông tin sẽ xuất hiện ở
            đây.
          </p>
        )}
      </section>
      <div className="pagination">
        <span>Trang {Math.floor(page)} · 30 dòng mỗi danh sách</span>
        <div className="inline-actions">
          {page > 1 && (
            <Link className="button secondary small" href={`?page=${page - 1}`}>
              ← Trang trước
            </Link>
          )}
          {skip + 30 < Math.max(guestCount, responseCount) && (
            <Link className="button secondary small" href={`?page=${page + 1}`}>
              Trang sau →
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
