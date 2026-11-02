import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp, { type OutputInfo } from "sharp";
import type { Invitation, WeddingTemplate } from "@prisma/client";

import { invitationDesign } from "@/lib/invitation-designs";
import { logger } from "@/lib/logger";
import { readPhotos } from "@/lib/wedding";
import {
  demonstrationPhotos,
  heroCover,
  weddingImageSource,
} from "@/lib/wedding-images";
import { MAX_UPLOAD_IMAGE_PIXELS } from "@/lib/wedding-upload";
import { publicInvitation } from "@/server/wedding/service";
import { createSlots, SlotsBusyError } from "@/server/wedding/slots";

/**
 * Link preview image (og:image) of a public invitation.
 *
 * A 1200×630 JPEG derived from the hero cover, so Messenger, Zalo and iMessage
 * show the couple's photo. The upload itself is never changed. Each result is
 * kept on disk under `.cache/share-images/`, named by a version that changes
 * with the cover, its file and RENDER_REVISION, so a crawler hit decodes the
 * full-resolution original at most once per cover.
 */
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;
export const SHARE_IMAGE_TYPE = "image/jpeg";
export const SHARE_IMAGE_CACHE_DIR = path.join(".cache", "share-images");

/** Bump when the rendering changes, so every og:image URL changes too. */
const RENDER_REVISION = "1";

/**
 * Wider photos (3:2 is 1.5) lose at most about a quarter of their height in
 * the 1.91:1 card, so they are cropped. Narrower ones, portraits above all,
 * would lose two thirds: on full-length couple portraits no crop, attention
 * or fixed, reliably keeps the couple (the stock forest and riverside photos
 * come out as trees and water). They are shown whole on a blurred fill of
 * themselves instead, so no head is ever cut.
 */
const CROP_MIN_RATIO = 1.45;

/**
 * The hero frames its cover with `object-position: 50% 25%`
 * (invitation-hero.module.css). A crop may sit higher than that when the
 * attention point is higher, never lower, so heads stay in the card.
 */
const HERO_TOP_BIAS = 0.25;

/** The two places `imageSchema` lets a cover URL point to, under public/. */
const COVER_URL =
  /^\/(images\/[A-Za-z0-9._-]+|uploads\/weddings\/[a-f0-9-]+\.webp)$/;

export interface ShareImageOptions {
  /** Folder that holds public/ and .cache/; defaults to the working directory. */
  root?: string;
}

export type ShareCover = {
  /** Public URL path of the photo the card is made from. */
  source: string;
  /** That photo on disk. */
  file: string;
  /** Changes with the photo, its file and the rendering; goes in `?v=`. */
  version: string;
};

/** The og:image path for a cover version; it never carries a guest token. */
export function shareImagePath(slug: string, version: string) {
  return `/w/${encodeURIComponent(slug)}/og.jpg?v=${version}`;
}

// Every path.join below that starts from this root is marked turbopackIgnore:
// covers and the cache are runtime data, not files for the build to trace;
// without it the build traces the whole project, public/uploads included.
function projectRoot(root?: string) {
  return root ?? process.cwd();
}

/**
 * Photos to try in order: the cover the hero shows (the design's stock photo
 * on a demonstration, the bundled default when the couple kept it), then the
 * first album photo.
 */
export function shareCoverCandidates(
  invitation: Invitation & { template: WeddingTemplate },
): string[] {
  const photos = demonstrationPhotos(
    readPhotos(invitation.photosJson),
    invitation.isDemo,
  );
  const cover = heroCover(
    invitation,
    invitationDesign(invitation.template).key,
    photos,
  );
  return [
    ...new Set(
      [cover, photos[0]]
        .filter((source): source is string => !!source)
        .map(weddingImageSource),
    ),
  ];
}

/**
 * The first candidate whose file exists, or null when none does: the page
 * then has no og:image and the image route answers 404.
 */
