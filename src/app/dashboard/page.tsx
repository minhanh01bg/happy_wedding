import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { requireCustomerSession } from "@/server/customer-auth/session";
import { TemplateArtwork } from "@/components/wedding/template-card";
import { dateLabel } from "@/lib/wedding";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function Dashboard() {
  const session = await requireCustomerSession();
  const [invitations, responses] = await Promise.all([
    prisma.invitation.findMany({
      where: { ownerId: session.accountId },
      include: {
        template: true,
        _count: { select: { responses: true, guests: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.guestResponse.aggregate({
      where: {
        invitation: { ownerId: session.accountId },
        attendance: "attending",
      },
      _sum: { partySize: true },
    }),
  ]);
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">KHÔNG GIAN CỦA HAI BẠN</p>
          <h1>Những lời mời của bạn.</h1>
          <p>Mọi chi tiết cho ngày chung đôi, được chăm chút ở đây.</p>
        </div>
        <Link className="button" href="/dashboard/new">
          <Plus size={16} /> Tạo thiệp mới
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <p>Thiệp đã tạo</p>
          <strong>{invitations.length}</strong>
        </div>
        <div className="stat-card">
          <p>Đã xuất bản</p>
          <strong>
            {invitations.filter((i) => i.status === "published").length}
          </strong>
        </div>
        <div className="stat-card">
          <p>Lời mời cá nhân</p>
          <strong>
            {invitations.reduce((n, i) => n + i._count.guests, 0)}
          </strong>
        </div>
        <div className="stat-card">
          <p>Khách xác nhận đến</p>
          <strong>{responses._sum.partySize || 0}</strong>
        </div>
      </div>
      {!invitations.length ? (
        <div className="empty-state">
          <h2>Một lời mời đang chờ được viết.</h2>
          <p>
            Chọn mẫu, điền câu chuyện và xem thử. Bạn chỉ mua gói khi sẵn sàng
            xuất bản.
          </p>
          <Link href="/templates" className="button">
            Chọn mẫu đầu tiên <ArrowUpRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="invitation-grid">
          {invitations.map((i) => (
            <article key={i.id} className="invitation-tile">
              <div className="tile-art">
                <TemplateArtwork template={i.template} />
              </div>
              <div className="tile-body">
                <span className={`badge ${i.status}`}>
                  {STATUS_LABELS[i.status] || i.status}
                </span>
                <h2>
                  {i.groom} & {i.bride}
                </h2>
                <p>
                  {dateLabel(i.weddingDate)} · Mẫu {i.template.name}
                </p>
                <p>
                  {i._count.responses} phản hồi · {i._count.guests} lời mời
                  riêng
                </p>
                <div className="tile-actions">
                  <Link className="button small" href={`/dashboard/${i.id}`}>
                    Chỉnh sửa thiệp
                  </Link>
                  <Link
                    className="button secondary small"
                    href={`/dashboard/${i.id}/guests`}
                  >
                    Khách mời
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
