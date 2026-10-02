import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/logout/route";
import { env } from "@/config/env";
import {
  adminCookieOptions,
  createAdminSession,
  ensureDefaultAdminIdentity,
  resolveAdminSession,
  SESSION_COOKIE,
  verifySession,
} from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

function makeLogoutRequest(cookieHeader?: string): Request {
  const headers = new Headers();
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }
  return new Request("https://example.com/api/auth/logout", {
    method: "POST",
    headers,
  });
}

describe("POST /api/auth/logout (Task 16)", () => {
  it("clears the HTTP store cookie without Secure while revoking its session", async () => {
    const previousOrigin = env.CANONICAL_ORIGIN;
    const previousSecure = adminCookieOptions.secure;
    try {
      (env as Record<string, unknown>).CANONICAL_ORIGIN =
        "http://store.example.com:3000";
      adminCookieOptions.secure = true;
      const { token } = await createAdminSession();
      const response = await POST(
        new Request("http://store.example.com:3000/api/auth/logout", {
          method: "POST",
          headers: {
            origin: "http://store.example.com:3000",
            cookie: `${SESSION_COOKIE}=${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
      expect(response.headers.get("set-cookie")).not.toContain("Secure");
      expect(await verifySession(token)).toBe(false);
    } finally {
      (env as Record<string, unknown>).CANONICAL_ORIGIN = previousOrigin;
      adminCookieOptions.secure = previousSecure;
    }
  });

  beforeEach(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.adminIdentity.deleteMany();
  });

  afterEach(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.adminIdentity.deleteMany();
  });

  it("revokes server-side session in database and clears cookie", async () => {
    const admin = await ensureDefaultAdminIdentity();
    const { token } = await createAdminSession(admin.id);

    // Verify session is initially active
    expect(await verifySession(token)).toBe(true);

    const req = makeLogoutRequest(`${SESSION_COOKIE}=${token}`);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    // Cookie is expired/cleared
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain(`${SESSION_COOKIE}=;`);

    // Session in database is now revoked
    expect(await verifySession(token)).toBe(false);
    const resolved = await resolveAdminSession(token);
    expect(resolved).toBeNull();
  });

  it("handles logout gracefully when no session cookie is presented", async () => {
    const req = makeLogoutRequest();
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects cross-site logout attempts without revoking the session", async () => {
    const admin = await ensureDefaultAdminIdentity();
    const { token } = await createAdminSession(admin.id);
    const req = makeLogoutRequest(`${SESSION_COOKIE}=${token}`);
    req.headers.set("origin", "https://attacker.example");
    req.headers.set("sec-fetch-site", "cross-site");

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(await verifySession(token)).toBe(true);
  });
});
