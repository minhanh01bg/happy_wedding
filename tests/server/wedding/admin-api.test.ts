import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/wedding/[...path]/route";
import { createAdminSession, SESSION_COOKIE } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

async function clean() {
  await prisma.setting.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.adminAuditEvent.deleteMany();
  await prisma.adminIdentity.deleteMany();
}

async function sessionFor(role: "owner" | "manager") {
  const identity = await prisma.adminIdentity.create({
    data: { username: `api-${role}`, role, version: 1 },
  });
  return (await createAdminSession(identity.id)).token;
}

function call(path: string[], body: unknown, token: string) {
  const request = new Request(
    `http://127.0.0.1:3200/api/wedding/${path.join("/")}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:3200",
        "sec-fetch-site": "same-origin",
        "x-real-ip": "127.0.0.1",
        cookie: `${SESSION_COOKIE}=${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  return POST(request, { params: Promise.resolve({ path }) });
}

describe("admin wedding API", () => {
  beforeEach(clean);
  afterEach(clean);

  it("returns 404 rather than 500 for unknown records", async () => {
    const token = await sessionFor("owner");
    for (const [operation, body] of [
      ["invitation-status", { id: "missing", suspended: true }],
      ["customer-status", { id: "missing", disabled: true }],
    ] as const) {
      const response = await call(["admin", operation], body, token);
      expect(response.status, operation).toBe(404);
      expect(await response.json()).not.toHaveProperty("correlationId");
    }
    expect(await prisma.adminAuditEvent.count()).toBe(0);
  });

  it("only the owner can change the merchant bank account", async () => {
    const settings = {
      bank: "970436",
      account: "0123456789",
      name: "HY STUDIO",
      support: "",
    };
    const manager = await call(
      ["admin", "settings"],
      settings,
      await sessionFor("manager"),
    );
    expect(manager.status).toBe(403);
    expect(
      await prisma.setting.findUnique({ where: { key: "wedding.merchant" } }),
    ).toBeNull();
    const owner = await call(
      ["admin", "settings"],
      settings,
      await sessionFor("owner"),
    );
    expect(owner.status).toBe(200);
    expect(await prisma.adminAuditEvent.count()).toBe(1);
  });
});
