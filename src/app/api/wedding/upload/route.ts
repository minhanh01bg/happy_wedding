import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Sharp } from "sharp";

import { logger } from "@/lib/logger";
import {
  decodeCostBytes,
  MAX_UPLOAD_DECODE_BYTES,
  MAX_UPLOAD_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_PIXELS,
  MAX_UPLOAD_IMAGE_SIDE,
  UPLOAD_IMAGE_DECODE_TOO_LARGE,
  UPLOAD_IMAGE_INVALID,
  UPLOAD_IMAGE_SIDE_TOO_LARGE,
  UPLOAD_IMAGE_TOO_LARGE,
  UPLOAD_IMAGE_TYPE_INVALID,
  UPLOAD_SERVER_BUSY,
} from "@/lib/wedding-upload";
import { customer, mutationLimit, safeOrigin } from "@/server/wedding/guards";
import { prisma } from "@/server/db/prisma";
import {
  ownedInvitation,
  reserveUpload,
  WeddingError,
} from "@/server/wedding/service";
import { createSlots, SlotsBusyError } from "@/server/wedding/slots";

const IMAGE_FORMATS = ["jpeg", "png", "webp"];

/**
 * A full-resolution encode takes about 6 s and 350-470 MB of RAM for a 45 MP
 * 8-bit JPEG, and up to about 800 MB inside the decode budget, so this process
 * runs at most two at once. Later uploads wait their turn; only a full queue or a long wait
 * gets 503. The editor sends one photo at a time.
 */
const encodeSlots = createSlots({ slots: 2, queue: 10, waitMs: 60_000 });

/**
 * Reads only the header, so every check here runs before the image takes an
 * encode slot or is decoded.
 */
async function inspect(input: Buffer) {
  const image = sharp(input, {
    limitInputPixels: MAX_UPLOAD_IMAGE_PIXELS,
    animated: false,
  });
  const metadata = await image.metadata().catch(() => {
    throw new WeddingError(400, UPLOAD_IMAGE_INVALID);
  });
  const { format, width = 0, height = 0 } = metadata;
  // Content-Type is only a label; Sharp also reads TIFF, GIF, SVG, HEIF...
  if (!format || !IMAGE_FORMATS.includes(format))
    throw new WeddingError(400, UPLOAD_IMAGE_TYPE_INVALID);
  if (Math.max(width, height) > MAX_UPLOAD_IMAGE_SIDE)
    throw new WeddingError(400, UPLOAD_IMAGE_SIDE_TOO_LARGE);
  if (width * height > MAX_UPLOAD_IMAGE_PIXELS)
    throw new WeddingError(400, UPLOAD_IMAGE_INVALID);
  // Encode RAM follows the raw frame, not the file: an 8.5 MB 16-bit RGBA PNG
  // of 32 MP needed about 950 MB. 8-bit RGB up to 64 MP stays under budget.
  if (decodeCostBytes(metadata) > MAX_UPLOAD_DECODE_BYTES)
    throw new WeddingError(400, UPLOAD_IMAGE_DECODE_TOO_LARGE);
  return image;
}

async function encode(image: Sharp) {
  try {
    // Keep full resolution. Re-encoding drops EXIF/GPS/XMP and converts ICC
    // to sRGB, because /uploads is public. effort 2 matches effort 4 in size
    // and quality on a 45 MP photo at about 1/5 of the time and half the RAM.
    return await image.rotate().webp({ quality: 90, effort: 2 }).toBuffer();
  } catch {
    throw new WeddingError(400, UPLOAD_IMAGE_INVALID);
  }
}

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
      throw new WeddingError(400, UPLOAD_IMAGE_TYPE_INVALID);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = request.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_UPLOAD_IMAGE_BYTES) {
        await reader.cancel();
        throw new WeddingError(413, UPLOAD_IMAGE_TOO_LARGE);
      }
      chunks.push(value);
    }
    // One contiguous copy from here on; the chunk list would double the RAM.
    const input = Buffer.concat(chunks, bytes);
    chunks.length = 0;
    const image = await inspect(input);
    const release = await encodeSlots.acquire().catch((error: unknown) => {
      if (!(error instanceof SlotsBusyError)) throw error;
      logger.warn("wedding_upload_busy", { waiting: encodeSlots.waiting });
      throw new WeddingError(503, UPLOAD_SERVER_BUSY);
    });
    let output: Buffer;
    try {
      output = await encode(image);
    } finally {
      release();
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
