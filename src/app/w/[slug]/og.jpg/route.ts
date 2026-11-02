import { shareImageResponse } from "@/server/wedding/share-image";

// Visibility is checked on every request: an invitation can be unpublished.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: Context) {
  return shareImageResponse(request, (await context.params).slug);
}

export async function HEAD(request: Request, context: Context) {
  return shareImageResponse(request, (await context.params).slug, {
    withBody: false,
  });
}
