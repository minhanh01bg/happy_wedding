import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { open, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { logger } from "@/lib/logger";

/**
 * Serves files the upload routes write after `next build` (ADR 0011).
 *
 * `next start` lists `public/` once at boot, so a photo or MP3 uploaded later
 * would 404, and the image optimizer, which fetches local URLs through the
 * same router, could not read it either. Files present at boot are still
 * served by Next itself; this handler only sees the newer ones.
 */
export const WEDDING_UPLOAD_DIR = path.join("public", "uploads", "weddings");

const CONTENT_TYPES = new Map([
  ["webp", "image/webp"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["mp3", "audio/mpeg"],
]);

/** One plain file name: no separator, no dot file, one lowercase extension. */
const FILE_NAME = /^[A-Za-z0-9_-]{1,128}\.([a-z0-9]{2,4})$/;

/** Content-Type for an allowed upload name, or null for any other name. */
export function uploadContentType(name: string): string | null {
  const match = FILE_NAME.exec(name);
  return (match && CONTENT_TYPES.get(match[1])) || null;
}

export type ByteRange = { start: number; end: number };

/**
 * One `bytes=` range (RFC 9110 §14). Returns null to send the whole file, for
 * no header, a malformed or invalid one, or several ranges, which a server
 * may ignore; "unsatisfiable" means 416.
 */
export function parseRange(
  header: string | null,
  size: number,
): ByteRange | null | "unsatisfiable" {
  const match = header && /^bytes=(\d{0,15})-(\d{0,15})$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const last = size - 1;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (suffix === 0 || size === 0) return "unsatisfiable";
    return { start: Math.max(0, size - suffix), end: last };
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : last;
  if (match[2] && end < start) return null;
  if (start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, last) };
}

const COMMON_HEADERS = { "X-Content-Type-Options": "nosniff" };

function notFound() {
  return new Response("Not Found", {
    status: 404,
    headers: {
      ...COMMON_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** The name is a single segment, so these mean "no such file" here. */
const MISSING = new Set(["ENOENT", "ENOTDIR", "ELOOP", "EISDIR"]);

function errorCode(error: unknown) {
  return error instanceof Error && "code" in error
    ? String((error as NodeJS.ErrnoException).code)
    : undefined;
}

export interface ServeUploadOptions {
  /** Absolute folder to read from; defaults to the upload routes' folder. */
  root?: string;
  /** False for HEAD: same status and headers, no body. */
  withBody?: boolean;
}

export async function serveUpload(
  request: Request,
  name: string,
  {
    root = path.join(process.cwd(), WEDDING_UPLOAD_DIR),
    withBody = true,
  }: ServeUploadOptions = {},
): Promise<Response> {
  const contentType = uploadContentType(name);
  if (!contentType) return notFound();

  let handle: FileHandle | undefined;
  try {
    // The name cannot leave `root`. O_NOFOLLOW refuses a symlink as the file
    // itself, wherever it points; the folder above may still be a symlink.
    handle = await open(
      path.join(root, name),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    const stats = await handle.stat();
    if (!stats.isFile()) {
      await handle.close();
      return notFound();
    }
    const size = stats.size;
    const headers: Record<string, string> = {
      ...COMMON_HEADERS,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      // Names are random UUIDs written once and never rewritten.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": stats.mtime.toUTCString(),
    };
    const range = withBody
      ? parseRange(request.headers.get("range"), size)
      : null;
    if (range === "unsatisfiable") {
      await handle.close();
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${size}` },
      });
    }
    const start = range?.start ?? 0;
    const end = range?.end ?? size - 1;
    if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    headers["Content-Length"] = String(end - start + 1);
    const status = range ? 206 : 200;
    if (!withBody || size === 0) {
      await handle.close();
      return new Response(null, { status, headers });
    }
    // The stream closes the handle when it ends, fails or is cancelled.
    const body = Readable.toWeb(
      handle.createReadStream({ start, end }),
    ) as unknown as ReadableStream<Uint8Array>;
    return new Response(body, { status, headers });
  } catch (error) {
    await handle?.close().catch(() => undefined);
    const code = errorCode(error);
    if (code && MISSING.has(code)) return notFound();
    const correlationId = randomUUID();
    logger.error("upload_serve_error", {
      correlationId,
      errorClass: error instanceof Error ? error.name : "Unknown",
      errorCode: code,
    });
    return new Response(`Internal Server Error (${correlationId})`, {
      status: 500,
      headers: {
        ...COMMON_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
