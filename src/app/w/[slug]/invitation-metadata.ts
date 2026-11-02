import type { Metadata } from "next";

import { publicSiteUrl } from "@/server/http/site-url";
import { publicInvitation } from "@/server/wedding/service";
import {
  shareCover,
  shareImagePath,
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_TYPE,
  SHARE_IMAGE_WIDTH,
  type ShareImageOptions,
} from "@/server/wedding/share-image";

export const SITE_NAME = "Hỷ Studio";

/**
 * Head of the public invitation, written for link previews (Messenger, Zalo,
 * iMessage). Every URL is absolute on the configured public origin and leaves
 * out `?guest=`: a personal token must never reach a crawler or a referrer.
 */
export async function invitationMetadata(
  slug: string,
  options?: ShareImageOptions,
): Promise<Metadata> {
  const invitation = await publicInvitation(slug);
  if (!invitation)
    return { title: "Lời mời chưa sẵn sàng", robots: { index: false } };
  const site = publicSiteUrl();
  const couple = `${invitation.groom} & ${invitation.bride}`;
  const cover = await shareCover(invitation, options);
  const image = cover && {
    url: new URL(shareImagePath(invitation.slug, cover.version), site).href,
    width: SHARE_IMAGE_WIDTH,
    height: SHARE_IMAGE_HEIGHT,
    type: SHARE_IMAGE_TYPE,
    alt: `${invitation.groom} và ${invitation.bride} — ảnh thiệp cưới`,
  };
  return {
    metadataBase: site,
    title: `${couple} — Thiệp cưới`,
    description: invitation.headline,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      url: new URL(`/w/${invitation.slug}`, site).href,
      siteName: SITE_NAME,
      locale: "vi_VN",
      title: couple,
      description: invitation.headline,
      ...(image && { images: [image] }),
    },
    // Title, description and image come from openGraph.
    twitter: { card: image ? "summary_large_image" : "summary" },
  };
}
