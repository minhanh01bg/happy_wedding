import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieJar = vi.hoisted(() => ({
  value: undefined as string | undefined,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieJar.value ? { value: cookieJar.value } : undefined),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { requireAdminPage } from "@/server/auth/require-admin-session";
import { createAdminSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

async function clean() {
  await prisma.adminSession.deleteMany();
  await prisma.adminAuditEvent.deleteMany();
  await prisma.adminIdentity.deleteMany();
}

describe("requireAdminPage", () => {
  beforeEach(async () => {
    cookieJar.value = undefined;
    await clean();
  });
  afterEach(clean);

  it("redirects when there is no admin cookie", async () => {
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects when the cookie is a forged or unknown token", async () => {
    cookieJar.value = "x".repeat(43);
    await expect(requireAdminPage()).rejects.toThrow("REDIRECT:/login");
  });

  it("returns the principal for an owner session", async () => {
    const identity = await prisma.adminIdentity.create({
      data: { username: "owner-page", role: "owner", version: 1 },
    });
    cookieJar.value = (await createAdminSession(identity.id)).token;
    await expect(requireAdminPage()).resolves.toMatchObject({
      id: identity.id,
      role: "owner",
    });
  });

  it("rejects a role outside the allowed set", async () => {
    const identity = await prisma.adminIdentity.create({
      data: { username: "manager-page", role: "manager", version: 1 },
    });
    cookieJar.value = (await createAdminSession(identity.id)).token;
    await expect(requireAdminPage()).resolves.toMatchObject({
      role: "manager",
    });
    await expect(requireAdminPage(["owner"])).rejects.toThrow(
      "REDIRECT:/login",
    );
  });
});

function adminPages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return adminPages(path);
    return name === "page.tsx" ? [path] : [];
  });
}

describe("admin page segments", () => {
  // RSC requests can render a page segment without re-running the layout,
  // so the layout check alone does not protect page data.
  it("every admin page calls requireAdminPage before reading data", () => {
    const pages = adminPages(join(process.cwd(), "src/app/admin"));
    expect(pages.length).toBeGreaterThan(5);
    for (const page of pages) {
      const source = readFileSync(page, "utf8");
      const body = source.slice(
        source.indexOf("export default async function"),
      );
      expect(body.match(/await\s+(\w+)/)?.[1], page).toBe("requireAdminPage");
    }
  });
});