export async function shareCover(
  invitation: Invitation & { template: WeddingTemplate },
  { root }: ShareImageOptions = {},
): Promise<ShareCover | null> {
  const base = projectRoot(root);
  for (const source of shareCoverCandidates(invitation)) {
    const match = COVER_URL.exec(source);
    if (!match) continue;
    const file = path.join(/*turbopackIgnore: true*/ base, "public", match[1]);
    const stats = await stat(file).catch(() => null);
    if (!stats?.isFile()) continue;
    // Uploads are written once under a random name, so path, size and mtime
    // identify the photo without reading it.
    const version = createHash("sha256")
      .update(
        [RENDER_REVISION, source, stats.size, Math.trunc(stats.mtimeMs)].join(
          "\n",
        ),
      )
      .digest("hex")
      .slice(0, 16);
    return { source, file, version };
  }
  return null;
}

/**
 * Top-left corner of the card inside a photo already scaled to cover it.
 * `focus` is the attention point; without one the crop is the hero's.
 */
export function cardWindow(
  photo: { width: number; height: number },
  focus: { x?: number; y?: number } = {},
) {
  const maxLeft = Math.max(0, photo.width - SHARE_IMAGE_WIDTH);
  const maxTop = Math.round(
    Math.max(0, photo.height - SHARE_IMAGE_HEIGHT) * HERO_TOP_BIAS,
  );
  const place = (value: number | undefined, max: number, fallback: number) =>
    value === undefined
      ? fallback
      : Math.min(Math.max(Math.round(value), 0), max);
  return {
    left: place(
      focus.x === undefined ? undefined : focus.x - SHARE_IMAGE_WIDTH / 2,
      maxLeft,
      Math.round(maxLeft / 2),
    ),
    top: place(
      focus.y === undefined ? undefined : focus.y - SHARE_IMAGE_HEIGHT / 2,
      maxTop,
      maxTop,
    ),
  };
}

type Channels = 1 | 2 | 3 | 4;

type RawImage = { data: Buffer; info: OutputInfo };

function rawInput({ info }: RawImage) {
  return {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels as Channels,
    },
  };
}

