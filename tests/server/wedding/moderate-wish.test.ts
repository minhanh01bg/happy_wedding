// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/server/db/prisma";

const session = vi.hoisted(() => ({ accountId: "" }));
vi.mock("@/server/wedding/guards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/wedding/guards")>()),
  customer: async () => ({ accountId: session.accountId }),
}));

import { POST } from "@/app/api/wedding/[...path]/route";

const templateId = "moderate-test-template";
const phones = ["+84900000101", "+84900000102"];
let ownerId: string;
let otherId: string;
let responseId: string;

async function clean() {
  await prisma.guestResponse.deleteMany({
    where: { invitation: { templateId } },
  });
  await prisma.invitation.deleteMany({ where: { templateId } });
  await prisma.weddingTemplate.deleteMany({ where: { id: templateId } });
  await prisma.customerAccount.deleteMany({
    where: { phoneNormalized: { in: phones } },
  });
}

function moderate(accountId: string, status: string) {
  session.accountId = accountId;
  return POST(
    new Request("http://127.0.0.1:3200/api/wedding/moderate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://127.0.0.1:3200",
        "sec-fetch-site": "same-origin",
        "x-real-ip": "127.0.0.1",
      },
      body: JSON.stringify({ id: responseId, status }),
    }),
    { params: Promise.resolve({ path: ["moderate"] }) },
  );
}

const wishStatus = async () =>
  (
    await prisma.guestResponse.findUniqueOrThrow({
      where: { id: responseId },
    })
  ).wishStatus;

beforeEach(async () => {
  await clean();
  const [owner, other] = await Promise.all(
    phones.map((phoneNormalized, i) =>
      prisma.customerAccount.create({
        data: {
          phoneNormalized,
          displayName: `Khách thử ${i + 1}`,
          passwordHash: "unused",
        },
      }),
    ),
  );
  ownerId = owner.id;
  otherId = other.id;
  await prisma.weddingTemplate.create({
    data: {
      id: templateId,
      slug: templateId,
      name: "Mẫu thử",
      category: "Tối giản",
      description: "Mẫu thử",
    },
  });
  const invitation = await prisma.invitation.create({
    data: {
      ownerId,
      templateId,
      slug: "moderate-test-wedding",
      groom: "Chú rể thử",
      bride: "Cô dâu thử",
      weddingDate: new Date("2026-12-01T03:00:00.000Z"),
    },
  });
  responseId = (
    await prisma.guestResponse.create({
      data: {
        invitationId: invitation.id,
        clientId: "client-1",
        name: "Khách thử",
        attendance: "attending",
        message: "Chúc hai bạn trăm năm hạnh phúc",
      },
    })
  ).id;
});
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe("moderate wish endpoint", () => {
  it("the owner can hide an approved wish and show it again", async () => {
    expect(await wishStatus()).toBe("pending");
    expect((await moderate(ownerId, "approved")).status).toBe(200);
    expect(await wishStatus()).toBe("approved");
    expect((await moderate(ownerId, "hidden")).status).toBe(200);
    expect(await wishStatus()).toBe("hidden");
    expect((await moderate(ownerId, "approved")).status).toBe(200);
    expect(await wishStatus()).toBe("approved");
  });

  it("another customer cannot change the wish", async () => {
    await moderate(ownerId, "hidden");
    const res = await moderate(otherId, "approved");
    expect(res.status).toBe(404);
    expect(await wishStatus()).toBe("hidden");
    await moderate(ownerId, "approved");
    expect((await moderate(otherId, "hidden")).status).toBe(404);
    expect(await wishStatus()).toBe("approved");
  });

  it("cannot set a wish back to unreviewed", async () => {
    await moderate(ownerId, "hidden");
    expect((await moderate(ownerId, "pending")).status).toBe(400);
    expect(await wishStatus()).toBe("hidden");
  });
});
