import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomerSession } from "@/server/customer-auth/session";
import { prisma } from "@/server/db/prisma";
import { InvitationView } from "@/components/wedding/invitation-view";
export default async function OwnPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerSession();
  const invitation = await prisma.invitation.findFirst({
    where: { id: (await params).id, ownerId: session.accountId },
    include: { template: true },
  });
  if (!invitation) notFound();
  return (
    <>
      <div className="preview-toolbar">
        <span>BẢN XEM THỬ · Các nội dung đã lưu</span>
        <Link href={`/dashboard/${invitation.id}`} className="button">
          ← Chỉnh sửa thiệp
        </Link>
      </div>
      <InvitationView invitation={invitation} preview />
    </>
  );
}