/** The card cut from a wide photo, placed by `cardWindow`. */
async function cropped(photo: RawImage) {
  // Only the focal point is used; sharp's own crop would centre on it.
  const { info: attention } = await sharp(photo.data, rawInput(photo))
    .resize(SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT, {
      fit: "cover",
      position: "attention",
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { left, top } = cardWindow(photo.info, {
    x: attention.attentionX,
    y: attention.attentionY,
  });
  return (
    sharp(photo.data, rawInput(photo))
      .extract({
        left,
        top,
        width: Math.min(SHARE_IMAGE_WIDTH, photo.info.width),
        height: Math.min(SHARE_IMAGE_HEIGHT, photo.info.height),
      })
      // Guards a rounding pixel; a no-op when the extract is already 1200×630.
      .resize(SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT, { fit: "fill" })
  );
}

/** A narrow photo whole, centred on a darker blurred fill of itself. */
async function framed(photo: RawImage) {
  const whole = await sharp(photo.data, rawInput(photo))
    .resize(SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(photo.data, rawInput(photo))
    .resize(SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT, { fit: "cover" })
    .blur(28)
    .modulate({ brightness: 0.8 })
    .composite([{ input: whole.data, ...rawInput(whole), gravity: "centre" }]);
}

/**
 * Renders the 1200×630 card. Decoding uses shrink-on-load, so a 45 MP JPEG
 * costs about 100 MB instead of its full frame; the photo is reduced once to
 * the smallest size that covers the card, and the rest works on that.
 */
export async function renderShareImage(input: string | Buffer) {
  const photo = await sharp(input, {
    limitInputPixels: MAX_UPLOAD_IMAGE_PIXELS,
    animated: false,
  })
    .rotate()
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .resize(SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT, { fit: "outside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const card =
    photo.info.width / photo.info.height >= CROP_MIN_RATIO
      ? await cropped(photo)
      : await framed(photo);
  // No metadata is copied: EXIF/GPS of the original stays out.
  return card.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

/**
 * One render at a time: an original can be 64 MP and the upload route's own
 * encodes run beside it. Crawlers of one shared link wait for the same render
 * (`pending`), so the queue only holds different covers.
 */
const renderSlots = createSlots({ slots: 1, queue: 10, waitMs: 30_000 });
const pending = new Map<string, Promise<Buffer>>();

function errorCode(error: unknown) {
  const code =
    error instanceof Error && "code" in error ? error.code : undefined;
  return typeof code === "string" ? code : undefined;
}

async function store(dir: string, file: string, image: Buffer) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(temp, image);
    await rename(temp, file);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    // Still served; the next hit renders again.
    logger.warn("share_image_cache_write_failed", {
      errorClass: error instanceof Error ? error.name : "Unknown",
      errorCode: errorCode(error),
    });
  }
}

async function renderAndStore(cover: ShareCover, dir: string, file: string) {
  const release = await renderSlots.acquire();
  let image: Buffer;
  const started = performance.now();
  try {
    image = await renderShareImage(cover.file);
  } finally {
    release();
  }
  logger.info("share_image_rendered", {
    version: cover.version,
    bytes: image.byteLength,
    ms: Math.round(performance.now() - started),
  });
  await store(dir, file, image);
  return image;
}

/** The card from the disk cache, rendering it on the first request. */
export async function shareImage(
  cover: ShareCover,
  { root }: ShareImageOptions = {},
): Promise<Buffer> {
  const dir = path.join(
    /*turbopackIgnore: true*/ projectRoot(root),
    SHARE_IMAGE_CACHE_DIR,
  );
  const file = path.join(/*turbopackIgnore: true*/ dir, `${cover.version}.jpg`);
  const cached = await readFile(file).catch(() => null);
  if (cached) return cached;
  let job = pending.get(file);
  if (!job) {
    job = renderAndStore(cover, dir, file).finally(() => pending.delete(file));
    pending.set(file, job);
  }
  return job;
}

const COMMON_HEADERS = { "X-Content-Type-Options": "nosniff" };

/**
 * A `?v=` URL names one rendering of one cover, so crawlers, their CDNs and
 * browsers may keep it a day. Any other `v` is an older share of a cover
 * that has changed since (or none): the current card, kept briefly.
 */
const CURRENT_CACHE = "public, max-age=86400";
const STALE_CACHE = "public, max-age=300";

function plain(status: number, body: string, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      ...COMMON_HEADERS,
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export interface ShareImageResponseOptions extends ShareImageOptions {
  /** False for HEAD: same status and headers, no body. */
  withBody?: boolean;
}

/**
 * GET /w/[slug]/og.jpg. Same visibility rule as the page: a draft, suspended,
 * unpaid or expired invitation, or a disabled owner, gets 404 and no image.
 */
export async function shareImageResponse(
  request: Request,
  slug: string,
  { root, withBody = true }: ShareImageResponseOptions = {},
): Promise<Response> {
  try {
    const invitation = await publicInvitation(slug);
    if (!invitation) return plain(404, "Not Found");
    const cover = await shareCover(invitation, { root });
    if (!cover) return plain(404, "Not Found");
    const image = await shareImage(cover, { root });
    const current =
      new URL(request.url).searchParams.get("v") === cover.version;
    return new Response(withBody ? new Uint8Array(image) : null, {
      status: 200,
      headers: {
        ...COMMON_HEADERS,
        "Content-Type": SHARE_IMAGE_TYPE,
        "Content-Length": String(image.byteLength),
        "Cache-Control": current ? CURRENT_CACHE : STALE_CACHE,
      },
    });
  } catch (error) {
    if (error instanceof SlotsBusyError) {
      logger.warn("share_image_busy");
      return plain(503, "Service Unavailable", { "Retry-After": "30" });
    }
    const correlationId = randomUUID();
    logger.error("share_image_error", {
      correlationId,
      errorClass: error instanceof Error ? error.name : "Unknown",
      errorCode: errorCode(error),
    });
    return plain(500, `Internal Server Error (${correlationId})`);
  }
}
