import { pbkdf2Sync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAdminSession,
  ensureDefaultAdminIdentity,
  hashPassword,
  PBKDF2_ITERATIONS,
  resolveAdminSession,
  revokeAdminSession,
  revokeAllAdminSessions,
  verifyPassword,
  verifySession,
} from "@/server/auth/session";
import { validateEnv } from "@/config/env";
import { prisma } from "@/server/db/prisma";

describe("Admin Password Hashing", () => {
  it("confirms correct password", async () => {
    const hash = await hashPassword("matkhau-cua-hang");
    expect(await verifyPassword("matkhau-cua-hang", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("matkhau-cua-hang");
    expect(await verifyPassword("sai-roi", hash)).toBe(false);
  });

  it("produces different hashes due to salt", async () => {
    const a = await hashPassword("x");
    const b = await hashPassword("x");
    expect(a).not.toBe(b);
  });

  it("rejects empty hash", async () => {
    expect(await verifyPassword("bat ky", "")).toBe(false);
  });

  it("stores the iteration count with new hashes", async () => {
    expect(PBKDF2_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    expect(await hashPassword("x")).toMatch(
      new RegExp(`^${PBKDF2_ITERATIONS}:[0-9a-f]{32}:[0-9a-f]{64}$`),
    );
  });

  it("still verifies legacy salt:hash values at 100k iterations", async () => {
    const salt = "22222222222222222222222222222222";
    const legacy = `${salt}:${pbkdf2Sync("matkhau-cu", Buffer.from(salt, "hex"), 100_000, 32, "sha256").toString("hex")}`;
    expect(await verifyPassword("matkhau-cu", legacy)).toBe(true);
    expect(await verifyPassword("sai", legacy)).toBe(false);
  });

  it("rejects downgraded or malformed iteration counts", async () => {
    const salt = "33333333333333333333333333333333";
    const weak = pbkdf2Sync("x", Buffer.from(salt, "hex"), 1000, 32, "sha256");
    expect(
      await verifyPassword("x", `1000:${salt}:${weak.toString("hex")}`),
    ).toBe(false);
    expect(await verifyPassword("x", `abc:${salt}:${"0".repeat(64)}`)).toBe(
      false,
    );
    expect(await verifyPassword("x", `1:2:3:4`)).toBe(false);
  });

  it("production env accepts both hash formats and rejects others", () => {
    const base = {
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://redis.example.com",
      UPSTASH_REDIS_REST_TOKEN: "token",
      RATE_LIMIT_KEY_SECRET: "r".repeat(32),
      TRUSTED_PROXY_MODE: "vercel",
      CANONICAL_ORIGIN: "https://shop.example.com",
      NEXT_PUBLIC_APP_URL: "https://shop.example.com",
    };
    const salt = "4".repeat(32);
    const digest = "5".repeat(64);
    const hashIssue = (STORE_PASSWORD_HASH: string) =>
      validateEnv({ ...base, STORE_PASSWORD_HASH }).error?.issues.some(
        (issue) => issue.path[0] === "STORE_PASSWORD_HASH",
      ) ?? false;
    expect(hashIssue(`${salt}:${digest}`)).toBe(false);
    expect(hashIssue(`600000:${salt}:${digest}`)).toBe(false);
    expect(hashIssue(`x:${salt}:${digest}`)).toBe(true);
    expect(hashIssue("")).toBe(true);
  });
});

describe("Revocable Identity-Bearing Admin Sessions (Task 16)", () => {
  let testIdentityId: string;

  beforeEach(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.adminAuditEvent.deleteMany();
    await prisma.adminIdentity.deleteMany();

    const identity = await prisma.adminIdentity.create({
      data: {
        username: "test-admin",
        role: "owner",
        version: 1,
      },
    });
    testIdentityId = identity.id;
  });

  afterEach(async () => {
    await prisma.adminSession.deleteMany();
    await prisma.adminAuditEvent.deleteMany();
    await prisma.adminIdentity.deleteMany();
  });

  it("creates a session storing only opaque digest in database", async () => {
    const { token, expiresAt, idleExpiresAt } =
      await createAdminSession(testIdentityId);

    expect(token).toBeTruthy();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(idleExpiresAt.getTime()).toBeGreaterThan(Date.now());

    // Token itself must NEVER be stored in the database in plaintext
    const dbSession = await prisma.adminSession.findFirst({
      where: { identityId: testIdentityId },
    });
    expect(dbSession).not.toBeNull();
    expect(dbSession?.tokenHash).not.toBe(token);
    expect(dbSession?.tokenHash.length).toBe(64); // SHA-256 hex
  });

  it("resolves valid session with identity and role attributes", async () => {
    const { token } = await createAdminSession(testIdentityId);
    const resolved = await resolveAdminSession(token);

    expect(resolved).not.toBeNull();
    expect(resolved?.identity.id).toBe(testIdentityId);
    expect(resolved?.identity.username).toBe("test-admin");
    expect(resolved?.identity.role).toBe("owner");
    expect(await verifySession(token)).toBe(true);
  });

  it("rejects expired session (absolute lifetime exceeded)", async () => {
    const { token } = await createAdminSession(testIdentityId);

    // Force expire absolute
    await prisma.adminSession.updateMany({
      where: { identityId: testIdentityId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const resolved = await resolveAdminSession(token);
    expect(resolved).toBeNull();
    expect(await verifySession(token)).toBe(false);
  });

  it("rejects idle-expired session", async () => {
    const { token } = await createAdminSession(testIdentityId);

    // Force expire idle
    await prisma.adminSession.updateMany({
      where: { identityId: testIdentityId },
      data: { idleExpiresAt: new Date(Date.now() - 1000) },
    });

    const resolved = await resolveAdminSession(token);
    expect(resolved).toBeNull();
    expect(await verifySession(token)).toBe(false);
  });

  it("rejects revoked session", async () => {
    const { token } = await createAdminSession(testIdentityId);
    await revokeAdminSession(token);

    const resolved = await resolveAdminSession(token);
    expect(resolved).toBeNull();
    expect(await verifySession(token)).toBe(false);
  });

  it("rejects session if admin identity is disabled", async () => {
    const { token } = await createAdminSession(testIdentityId);

    await prisma.adminIdentity.update({
      where: { id: testIdentityId },
      data: { disabledAt: new Date() },
    });

    const resolved = await resolveAdminSession(token);
    expect(resolved).toBeNull();
    expect(await verifySession(token)).toBe(false);
  });

  it("rejects session if identity version was incremented (credential/role rotation)", async () => {
    const { token } = await createAdminSession(testIdentityId);

    // Bump identity version
    await prisma.adminIdentity.update({
      where: { id: testIdentityId },
      data: { version: { increment: 1 } },
    });

    const resolved = await resolveAdminSession(token);
    expect(resolved).toBeNull();
    expect(await verifySession(token)).toBe(false);
  });

  it("revokes single session without affecting other sessions of same identity", async () => {
    const session1 = await createAdminSession(testIdentityId);
    const session2 = await createAdminSession(testIdentityId);

    await revokeAdminSession(session1.token);

    expect(await verifySession(session1.token)).toBe(false);
    expect(await verifySession(session2.token)).toBe(true);
  });

  it("revokes all sessions for identity during emergency revocation", async () => {
    const session1 = await createAdminSession(testIdentityId);
    const session2 = await createAdminSession(testIdentityId);

    await revokeAllAdminSessions(testIdentityId);

    expect(await verifySession(session1.token)).toBe(false);
    expect(await verifySession(session2.token)).toBe(false);
  });

  it("rejects legacy stateless HMAC tokens and random strings", async () => {
    const legacyToken = `${Date.now()}.some-fake-signature`;
    expect(await verifySession(legacyToken)).toBe(false);
    expect(await verifySession("garbage-token")).toBe(false);
    expect(await verifySession("")).toBe(false);
  });

  it("ensures default admin identity is created idempotently", async () => {
    const identity1 = await ensureDefaultAdminIdentity();
    expect(identity1).toBeDefined();
    expect(identity1.role).toBe("owner");

    const identity2 = await ensureDefaultAdminIdentity();
    expect(identity2.id).toBe(identity1.id);
  });

  it("handles concurrent bootstrap of default admin identity without unique constraint race", async () => {
    await prisma.adminIdentity.deleteMany({ where: { username: "admin" } });

    const results = await Promise.all([
      ensureDefaultAdminIdentity(),
      ensureDefaultAdminIdentity(),
      ensureDefaultAdminIdentity(),
      ensureDefaultAdminIdentity(),
      ensureDefaultAdminIdentity(),
    ]);

    expect(results).toHaveLength(5);
    const firstId = results[0].id;
    for (const res of results) {
      expect(res.id).toBe(firstId);
      expect(res.username).toBe("admin");
      expect(res.role).toBe("owner");
    }

    const inDb = await prisma.adminIdentity.findMany({
      where: { username: "admin" },
    });
    expect(inDb).toHaveLength(1);
  });
});
