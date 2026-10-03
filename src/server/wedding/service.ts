import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import {
  invitationSchema,
  readEvents,
  readPhotos,
  responseSchema,
  type InvitationInput,
} from "@/lib/wedding";

export class WeddingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function ownedInvitation(id: string, ownerId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id, ownerId },
    include: { template: true },
  });
  if (!invitation) throw new WeddingError(404, "Không tìm thấy thiệp");
  return invitation;
}
export async function entitlement(invitationId: string) {
  return prisma.serviceOrder.findFirst({
    where: { invitationId, status: "paid", expiresAt: { gt: new Date() } },
    orderBy: [{ maxPhotos: "desc" }, { expiresAt: "desc" }],
  });
}
export async function publicInvitation(slug: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { slug, status: "published", owner: { disabledAt: null } },
    include: { template: true },
  });
  if (!invitation || !(await entitlement(invitation.id))) return null;
  return invitation;
}
export async function saveInvitation(
  ownerId: string,
  raw: InvitationInput,
  id?: string,
  version?: number,
) {
  const input = invitationSchema.parse(raw);
  const existing = id ? await ownedInvitation(id, ownerId) : null;
  if (existing?.status === "suspended")
    throw new WeddingError(
      403,
      "Thiệp đang tạm khóa. Vui lòng liên hệ quản trị viên.",
    );
  if (existing && version !== existing.version)
    throw new WeddingError(
      409,
      "Thiệp đã được sửa ở cửa sổ khác. Hãy tải lại trước khi lưu.",
    );
  if (
    existing &&
    existing.slug !== input.slug &&
    existing.status === "published"
  )
    throw new WeddingError(
      409,
      "Thu hồi thiệp trước khi đổi đường dẫn để bảo vệ lời mời đã gửi.",
    );
  const template = await prisma.weddingTemplate.findFirst({
    where: { id: input.templateId, active: true },
  });
  if (!template)
    throw new WeddingError(400, "Mẫu thiệp không còn được cung cấp");
  if (
    existing &&
    input.events.length !== readEvents(existing.eventsJson).length &&
    (await prisma.guestResponse.count({ where: { invitationId: existing.id } }))
  ) {
    throw new WeddingError(
      409,
      "Đã có khách phản hồi. Không thêm hoặc bỏ tiệc; hãy chỉnh nội dung từng tiệc hiện có.",
    );
  }
  const access = id ? await entitlement(id) : null;
  if (input.photos.length > (access?.maxPhotos ?? 12))
    throw new WeddingError(
      400,
      "Số ảnh vượt giới hạn gói hiện tại (bản nháp: 12 ảnh)",
    );
  if (
    existing?.status === "published" &&
    template.premium &&
    !access?.premiumTemplates
  )
    throw new WeddingError(403, "Gói hiện tại chưa hỗ trợ mẫu cao cấp");
  const { events, photos, weddingDate, ...fields } = input;
  const data = {
    ...fields,
    weddingDate: new Date(weddingDate),
    eventsJson: JSON.stringify(events),
    photosJson: JSON.stringify(photos),
  };
  try {
    if (existing) {
      const updated = await prisma.invitation.updateMany({
        where: { id: existing.id, ownerId, version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!updated.count)
        throw new WeddingError(409, "Thiệp đã thay đổi. Hãy tải lại trang.");
      return prisma.invitation.findUniqueOrThrow({
        where: { id: existing.id },
      });
    }
    return await prisma.invitation.create({ data: { ...data, ownerId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new WeddingError(
        409,
        "Đường dẫn này đã được dùng. Hãy chọn đường dẫn khác.",
      );
    throw e;
  }
}
export async function publishInvitation(
  ownerId: string,
  id: string,
  publish: boolean,
) {
  const invitation = await ownedInvitation(id, ownerId);
  if (invitation.status === "suspended")
    throw new WeddingError(403, "Thiệp đang tạm khóa bởi quản trị viên");
  if (publish) {
    const access = await entitlement(id);
    if (!access)
      throw new WeddingError(
        403,
        "Cần thanh toán gói dịch vụ còn hiệu lực để xuất bản",
      );
    if (invitation.template.premium && !access.premiumTemplates)
      throw new WeddingError(403, "Mẫu này cần gói có mẫu cao cấp");
    if (readPhotos(invitation.photosJson).length > access.maxPhotos)
      throw new WeddingError(400, "Số ảnh vượt giới hạn gói");
    invitationSchema.parse({
      weddingDate: invitation.weddingDate.toISOString(),
      events: readEvents(invitation.eventsJson),
      photos: readPhotos(invitation.photosJson),
      templateId: invitation.templateId,
      slug: invitation.slug,
      groom: invitation.groom,
      bride: invitation.bride,
      headline: invitation.headline,
      story: invitation.story,
      groomParents: invitation.groomParents,
      brideParents: invitation.brideParents,
      coverUrl: invitation.coverUrl,
      musicUrl: invitation.musicUrl,
      giftBank: invitation.giftBank,
      giftAccount: invitation.giftAccount,
      giftName: invitation.giftName,
      brideGiftBank: invitation.brideGiftBank,
      brideGiftAccount: invitation.brideGiftAccount,
      brideGiftName: invitation.brideGiftName,
    });
  }
  const result = await prisma.invitation.updateMany({
    where: {
      id,
      ownerId,
      version: invitation.version,
      status: { not: "suspended" },
    },
    data: {
      status: publish ? "published" : "draft",
      version: { increment: 1 },
    },
  });
  if (!result.count)
    throw new WeddingError(
      409,
      "Thiệp đã thay đổi. Hãy tải lại trước khi xuất bản.",
    );
}
export async function createServiceOrder(
  accountId: string,
  invitationId: string,
  planId: string,
  clientId: string,
) {
  await ownedInvitation(invitationId, accountId);
  return prisma.$transaction(async (tx) => {
    const previous = await tx.serviceOrder.findUnique({ where: { clientId } });
    if (previous) {
      if (
        previous.accountId !== accountId ||
        previous.invitationId !== invitationId ||
        previous.planId !== planId
      )
        throw new WeddingError(
          409,
          "Mã yêu cầu đã được dùng cho giao dịch khác",
        );
      return previous;
    }
    const plan = await tx.servicePlan.findFirst({
      where: { id: planId, active: true },
    });
    if (!plan) throw new WeddingError(400, "Gói dịch vụ không còn được bán");
    const pending = await tx.serviceOrder.findFirst({
      where: { accountId, invitationId, planId, status: "pending" },
    });
    if (pending) return pending;
    return tx.serviceOrder.create({
      data: {
        code: `HY${randomBytes(6).toString("hex").toUpperCase()}`,
        clientId,
        accountId,
        invitationId,
        planId,
        planName: plan.name,
        total: plan.price,
        months: plan.months,
        maxPhotos: plan.maxPhotos,
        premiumTemplates: plan.premiumTemplates,
        removeBranding: plan.removeBranding,
      },
    });
  });
}
/** The only payment activation path; transaction IDs are globally unique and retries are harmless. */
export async function confirmPayment(
  orderId: string,
  transactionId: string,
  amount: number,
  provider: "manual" | "sepay",
  identityId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const prior = await tx.weddingPayment.findUnique({
      where: { transactionId },
    });
    if (prior) {
      if (prior.orderId !== orderId || prior.amount !== amount)
        throw new WeddingError(409, "Giao dịch đã được dùng cho đơn khác");
      return tx.serviceOrder.findUniqueOrThrow({ where: { id: orderId } });
    }
    const order = await tx.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new WeddingError(404, "Không tìm thấy đơn");
    if (order.status === "paid") return order;
    if (order.status !== "pending")
      throw new WeddingError(409, "Chỉ xác nhận được đơn đang chờ thanh toán");
    if (amount !== order.total)
      throw new WeddingError(400, "Số tiền phải khớp chính xác đơn dịch vụ");
    const now = new Date();
    const current = await tx.serviceOrder.findFirst({
      where: {
        invitationId: order.invitationId,
        status: "paid",
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "desc" },
    });
    const expiresAt = new Date(current?.expiresAt ?? now);
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + order.months);
    await tx.weddingPayment.create({
      data: { orderId, transactionId, amount, provider },
    });
    const result = await tx.serviceOrder.update({
      where: { id: orderId },
      data: { status: "paid", paidAt: now, expiresAt },
    });
    await tx.adminAuditEvent.create({
      data: {
        identityId,
        action: "payment.confirm",
        entityType: "service-order",
        entityId: orderId,
        metadata: JSON.stringify({ provider, amount, transactionId }),
      },
    });
    return result;
  });
}
export async function submitResponse(slug: string, raw: unknown) {
  const input = responseSchema.parse(raw);
  const invitation = await publicInvitation(slug);
  if (!invitation) throw new WeddingError(404, "Thiệp chưa sẵn sàng");
  if (input.eventIndex >= readEvents(invitation.eventsJson).length)
    throw new WeddingError(400, "Tiệc được chọn không hợp lệ");
  const guest = input.guestToken
    ? await prisma.weddingGuest.findFirst({
        where: { invitationId: invitation.id, token: input.guestToken },
      })
    : null;
  if (input.guestToken && !guest)
    throw new WeddingError(400, "Lời mời cá nhân không hợp lệ");
  const clientId = guest ? guest.id : input.clientId;
  const data = {
    name: input.name,
    attendance: input.attendance,
    partySize: input.attendance === "attending" ? input.partySize : 0,
    eventIndex: input.eventIndex,
    message: input.message,
    guestId: guest?.id,
    wishStatus: "pending",
  };
  return prisma.guestResponse.upsert({
    where: { invitationId_clientId: { invitationId: invitation.id, clientId } },
    create: { ...data, clientId, invitationId: invitation.id },
    update: data,
    select: { id: true },
  });
}
