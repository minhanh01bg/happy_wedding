import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST as sepayWebhook } from "@/app/api/payments/sepay/route";

import { prisma } from "@/server/db/prisma";
import { DEMO_CONTENT } from "@/lib/wedding";
import {
  confirmPayment,
  createServiceOrder,
  entitlement,
  publicInvitation,
  publishInvitation,
  saveInvitation,
  submitResponse,
} from "@/server/wedding/service";

async function clean() {
  await prisma.guestResponse.deleteMany();
  await prisma.weddingGuest.deleteMany();
  await prisma.weddingPayment.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.weddingTemplate.deleteMany();
  await prisma.servicePlan.deleteMany();
  await prisma.customerSession.deleteMany();
  await prisma.customerAccount.deleteMany();
  await prisma.adminAuditEvent.deleteMany();
}
let accountId: string;
let otherId: string;
const templateId = "test-template";
const planId = "test-plan";
const input = () => ({ ...DEMO_CONTENT, templateId, slug: "test-wedding" });
async function draft() {
  return saveInvitation(accountId, input());
}
async function activate(id: string) {
  const order = await createServiceOrder(accountId, id, planId, randomUUID());
  return confirmPayment(
    order.id,
    `manual:${randomUUID()}`,
    order.total,
    "manual",
  );
}
beforeEach(async () => {
  await clean();
  accountId = (
    await prisma.customerAccount.create({
      data: {
        phoneNormalized: "+84912345678",
        displayName: "Owner",
        passwordHash: "unused",
      },
    })
  ).id;
  otherId = (
    await prisma.customerAccount.create({
      data: {
        phoneNormalized: "+84912345679",
        displayName: "Other",
        passwordHash: "unused",
      },
    })
  ).id;
  await prisma.weddingTemplate.create({
    data: {
      id: templateId,
      slug: "test",
      name: "Test",
      category: "Tối giản",
      description: "Test",
    },
  });
  await prisma.servicePlan.create({
    data: {
      id: planId,
      name: "Essential",
      description: "Test",
      price: 199000,
      months: 12,
      maxPhotos: 12,
      premiumTemplates: false,
      removeBranding: false,
    },
  });
});
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});
describe("Ownership and publishing", () => {
  it("never publishes an unpaid draft", async () => {
    const i = await draft();
    await expect(
      publishInvitation(accountId, i.id, true),
    ).rejects.toMatchObject({ status: 403 });
    expect(await publicInvitation(i.slug)).toBeNull();
  });
  it("another customer cannot edit, buy for or publish a thiệp", async () => {
    const i = await draft();
    await expect(
      saveInvitation(otherId, input(), i.id, i.version),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      createServiceOrder(otherId, i.id, planId, randomUUID()),
    ).rejects.toMatchObject({ status: 404 });
    await expect(publishInvitation(otherId, i.id, true)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("valid activation permits publishing, revoking hides the public URL", async () => {
    const i = await draft();
    await activate(i.id);
    await publishInvitation(accountId, i.id, true);
    expect((await publicInvitation(i.slug))?.id).toBe(i.id);
    await publishInvitation(accountId, i.id, false);
    expect(await publicInvitation(i.slug)).toBeNull();
  });
  it("expired entitlement hides a published invitation", async () => {
    const i = await draft();
    const o = await activate(i.id);
    await publishInvitation(accountId, i.id, true);
    await prisma.serviceOrder.update({
      where: { id: o.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await entitlement(i.id)).toBeNull();
    expect(await publicInvitation(i.slug)).toBeNull();
  });
  it("rejects concurrent editor overwrite and duplicate slugs", async () => {
    const i = await draft();
    await saveInvitation(
      accountId,
      { ...input(), headline: "New" },
      i.id,
      i.version,
    );
    await expect(
      saveInvitation(accountId, input(), i.id, i.version),
    ).rejects.toMatchObject({ status: 409 });
    await expect(saveInvitation(otherId, input())).rejects.toMatchObject({
      status: 409,
    });
  });
  it("premium draft can be previewed but not published with Essential", async () => {
    await prisma.weddingTemplate.update({
      where: { id: templateId },
      data: { premium: true },
    });
    const i = await draft();
    await activate(i.id);
    await expect(
      publishInvitation(accountId, i.id, true),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("disabled owners and suspended cards are hidden; owner cannot undo suspension", async () => {
    const i = await draft();
    await activate(i.id);
    await publishInvitation(accountId, i.id, true);
    await prisma.customerAccount.update({
      where: { id: accountId },
      data: { disabledAt: new Date() },
    });
    expect(await publicInvitation(i.slug)).toBeNull();
    await prisma.customerAccount.update({
      where: { id: accountId },
      data: { disabledAt: null },
    });
    await prisma.invitation.update({
      where: { id: i.id },
      data: { status: "suspended" },
    });
    await expect(
      publishInvitation(accountId, i.id, true),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      saveInvitation(accountId, input(), i.id, 2),
    ).rejects.toMatchObject({ status: 403 });
  });
});
describe("Service orders and payment trust", () => {
  it("server snapshots catalog price and benefits; later price updates cannot alter the order", async () => {
    const i = await draft();
    const o = await createServiceOrder(accountId, i.id, planId, randomUUID());
    await prisma.servicePlan.update({
      where: { id: planId },
      data: { price: 999000, maxPhotos: 40 },
    });
    await confirmPayment(o.id, "snapshot-transfer", 199000, "manual");
    const stored = await prisma.serviceOrder.findUniqueOrThrow({
      where: { id: o.id },
    });
    expect(stored.total).toBe(199000);
    expect(stored.maxPhotos).toBe(12);
  });
  it("purchase replay is idempotent and a mismatched replay is rejected", async () => {
    const i = await draft();
    const clientId = randomUUID();
    const o = await createServiceOrder(accountId, i.id, planId, clientId);
    expect(
      (await createServiceOrder(accountId, i.id, planId, clientId)).id,
    ).toBe(o.id);
    await expect(
      createServiceOrder(
        otherId,
        (await saveInvitation(otherId, { ...input(), slug: "other-wedding" }))
          .id,
        planId,
        clientId,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(await prisma.serviceOrder.count()).toBe(1);
  });
  it("rejects short/overpaid transfers and keeps entitlement inactive", async () => {
    const i = await draft();
    const o = await createServiceOrder(accountId, i.id, planId, randomUUID());
    for (const amount of [1, 199001])
      await expect(
        confirmPayment(o.id, "bad-transfer", amount, "sepay"),
      ).rejects.toMatchObject({ status: 400 });
    expect(await entitlement(i.id)).toBeNull();
    expect(await prisma.weddingPayment.count()).toBe(0);
  });
  it("payment replay does not extend twice; transaction cannot activate another order", async () => {
    const i = await draft();
    const o = await createServiceOrder(accountId, i.id, planId, randomUUID());
    const paid = await confirmPayment(o.id, "sepay:1", o.total, "sepay");
    const replay = await confirmPayment(o.id, "sepay:1", o.total, "sepay");
    expect(replay.expiresAt).toEqual(paid.expiresAt);
    expect(await prisma.weddingPayment.count()).toBe(1);
    const next = await createServiceOrder(
      accountId,
      i.id,
      planId,
      randomUUID(),
    );
    await expect(
      confirmPayment(next.id, "sepay:1", next.total, "sepay"),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("cancelled orders cannot be paid", async () => {
    const i = await draft();
    const o = await createServiceOrder(accountId, i.id, planId, randomUUID());
    await prisma.serviceOrder.update({
      where: { id: o.id },
      data: { status: "cancelled" },
    });
    await expect(
      confirmPayment(o.id, "cancelled-transfer", o.total, "manual"),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("renewal adds time after current expiry", async () => {
    const i = await draft();
    const first = await activate(i.id);
    const second = await activate(i.id);
    expect(second.expiresAt!.getTime()).toBeGreaterThan(
      first.expiresAt!.getTime() + 300 * 86400_000,
    );
  });
});
describe("Guest responses", () => {
  it("drafts reject public responses and invalid event indices are rejected", async () => {
    const i = await draft();
    const response = {
      clientId: randomUUID(),
      name: "Khách thử",
      attendance: "attending",
      partySize: 2,
      eventIndex: 0,
      message: "Chúc mừng",
    };
    await expect(submitResponse(i.slug, response)).rejects.toMatchObject({
      status: 404,
    });
    await activate(i.id);
    await publishInvitation(accountId, i.id, true);
    await expect(
      submitResponse(i.slug, { ...response, eventIndex: 3 }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("replayed RSVP updates party size; wishes stay private pending approval", async () => {
    const i = await draft();
    await activate(i.id);
    await publishInvitation(accountId, i.id, true);
    const response = {
      clientId: randomUUID(),
      name: "Khách thử",
      attendance: "attending",
      partySize: 2,
      eventIndex: 0,
      message: "<script>alert(1)</script>",
    };
    await submitResponse(i.slug, response);
    await submitResponse(i.slug, { ...response, partySize: 3 });
    expect(await prisma.guestResponse.count()).toBe(1);
    const stored = await prisma.guestResponse.findFirstOrThrow();
    expect(stored.partySize).toBe(3);
    expect(stored.wishStatus).toBe("pending");
  });
  it("one personal invitation has one RSVP across devices; declined has zero party size", async () => {
    const i = await draft();
    await activate(i.id);
    await publishInvitation(accountId, i.id, true);
    const guest = await prisma.weddingGuest.create({
      data: { invitationId: i.id, name: "Bạn Lan", token: randomUUID() },
    });
    const response = {
      clientId: randomUUID(),
      guestToken: guest.token,
      name: guest.name,
      attendance: "attending",
      partySize: 2,
      eventIndex: 0,
      message: "Chúc mừng",
    };
    await submitResponse(i.slug, response);
    await submitResponse(i.slug, {
      ...response,
      clientId: randomUUID(),
      attendance: "declined",
    });
    expect(await prisma.guestResponse.count()).toBe(1);
    expect((await prisma.guestResponse.findFirstOrThrow()).partySize).toBe(0);
    await expect(
      submitResponse(i.slug, { ...response, guestToken: "wrong-token" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("Authenticated SePay webhook", () => {
  const secret = "test-only-sepay-secret-with-over-32-chars";
  beforeEach(() => {
    vi.stubEnv("SEPAY_WEBHOOK_API_KEY", secret);
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", "123456789");
  });
  afterEach(() => vi.unstubAllEnvs());
  const request = (data: unknown, auth = `Apikey ${secret}`) =>
    new Request("http://localhost/api/payments/sepay", {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  const payload = (code: string) => ({
    id: 123,
    transferType: "in",
    transferAmount: 199000,
    accountNumber: "123456789",
    code,
    content: code,
  });
  it("refuses forged authentication", async () => {
    expect(
      (await sepayWebhook(request(payload("HY123456789012"), "Apikey invalid")))
        .status,
    ).toBe(401);
  });
  it("disabled configuration fails closed", async () => {
    vi.stubEnv("SEPAY_WEBHOOK_API_KEY", "");
    expect(
      (await sepayWebhook(request(payload("HY123456789012")))).status,
    ).toBe(503);
  });
  it("ignores outgoing money and wrong bank accounts", async () => {
    const i = await draft();
    const o = await createServiceOrder(accountId, i.id, planId, randomUUID());
    for (const data of [
      { ...payload(o.code), transferType: "out" },
      { ...payload(o.code), accountNumber: "999" },
    ])
      expect((await sepayWebhook(request(data))).status).toBe(200);
    expect(await entitlement(i.id)).toBeNull();
  });
  it("correct webhook activates once and retries keep the same expiry", async () => {
    const i = await draft();
    const o = await createServiceOrder(accountId, i.id, planId, randomUUID());
    expect((await sepayWebhook(request(payload(o.code)))).status).toBe(200);
    const first = await entitlement(i.id);
    expect(first).not.toBeNull();
    expect((await sepayWebhook(request(payload(o.code)))).status).toBe(200);
    expect((await entitlement(i.id))?.expiresAt).toEqual(first?.expiresAt);
    expect(await prisma.weddingPayment.count()).toBe(1);
  });
  it("mismatched amount cannot activate", async () => {
    const i = await draft();
    const o = await createServiceOrder(accountId, i.id, planId, randomUUID());
    expect(
      (await sepayWebhook(request({ ...payload(o.code), transferAmount: 1 })))
        .status,
    ).toBe(400);
    expect(await entitlement(i.id)).toBeNull();
  });
});

it("keeps event indices stable once guests have responded", async () => {
  const invitation = await draft();
  await activate(invitation.id);
  await publishInvitation(accountId, invitation.id, true);
  await submitResponse(invitation.slug, {
    clientId: randomUUID(),
    name: "Khách thử",
    attendance: "attending",
    partySize: 1,
    eventIndex: 1,
    message: "",
  });
  const current = await prisma.invitation.findUniqueOrThrow({
    where: { id: invitation.id },
  });
  await expect(
    saveInvitation(
      accountId,
      { ...input(), events: input().events.slice(1) },
      current.id,
      current.version,
    ),
  ).rejects.toMatchObject({ status: 409 });
});
