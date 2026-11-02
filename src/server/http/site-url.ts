import { env, isPublicUrl } from "@/config/env";

/** Local server of `pnpm dev`/`pnpm start` when no public URL is configured. */
const LOCAL_SITE_URL = "http://localhost:3200";

type SiteEnv = Pick<typeof env, "NEXT_PUBLIC_APP_URL" | "CANONICAL_ORIGIN">;

/**
 * Origin for absolute URLs that leave the site (og:url, og:image). Same order
 * as the production check in src/config/env.ts: NEXT_PUBLIC_APP_URL, then
 * CANONICAL_ORIGIN, the first that is a public URL. Production refuses to
 * start without one, so the fallback below only serves development and tests.
 * The request's Host is never used: behind nginx it is 127.0.0.1:3200.
 */
export function publicSiteUrl(source: SiteEnv = env): URL {
  for (const value of [source.NEXT_PUBLIC_APP_URL, source.CANONICAL_ORIGIN])
    if (isPublicUrl(value)) return new URL(new URL(value).origin);
  return new URL(
    new URL(
      source.NEXT_PUBLIC_APP_URL || source.CANONICAL_ORIGIN || LOCAL_SITE_URL,
    ).origin,
  );
}
