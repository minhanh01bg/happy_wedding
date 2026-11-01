import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { logger } from "@/lib/logger";
import { isMp3 } from "@/lib/wedding-music";
import {
  MAX_UPLOAD_MUSIC_BYTES,
  UPLOAD_MUSIC_TOO_LARGE,
  UPLOAD_MUSIC_TYPE_INVALID,
} from "@/lib/wedding-upload";
import { customer, mutationLimit, safeOrigin } from "@/server/wedding/guards";
import { prisma } from "@/server/db/prisma";
import {
  ownedInvitation,
  reserveUpload,
  WeddingError,
} from "@/server/wedding/service";

/**
 * Nhạc nền riêng của thiệp (ADR 0010). Cùng guard, rate-limit và quota với
 * route ảnh, nhưng không giải mã hay mã hóa lại: chỉ đọc body có giới hạn,
 * kiểm byte là MP3 rồi lưu nguyên tệp dưới tên do server đặt. Body là raw
 * bytes như route ảnh; Content-Type và tên tệp của khách không được dùng.
 */
export async function POST(request: Request) {
  try {
    safeOrigin(request);
    const session = await customer();
    const id = new URL(request.url).searchParams.get("invitationId");
    if (!id) throw new WeddingError(400, "Lưu bản nháp trước khi tải nhạc");
    await ownedInvitation(id, session.accountId);
    await mutationLimit(request, "upload", session.accountId);
    if (!request.body) throw new WeddingError(400, UPLOAD_MUSIC_TYPE_INVALID);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = request.body.getReader();
    while (true) {
      const { done, value } = await reader.read().catch((error: unknown) => {
        // The client left mid-body (499 like the image route): not a failure.
        if (request.signal.aborted)
          throw new WeddingError(499, "Đã hủy tải nhạc");
        throw error;
      });
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_UPLOAD_MUSIC_BYTES) {
        await reader.cancel();
        throw new WeddingError(413, UPLOAD_MUSIC_TOO_LARGE);
      }
      chunks.push(value);
    }
    const input = Buffer.concat(chunks, bytes);
    if (!isMp3(input)) throw new WeddingError(400, UPLOAD_MUSIC_TYPE_INVALID);
    const dir = path.join(process.cwd(), "public/uploads/weddings");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.mp3`;
    const upload = await reserveUpload(
      session.accountId,
      id,
      filename,
      input.byteLength,
    );
    try {
      await writeFile(path.join(dir, filename), input);
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
    logger.error("wedding_upload_music_error", {
      correlationId,
      errorClass: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json(
      { ok: false, message: "Chưa tải được nhạc", correlationId },
      { status: 500 },
    );
  }
}
