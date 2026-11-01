/**
 * Exits non-zero when `next start` would refuse to boot because of its
 * settings, so scripts/deploy-prod.sh can stop before touching the live
 * server. Loads the env files the way Next.js does in production
 * (.env.production.local, .env.local, .env.production, .env; the process
 * environment wins), then runs the same check as src/config/env.ts.
 *
 * Errors name fields, never values. On success it prints one line for the
 * deploy script: `DATABASE_URL=file:...`, so Prisma and the backup use the
 * database the server will use.
 *
 * Usage, from the checkout root:
 *   NODE_ENV=production node --import tsx scripts/check-prod-env.ts
 */
import { createRequire } from "node:module";
import path from "node:path";

type NextEnv = {
  loadEnvConfig: (dir: string, dev?: boolean) => unknown;
};

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

async function main() {
  if (process.env.NODE_ENV !== "production")
    fail("Run with NODE_ENV=production, as the server runs.");
  // Full production rules, not the dummies env.ts allows during `next build`.
  delete process.env.NEXT_PHASE;
  delete process.env.npm_lifecycle_event;

  const root = process.cwd();
  // @next/env is Next's own loader; pnpm keeps it beside `next`, not at the top.
  const fromRoot = createRequire(path.join(root, "package.json"));
  const fromNext = createRequire(fromRoot.resolve("next/package.json"));
  const { loadEnvConfig } = fromNext("@next/env") as NextEnv;
  loadEnvConfig(root, false);

  try {
    // Throws, after listing the failing fields, exactly as at server start.
    await import("../src/config/env");
  } catch {
    fail("Production settings are invalid; see the fields above.");
  }

  const { TRUSTED_PROXY_MODE, TRUSTED_CLIENT_IP_HEADER } = process.env;
  if (
    TRUSTED_PROXY_MODE !== "custom" ||
    TRUSTED_CLIENT_IP_HEADER?.toLowerCase() !== "x-real-ip"
  )
    process.stderr.write(
      "Warning: behind our nginx use TRUSTED_PROXY_MODE=custom and " +
        "TRUSTED_CLIENT_IP_HEADER=x-real-ip (docs/OPERATIONS.md).\n",
    );

  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!databaseUrl.startsWith("file:"))
    fail("DATABASE_URL must be a SQLite file: URL.");
  process.stdout.write(`DATABASE_URL=${databaseUrl}\n`);
}

void main();
