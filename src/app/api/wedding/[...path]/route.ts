import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { planSchema, templateSchema } from "@/lib/wedding";
import { prisma } from "@/server/db/prisma";
import { readJsonBody } from "@/server/http/read-json-body";
import {
  admin,
  customer,
  mutationLimit,
  safeOrigin,
} from "@/server/wedding/guards";
import {
  confirmPayment,
  createServiceOrder,
  ownedInvitation,
  publishInvitation,
  saveInvitation,
  submitResponse,
  WeddingError,
} from "@/server/wedding/service";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function failure(error: unknown) {
  if (error instanceof WeddingError)
    return json({ ok: false, message: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json(
      {
        ok: false,
        message: error.issues[0]?.message || "Dữ liệu không hợp lệ",
      },
      400,
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return json(
      { ok: false, message: "Mã hoặc đường dẫn đã được sử dụng" },
      409,
    );
  const correlationId = crypto.randomUUID();
  logger.error("wedding_api_error", {
    correlationId,
    errorClass: error instanceof Error ? error.name : "Unknown",
  });
  return json(
    {
      ok: false,
      message: "Chưa thực hiện được thao tác. Vui lòng thử lại.",
      correlationId,
    },
    500,
  );
}
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    safeOrigin(request);
    const path = (await context.params).path;
    const body = await readJsonBody(request, { maxBytes: 64_000 });
    if (!body.ok)
      return json({ ok: false, message: body.message }, body.status);
    if (path[0] === "rsvp" && path.length === 2) {
      await mutationLimit(request, "rsvp");
      return json({ ok: true, data: await submitResponse(path[1], body.data) });
    }
    if (path[0] === "admin") {
      const principal = await admin(request);
      await mutationLimit(request, "admin", principal.id);
      const entityId = z.looseObject({ id: z.string().min(1) });
      if (path[1] === "templates") {
        const { id, ...data } = templateSchema.parse(body.data);
        if (id) {
          const old = await prisma.weddingTemplate.findUniqueOrThrow({
            where: { id },
          });
          if (
            old.premium !== data.premium &&
            (await prisma.invitation.count({
              where: { templateId: id, status: "published" },
            }))
          )
            throw new WeddingError(
              409,
              "Thuộc tính cao cấp đang được dùng bởi thiệp xuất bản; hãy tạo mẫu mới.",
            );
        }
        const row = id
          ? await prisma.weddingTemplate.update({ where: { id }, data })
          : await prisma.weddingTemplate.create({ data });
        await audit(principal.id, "template.save", row.id);
        return json({ ok: true });
      }
      if (path[1] === "plans") {
        const { id, ...data } = planSchema.parse(body.data);
        const row = id
          ? await prisma.servicePlan.update({ where: { id }, data })
          : await prisma.servicePlan.create({ data });
        await audit(principal.id, "plan.save", row.id);
        return json({ ok: true });
      }
      if (path[1] === "confirm-payment") {
        const input = z
          .strictObject({
            id: z.string(),
            transactionId: z.string().trim().min(4).max(100),
            amount: z.number().int().min(0),
          })
          .parse(body.data);
        return json({
          ok: true,
          data: await confirmPayment(
            input.id,
            `manual:${input.transactionId}`,
            input.amount,
            "manual",
            principal.id,
          ),
        });
      }
      if (path[1] === "invitation-status") {
        const input = z
          .strictObject({ id: z.string(), suspended: z.boolean() })
          .parse(body.data);
        await prisma.invitation.update({
          where: { id: input.id },
          data: {
            status: input.suspended ? "suspended" : "draft",
            version: { increment: 1 },
          },
        });
        await audit(
          principal.id,
          input.suspended ? "invitation.suspend" : "invitation.restore",
          input.id,
        );
        return json({ ok: true });
      }
      if (path[1] === "customer-status") {
        const input = z
          .strictObject({ id: z.string(), disabled: z.boolean() })
          .parse(body.data);
        await prisma.$transaction(async (tx) => {
          await tx.customerAccount.update({
            where: { id: input.id },
            data: { disabledAt: input.disabled ? new Date() : null },
          });
          if (input.disabled)
            await tx.customerSession.updateMany({
              where: { accountId: input.id },
              data: { revokedAt: new Date() },
            });
          await tx.adminAuditEvent.create({
            data: {
              identityId: principal.id,
              action: input.disabled ? "customer.disable" : "customer.enable",
              entityType: "customer",
              entityId: input.id,
            },
          });
        });
        return json({ ok: true });
      }
      if (path[1] === "cancel-order") {
        const { id } = entityId.parse(body.data);
        const result = await prisma.serviceOrder.updateMany({
          where: { id, status: "pending" },
          data: { status: "cancelled" },
        });
        if (!result.count)
          throw new WeddingError(409, "Chỉ hủy được đơn đang chờ thanh toán");
        await audit(principal.id, "order.cancel", id);
        return json({ ok: true });
      }
      if (path[1] === "settings") {
        const input = z
          .strictObject({
            bank: z.string().regex(/^\d{6}$|^$/),
            account: z.string().regex(/^[a-zA-Z0-9]{5,30}$|^$/),
            name: z.string().trim().max(100),
            support: z.string().trim().max(150),
          })
          .parse(body.data);
        if (
          (input.bank || input.account || input.name) &&
          !(input.bank && input.account && input.name)
        )
          throw new WeddingError(400, "Điền đủ thông tin ngân hàng");
        await prisma.setting.upsert({
          where: { key: "wedding.merchant" },
          create: { key: "wedding.merchant", value: JSON.stringify(input) },
          update: { value: JSON.stringify(input) },
        });
        await audit(principal.id, "settings.save", "merchant");
        return json({ ok: true });
      }
      throw new WeddingError(404, "Không tìm thấy thao tác");
    }
    const session = await customer();
    await mutationLimit(request, "customer", session.accountId);
    if (path[0] === "invitations" && path.length === 1) {
      const input = z
        .strictObject({
          invitation: z.unknown(),
          id: z.string().optional(),
          version: z.number().int().optional(),
        })
        .parse(body.data);
      const row = await saveInvitation(
        session.accountId,
        input.invitation as Parameters<typeof saveInvitation>[1],
        input.id,
        input.version,
      );
      return json({ ok: true, data: { id: row.id, version: row.version } });
    }
    if (path[0] === "publish") {
      const { id, publish } = z
        .strictObject({ id: z.string(), publish: z.boolean() })
        .parse(body.data);
      await publishInvitation(session.accountId, id, publish);
      return json({ ok: true });
    }
    if (path[0] === "orders") {
      const input = z
        .strictObject({
          invitationId: z.string(),
          planId: z.string(),
          clientId: z.uuid(),
        })
        .parse(body.data);
      const row = await createServiceOrder(
        session.accountId,
        input.invitationId,
        input.planId,
        input.clientId,
      );
      return json({ ok: true, data: { id: row.id } });
    }
    if (path[0] === "payment-note") {
      const input = z
        .strictObject({
          id: z.string(),
          note: z.string().trim().min(4).max(300),
        })
        .parse(body.data);
      const result = await prisma.serviceOrder.updateMany({
        where: {
          id: input.id,
          accountId: session.accountId,
          status: "pending",
        },
        data: { paymentNote: input.note },
      });
      if (!result.count)
        throw new WeddingError(409, "Đơn không còn chờ thanh toán");
      return json({ ok: true });
    }
    if (path[0] === "guests") {
      const input = z
        .strictObject({
          invitationId: z.string(),
          name: z.string().trim().min(2).max(100),
          group: z.string().trim().min(1).max(80),
        })
        .parse(body.data);
      await ownedInvitation(input.invitationId, session.accountId);
      if (
        (await prisma.weddingGuest.count({
          where: { invitationId: input.invitationId },
        })) >= 2000
      )
        throw new WeddingError(
          400,
          "Thiệp hỗ trợ tối đa 2.000 lời mời cá nhân",
        );
      await prisma.weddingGuest.create({
        data: { ...input, token: randomBytes(24).toString("base64url") },
      });
      return json({ ok: true });
    }
    if (path[0] === "moderate") {
      const input = z
        .strictObject({
          id: z.string(),
          status: z.enum(["approved", "hidden"]),
        })
        .parse(body.data);
      const response = await prisma.guestResponse.findFirst({
        where: { id: input.id, invitation: { ownerId: session.accountId } },
      });
      if (!response) throw new WeddingError(404, "Không tìm thấy lời chúc");
      await prisma.guestResponse.update({
        where: { id: input.id },
        data: { wishStatus: input.status },
      });
      return json({ ok: true });
    }
    throw new WeddingError(404, "Không tìm thấy thao tác");
  } catch (error) {
    return failure(error);
  }
}
async function audit(identityId: string, action: string, entityId: string) {
  await prisma.adminAuditEvent.create({
    data: { identityId, action, entityId, entityType: "wedding" },
  });
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await context.params).path;
    if (path[0] !== "export" || !path[1])
      throw new WeddingError(404, "Không tìm thấy dữ liệu");
    const session = await customer();
    await ownedInvitation(path[1], session.accountId);
    const rows = await prisma.guestResponse.findMany({
      where: { invitationId: path[1] },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
    const csv =
      "\uFEFF" +
      [
        ["Tên", "Tham dự", "Số người", "Tiệc", "Lời chúc", "Ngày gửi"],
        ...rows.map((r) => [
          r.name,
          r.attendance === "attending"
            ? "Có"
            : r.attendance === "declined"
              ? "Không"
              : "Chưa rõ",
          r.partySize,
          r.eventIndex + 1,
          r.message,
          r.createdAt.toISOString(),
        ]),
      ]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="khach-moi.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
