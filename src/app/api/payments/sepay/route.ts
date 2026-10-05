import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";
import { readJsonBody } from "@/server/http/read-json-body";
import { merchantSettings, paymentReadiness } from "@/server/wedding/settings";
import { confirmPayment, WeddingError } from "@/server/wedding/service";

export async function POST(request: Request) {
  const secret = process.env.SEPAY_WEBHOOK_API_KEY;
  if (!secret || secret.length < 32 || !process.env.SEPAY_ACCOUNT_NUMBER)
    return Response.json({ success: false }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Apikey ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json({ success: false }, { status: 401 });
  const body = await readJsonBody(request, { maxBytes: 16_000 });
  if (!body.ok)
    return Response.json({ success: false }, { status: body.status });
  const parsed = z
    .object({
      id: z.number().int().positive(),
      transferType: z.enum(["in", "out"]),
      transferAmount: z.number().int().positive(),
      accountNumber: z.string(),
      code: z.string().nullable().optional(),
      content: z.string().max(2000),
    })
    .safeParse(body.data);
  if (!parsed.success)
    return Response.json({ success: false }, { status: 400 });
  const payment = parsed.data;
  if (
    payment.transferType !== "in" ||
    payment.accountNumber !== process.env.SEPAY_ACCOUNT_NUMBER
  )
    return Response.json({ success: true });
  const code = (payment.code || payment.content)
    .match(/\bHY[A-F0-9]{12}\b/i)?.[0]
    .toUpperCase();
  if (!code) return Response.json({ success: true });
  try {
    const merchant = await merchantSettings();
    if (!paymentReadiness(merchant).automaticReady)
      return Response.json(
        {
          success: false,
          message: "Cấu hình tài khoản nhận tiền chưa đồng bộ",
        },
        { status: 503 },
      );
    const order = await prisma.serviceOrder.findUnique({ where: { code } });
    if (!order || order.status === "cancelled")
      return Response.json({ success: true });
    await confirmPayment(
      order.id,
      `sepay:${payment.id}`,
      payment.transferAmount,
      "sepay",
    );
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof WeddingError)
      return Response.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    logger.error("sepay_webhook_error", { correlationId: crypto.randomUUID() });
    return Response.json({ success: false }, { status: 500 });
  }
}
