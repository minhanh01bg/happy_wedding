import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { logger } from "@/lib/logger";
import { customer, mutationLimit, safeOrigin } from "@/server/wedding/guards";
import { prisma } from "@/server/db/prisma";
import {
  ownedInvitation,
  reserveUpload,
  WeddingError,
} from "@/server/wedding/service";

export async function POST(request: Request) {
  try {
    safeOrigin(request);
    const session = await customer();
    const id = new URL(request.url).searchParams.get("invitationId");
    if (!id) throw new WeddingError(400, "Lưu bản nháp trước khi tải ảnh");
    await ownedInvitation(id, session.accountId);
    await mutationLimit(request, "upload", session.accountId);
    if (
      !request.body ||
      !["image/jpeg", "image/png", "image/webp"].includes(
        request.headers.get("content-type") || "",
      )
    )
      throw new WeddingError(400, "Chỉ nhận ảnh JPEG, PNG hoặc WebP");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = request.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 5 * 1024 * 1024) {
        await reader.cancel();
        throw new WeddingError(413, "Ảnh tối đa 5 MB");
      }
      chunks.push(value);
    }
    let output: Buffer;
    try {
      output = await sharp(Buffer.concat(chunks), {
        limitInputPixels: 40_000_000,
        animated: false,
      })
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw new WeddingError(400, "Tệp ảnh không hợp lệ hoặc quá lớn");
    }
    const dir = path.join(process.cwd(), "public/uploads/weddings");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    const upload = await reserveUpload(
      session.accountId,
      id,
      filename,
      output.byteLength,
    );
    try {
      await writeFile(path.join(dir, filename), output);
    } catch (error) {
      await prisma.weddingUpload.delete({ where: { id: upload.id } });
      throw error;
    }
    return Response.json({
      ok: true,
      data: { url: `/uploads/weddings/${filename}` },
    });
  } catch (error) {
    if (error instanceof WeddingError)
      return Response.json(
        { ok: false, message: error.message },
        { status: error.status },
      );
    const correlationId = randomUUID();
    logger.error("wedding_upload_error", {
      correlationId,
      errorClass: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json(
      { ok: false, message: "Chưa tải được ảnh", correlationId },
      { status: 500 },
    );
  }
}
