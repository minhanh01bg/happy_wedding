import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicInvitation, entitlement } from "@/server/wedding/service";
import { prisma } from "@/server/db/prisma";
import { InvitationView } from "@/components/wedding/invitation-view";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const invitation = await publicInvitation((await params).slug);
  if (!invitation)
    return { title: "Lời mời chưa sẵn sàng", robots: { index: false } };
  return {
    title: `${invitation.groom} & ${invitation.bride} — Thiệp cưới`,
    description: invitation.headline,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${invitation.groom} & ${invitation.bride}`,
      description: invitation.headline,
    },
  };
}
export default async function PublicWedding({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ guest?: string }>;
}) {
  const invitation = await publicInvitation((await params).slug);
  if (!invitation) notFound();
  const guestToken = (await searchParams).guest;
  const guest = guestToken
    ? await prisma.weddingGuest.findFirst({
        where: { invitationId: invitation.id, token: guestToken },
      })
    : null;
  if (guestToken && !guest) notFound();
  const [wishes, access] = await Promise.all([
    prisma.guestResponse.findMany({
      where: {
        invitationId: invitation.id,
        wishStatus: "approved",
        message: { not: "" },
      },
      select: { id: true, name: true, message: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    entitlement(invitation.id),
  ]);
  return (
    <InvitationView
      invitation={invitation}
      wishes={wishes}
      guestName={guest?.name}
      guestToken={guestToken}
      removeBranding={access?.removeBranding}
    />
  );
}
