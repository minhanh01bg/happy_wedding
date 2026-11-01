// @vitest-environment node
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stored = vi.hoisted(() => ({
  files: [] as Buffer[],
  reserved: [] as number[],
}));

vi.mock("node:fs/promises", () => ({
  mkdir: async () => undefined,
  writeFile: async (_file: string, data: Buffer) => {
    stored.files.push(data);
  },
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { weddingUpload: { delete: async () => undefined } },
}));
vi.mock("@/server/wedding/guards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/wedding/guards")>()),
  customer: async () => ({ accountId: "account-1" }),
  mutationLimit: async () => undefined,
}));
vi.mock("@/server/wedding/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/wedding/service")>()),
  ownedInvitation: async () => ({ id: "invitation-1" }),
  reserveUpload: async (_a: string, _i: string, _f: string, bytes: number) => {
    stored.reserved.push(bytes);
    return { id: "upload-1" };
  },
}));

import { POST } from "@/app/api/wedding/upload/route";

const MiB = 1024 * 1024;
const SLOW = 120_000;

function upload(body: BodyInit, contentType = "image/jpeg") {
  return POST(
    new Request(
      "http://127.0.0.1:3200/api/wedding/upload?invitationId=invitation-1",
      {
        method: "POST",
        headers: {
          "content-type": contentType,
          origin: "http://127.0.0.1:3200",
          "sec-fetch-site": "same-origin",
          "x-real-ip": "127.0.0.1",
        },
        body,
        duplex: "half",
      } as RequestInit,
    ),
  );
}

function jpeg(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#c88f6a" },
  }).jpeg({ quality: 90 });
}

/** Grow a real JPEG with APP15 segments, which decoders skip, like camera files. */
function padJpeg(source: Buffer, totalBytes: number) {
  const segments: Buffer[] = [];
  let size = source.length;
  while (size < totalBytes) {
    const payload = Math.min(65_533, Math.max(1, totalBytes - size - 4));
    const segment = Buffer.alloc(payload + 4, 0x20);
    segment.writeUInt16BE(0xffef, 0);
    segment.writeUInt16BE(payload + 2, 2);
    segments.push(segment);
    size += segment.length;
  }
  return Buffer.concat([
    source.subarray(0, 2),
    ...segments,
    source.subarray(2),
  ]);
}

async function storedImage() {
  expect(stored.files).toHaveLength(1);
  expect(stored.reserved).toEqual([stored.files[0].byteLength]);
  return sharp(stored.files[0]).metadata();
}

describe("POST /api/wedding/upload", () => {
  beforeEach(() => {
    stored.files.length = 0;
    stored.reserved.length = 0;
  });

  it(
    "nhận ảnh gốc 21 MB cỡ 5464×8192 và giữ đủ điểm ảnh",
    async () => {
      const original = padJpeg(await jpeg(5464, 8192).toBuffer(), 21 * MiB);
      expect(original.byteLength).toBeGreaterThanOrEqual(21 * MiB);
      const response = await upload(original);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.url).toMatch(/^\/uploads\/weddings\/[a-f0-9-]+\.webp$/);
      const image = await storedImage();
      expect([image.format, image.width, image.height]).toEqual([
        "webp",
        5464,
        8192,
      ]);
    },
    SLOW,
  );

  it(
    "nhận ảnh 44,8 megapixel dưới 5 MB thay vì báo quá lớn",
    async () => {
      const response = await upload(await jpeg(5464, 8192).toBuffer());
      expect(response.status).toBe(200);
      const image = await storedImage();
      expect([image.width, image.height]).toEqual([5464, 8192]);
    },
    SLOW,
  );

  it(
    "xoay theo EXIF, không thu nhỏ và bỏ EXIF, GPS, XMP, ICC",
    async () => {
      const photo = await jpeg(3000, 2000)
        .withExif({
          IFD0: { Make: "TestCam", Model: "Generated" },
          IFD3: { GPSLatitudeRef: "N", GPSLatitude: "21/1 1/1 30/1" },
        })
        .withXmp(
          '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></x:xmpmeta>',
        )
        .withIccProfile("p3")
        .withMetadata({ orientation: 6 })
        .toBuffer();
      const input = await sharp(photo).metadata();
      expect(input.exif).toBeDefined();
      expect(input.xmp).toBeDefined();
      expect(input.icc).toBeDefined();
      expect(input.orientation).toBe(6);

      const response = await upload(photo);
      expect(response.status).toBe(200);
      const image = await storedImage();
      expect([image.width, image.height]).toEqual([2000, 3000]);
      expect(image.exif).toBeUndefined();
      expect(image.xmp).toBeUndefined();
      expect(image.icc).toBeUndefined();
      expect(image.orientation).toBeUndefined();
      expect(stored.files[0].includes("TestCam")).toBe(false);
    },
    SLOW,
  );

  it("chặn body quá 40 MB bằng 413 trong lúc đọc stream", async () => {
    const header = await jpeg(16, 16).toBuffer();
    let sent = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          const chunk = new Uint8Array(MiB);
          if (sent === 0) chunk.set(header.subarray(0, 64));
          sent += chunk.byteLength;
          controller.enqueue(chunk);
          if (sent >= 64 * MiB) controller.close();
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    );
    const response = await upload(body);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Ảnh tối đa 40 MB",
    });
    expect(cancelled).toBe(true);
    expect(sent).toBeLessThanOrEqual(43 * MiB);
    expect(stored.files).toHaveLength(0);
    expect(stored.reserved).toHaveLength(0);
  });

  it(
    "báo lỗi rõ khi một cạnh ảnh quá 16383 px",
    async () => {
      const response = await upload(await jpeg(16_384, 64).toBuffer());
      expect(response.status).toBe(400);
      expect((await response.json()).message).toBe(
        "Ảnh có cạnh dài hơn 16.383 px. Vui lòng chọn ảnh nhỏ hơn",
      );
      expect(stored.files).toHaveLength(0);
    },
    SLOW,
  );

  it(
    "giữ lỗi ảnh không hợp lệ cho tệp hỏng và ảnh trên 64 megapixel",
    async () => {
      const broken = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(1024, 7),
      ]);
      for (const body of [broken, await jpeg(8_001, 8_001).toBuffer()]) {
        const response = await upload(body);
        expect(response.status).toBe(400);
        expect((await response.json()).message).toBe(
          "Tệp ảnh không hợp lệ hoặc quá lớn",
        );
      }
      expect(stored.files).toHaveLength(0);
    },
    SLOW,
  );
});
