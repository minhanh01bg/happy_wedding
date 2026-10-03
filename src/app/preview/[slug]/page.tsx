import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { DEMO_CONTENT } from "@/lib/wedding";
import { InvitationView } from "@/components/wedding/invitation-view";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Xem thử mẫu thiệp",
  robots: { index: false },
};
export default async function TemplatePreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const template = await prisma.weddingTemplate.findFirst({
    where: { slug: (await params).slug, active: true },
  });
  if (!template) notFound();
  const { events, photos, weddingDate, ...data } = DEMO_CONTENT;
  const invitation = {
    ...data,
    id: "preview",
    ownerId: "preview",
    templateId: template.id,
    template,
    slug: "preview",
    weddingDate: new Date(weddingDate),
    eventsJson: JSON.stringify(events),
    photosJson: JSON.stringify(photos),
    status: "draft",
    isDemo: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return (
    <>
      <div className="preview-toolbar">
        <span>Xem mẫu: {template.name}</span>
        <Link
          className="button"
          href={`/dashboard/new?template=${template.id}`}
        >
          Dùng mẫu này
        </Link>
        <Link href="/templates">← Bộ sưu tập</Link>
      </div>
      <InvitationView invitation={invitation} preview />
    </>
  );
}
