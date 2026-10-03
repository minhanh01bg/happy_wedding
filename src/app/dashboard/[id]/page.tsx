import QRCode from "qrcode";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomerSession } from "@/server/customer-auth/session";
import { prisma } from "@/server/db/prisma";
import { entitlement } from "@/server/wedding/service";
import { readEvents, readPhotos, dateLabel } from "@/lib/wedding";
import { InvitationEditor } from "@/components/wedding/invitation-editor";
import { MutationButton, CopyButton } from "@/components/wedding/actions";
import { STATUS_LABELS } from "@/components/wedding/status";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerSession();
  const { id } = await params;
  const invitation = await prisma.invitation.findFirst({
    where: { id, ownerId: session.accountId },
  });
  if (!invitation) notFound();
  const [templates, access] = await Promise.all([
    prisma.weddingTemplate.findMany({
      where: { OR: [{ active: true }, { id: invitation.templateId }] },
      orderBy: { sortOrder: "asc" },
    }),
    entitlement(id),
  ]);
  const shareQr =
    invitation.status === "published"
      ? await QRCode.toDataURL(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3200"}/w/${invitation.slug}`,
          { width: 200, margin: 2 },
        )
      : null;
  const initial = {
    templateId: invitation.templateId,
    slug: invitation.slug,
    groom: invitation.groom,
    bride: invitation.bride,
    weddingDate: invitation.weddingDate.toISOString(),
    headline: invitation.headline,
    story: invitation.story,
    groomParents: invitation.groomParents,
    brideParents: invitation.brideParents,
    coverUrl: invitation.coverUrl,
    musicUrl: invitation.musicUrl,
    giftBank: invitation.giftBank,
    giftAccount: invitation.giftAccount,
    giftName: invitation.giftName,
    brideGiftBank: invitation.brideGiftBank,
    brideGiftAccount: invitation.brideGiftAccount,
    brideGiftName: invitation.brideGiftName,
    events: readEvents(invitation.eventsJson),
    photos: readPhotos(invitation.photosJson),
  };
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">CHĂM CHÚT LỜI MỜI</p>
          <h1>
            {invitation.groom} & {invitation.bride}
          </h1>
          <p>
            <span className={`badge ${invitation.status}`}>
              {STATUS_LABELS[invitation.status]}
            </span>{" "}
            ·{" "}
            {access
              ? `${access.planName}, đến ${dateLabel(access.expiresAt!)}`
              : "Chưa có gói còn hiệu lực"}
          </p>
        </div>
        <Link
          className="button secondary small"
          href={`/dashboard/${id}/guests`}
        >
          Quản lý khách mời
        </Link>
      </div>
      <div className="panel">
        <div className="inline-actions">
          <Link
            className="button secondary small"
            href={`/dashboard/${id}/preview`}
          >
            Xem thiệp đầy đủ
          </Link>
          <Link
            className="button small"
            href={`/dashboard/orders/new?invitation=${id}`}
          >
            {access ? "Mua thêm / gia hạn" : "Mua gói dịch vụ"}
          </Link>
          {invitation.status !== "suspended" && (
            <MutationButton
              endpoint="publish"
              data={{ id, publish: invitation.status !== "published" }}
              success={
                invitation.status === "published"
                  ? "Đã thu hồi đường dẫn công khai"
                  : "Thiệp đã được xuất bản"
              }
            >
              {invitation.status === "published"
                ? "Thu hồi thiệp"
                : "Xuất bản thiệp"}
            </MutationButton>
          )}
        </div>
        {invitation.status === "published" && (
          <div className="share-row">
            <Link className="muted-link" href={`/w/${invitation.slug}`}>
              /w/{invitation.slug}
            </Link>
            <CopyButton value={`/w/${invitation.slug}`} />
          </div>
        )}
      </div>
      {shareQr && (
        <details className="panel">
          <summary style={{ cursor: "pointer" }}>QR chia sẻ thiệp</summary>
          <Image
            src={shareQr}
            alt="QR mở thiệp cưới"
            width={160}
            height={160}
            unoptimized
          />
          <p className="fine">
            Lưu ảnh QR để đặt trên thiệp giấy hoặc gửi người thân. Đường dẫn
            dùng địa chỉ website đã cấu hình.
          </p>
        </details>
      )}
      <InvitationEditor
        key={`${id}-${invitation.version}`}
        id={id}
        version={invitation.version}
        initial={initial}
        templates={templates}
        maxPhotos={access?.maxPhotos}
      />
    </>
  );
}
