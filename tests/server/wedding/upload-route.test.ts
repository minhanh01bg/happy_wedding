// @vitest-environment node
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stored = vi.hoisted(() => ({
  files: [] as Buffer[],
  reserved: [] as number[],
  // Run before the mocked reserveUpload/writeFile; a test may throw here.
  onReserve: () => {},
  onWrite: () => {},
}));
const encodes = vi.hoisted(() => ({
  started: 0,
  active: 0,
  peak: 0,
  gate: undefined as Promise<void> | undefined,
  open: () => {},
}));
const slots = vi.hoisted(() => ({
  encode: undefined as { active: number; waiting: number } | undefined,
  acquired: 0,
  granted: () => {},
}));

// Count the route's own Sharp pipelines (the only caller that passes
// limitInputPixels) from decode to finished WebP, and let a test hold them.
// Reading the header with metadata() is not counted; toBuffer() decodes.
vi.mock("sharp", async (importOriginal) => {
  const real = (await importOriginal<{ default: typeof sharp }>()).default;
  function tracked(input?: unknown, options?: { limitInputPixels?: unknown }) {
    const image = real(input as never, options as never);
    if (options?.limitInputPixels === undefined) return image;
    const toBuffer = image.toBuffer.bind(image) as () => Promise<Buffer>;
    image.toBuffer = (async () => {
      encodes.started++;
      encodes.active++;
      encodes.peak = Math.max(encodes.peak, encodes.active);
      try {
        await encodes.gate;
        return await toBuffer();
      } finally {
        encodes.active--;
      }
    }) as typeof image.toBuffer;
    return image;
  }
  return { default: Object.assign(tracked, real) };
});
vi.mock("@/server/wedding/slots", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/wedding/slots")>();
  return {
    ...actual,
    createSlots: (options: Parameters<typeof actual.createSlots>[0]) => {
      const created = actual.createSlots(options);
      const acquire = created.acquire;
      created.acquire = (signal?: AbortSignal) => {
        slots.acquired++;
        return acquire(signal).then((release) => {
          slots.granted();
          return release;
        });
      };
      return (slots.encode = created);
    },
  };
});

vi.mock("node:fs/promises", () => ({
  mkdir: async () => undefined,
  writeFile: async (_file: string, data: Buffer) => {
    stored.onWrite();
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
    stored.onReserve();
    stored.reserved.push(bytes);
    return { id: "upload-1" };
  },
}));

import { POST } from "@/app/api/wedding/upload/route";
import { logger } from "@/lib/logger";

const MiB = 1024 * 1024;
const SLOW = 120_000;

function upload(
  body: BodyInit,
  contentType = "image/jpeg",
  signal?: AbortSignal,
) {
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
        signal,
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

function holdEncodes() {
  encodes.gate = new Promise<void>((resolve) => {
    encodes.open = resolve;
  });
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
    stored.onReserve = () => {};
    stored.onWrite = () => {};
    Object.assign(encodes, { started: 0, active: 0, peak: 0 });
    slots.acquired = 0;
    slots.granted = () => {};
    encodes.gate = undefined;
  });

  afterEach(() => {
    // A failed test must not leave uploads holding the module's slots.
    encodes.open();
    vi.restoreAllMocks();
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
      expect([slots.acquired, encodes.started]).toEqual([1, 1]);
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
      expect(slots.acquired).toBe(0);
    },
    SLOW,
  );

  it("từ chối TIFF hoặc SVG khai báo là JPEG/PNG, vẫn nhận PNG và WebP", async () => {
    const plain = () =>
      sharp({
        create: { width: 64, height: 48, channels: 3, background: "#c88f6a" },
      });
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="#c88f6a"/></svg>',
    );
    for (const [body, type] of [
      [await plain().tiff().toBuffer(), "image/jpeg"],
      [svg, "image/png"],
    ] as const) {
      const response = await upload(body, type);
      expect(response.status).toBe(400);
      expect((await response.json()).message).toBe(
        "Chỉ nhận ảnh JPEG, PNG hoặc WebP",
      );
    }
    expect(stored.files).toHaveLength(0);

    for (const [body, type] of [
      [await plain().png().toBuffer(), "image/png"],
      [await plain().webp().toBuffer(), "image/webp"],
    ] as const) {
      expect((await upload(body, type)).status).toBe(200);
    }
    expect(stored.files).toHaveLength(2);
  });

  it(
    "4 ảnh tải cùng lúc đều thành công, mỗi lúc chỉ mã hóa 2 ảnh",
    async () => {
      const photo = await jpeg(1200, 800).toBuffer();
      holdEncodes();
      const responses = Promise.all(
        Array.from({ length: 4 }, () => upload(photo)),
      );
      // Every upload has either started its encode or joined the queue.
      await vi.waitFor(
        () => expect(encodes.started + (slots.encode?.waiting ?? 0)).toBe(4),
        { timeout: 10_000 },
      );
      expect(encodes.started).toBe(2);
      expect(slots.encode?.waiting).toBe(2);
      encodes.open();
      const results = await responses;
      expect(results.map((response) => response.status)).toEqual([
        200, 200, 200, 200,
      ]);
      expect(encodes.started).toBe(4);
      expect(encodes.peak).toBe(2);
      expect(stored.files).toHaveLength(4);
      expect([slots.encode?.active, slots.encode?.waiting]).toEqual([0, 0]);
    },
    SLOW,
  );

  it(
    "trả 503 tiếng Việt khi 2 ảnh đang mã hóa và 10 ảnh đã xếp hàng",
    async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const photo = await jpeg(64, 64).toBuffer();
      holdEncodes();
      const queued = Promise.all(
        Array.from({ length: 12 }, () => upload(photo)),
      );
      await vi.waitFor(() => expect(slots.encode?.waiting).toBe(10), {
        timeout: 10_000,
      });
      const busy = await upload(photo);
      expect(busy.status).toBe(503);
      expect(await busy.json()).toEqual({
        ok: false,
        message: "Máy chủ đang bận, vui lòng thử lại sau",
      });
      encodes.open();
      const results = await queued;
      expect(results.every((response) => response.status === 200)).toBe(true);
      expect(stored.files).toHaveLength(12);
      expect(encodes.peak).toBe(2);
    },
    SLOW,
  );

  it(
    "từ chối PNG 16-bit RGBA 32 megapixel trước khi lấy slot hay decode",
    async () => {
      // 5657×5657 = 32 MP; 16-bit RGBA is 8 bytes per pixel, 256 MB raw.
      // Without the budget this 3 MB file took about 950 MB to encode.
      const rgba = () =>
        sharp({
          create: {
            width: 5657,
            height: 5657,
            channels: 4,
            background: { r: 200, g: 143, b: 106, alpha: 0.5 },
          },
        });
      const png16 = await rgba()
        .toColourspace("rgb16")
        .png({ compressionLevel: 1 })
        .toBuffer();
      const header = await sharp(png16).metadata();
      expect([header.depth, header.channels, header.hasAlpha]).toEqual([
        "ushort",
        4,
        true,
      ]);
      expect(png16.byteLength).toBeLessThan(40 * MiB);
      // 8-bit RGBA of the same size: alpha makes WebP cost RAM per pixel.
      const png8 = await rgba().png({ compressionLevel: 1 }).toBuffer();

      for (const body of [png16, png8]) {
        const response = await upload(body, "image/png");
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
          ok: false,
          message: "Ảnh quá lớn để xử lý, vui lòng dùng ảnh JPEG 8-bit",
        });
      }
      expect(slots.acquired).toBe(0);
      expect(encodes.started).toBe(0);
      expect(stored.files).toHaveLength(0);
      expect(stored.reserved).toHaveLength(0);
    },
    SLOW,
  );

  it(
    "bỏ ảnh đang xếp hàng khi khách hủy: không mã hóa, không lưu, không trừ quota",
    async () => {
      const photo = await jpeg(64, 64).toBuffer();
      holdEncodes();
      const running = Promise.all([upload(photo), upload(photo)]);
      await vi.waitFor(() => expect(encodes.started).toBe(2), {
        timeout: 10_000,
      });
      const controller = new AbortController();
      const cancelled = upload(photo, "image/jpeg", controller.signal);
      await vi.waitFor(() => expect(slots.encode?.waiting).toBe(1), {
        timeout: 10_000,
      });

      controller.abort();
      expect(slots.encode?.waiting).toBe(0);
      encodes.open();
      const response = await cancelled;
      expect(response.status).toBe(499);
      expect(await response.json()).toEqual({
        ok: false,
        message: "Đã hủy tải ảnh",
      });
      expect((await running).map((done) => done.status)).toEqual([200, 200]);
      expect(encodes.started).toBe(2);
      expect(stored.files).toHaveLength(2);
      expect(stored.reserved).toHaveLength(2);
      expect([slots.encode?.active, slots.encode?.waiting]).toEqual([0, 0]);
    },
    SLOW,
  );

  it("khách hủy đúng lúc được cấp slot thì không mã hóa và trả slot", async () => {
    const controller = new AbortController();
    slots.granted = () => controller.abort();
    const response = await upload(
      await jpeg(64, 64).toBuffer(),
      "image/jpeg",
      controller.signal,
    );
    expect(response.status).toBe(499);
    expect(encodes.started).toBe(0);
    expect(stored.files).toHaveLength(0);
    expect(stored.reserved).toHaveLength(0);
    expect([slots.encode?.active, slots.encode?.waiting]).toEqual([0, 0]);
  });

  it("khách hủy trong lúc mã hóa thì không lưu file, không trừ quota", async () => {
    holdEncodes();
    const controller = new AbortController();
    const pending = upload(
      await jpeg(64, 64).toBuffer(),
      "image/jpeg",
      controller.signal,
    );
    await vi.waitFor(() => expect(encodes.started).toBe(1), {
      timeout: 10_000,
    });
    controller.abort();
    encodes.open();
    const response = await pending;
    expect(response.status).toBe(499);
    expect(stored.files).toHaveLength(0);
    expect(stored.reserved).toHaveLength(0);
    expect([slots.encode?.active, slots.encode?.waiting]).toEqual([0, 0]);
  });

  it("ghi log khi mã hóa lỗi, khách vẫn nhận 400 tiếng Việt", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    // The header is intact, so the file passes inspect() and fails in decode.
    const photo = await jpeg(1200, 800).toBuffer();
    const response = await upload(photo.subarray(0, photo.length >> 1));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Tệp ảnh không hợp lệ hoặc quá lớn",
    });
    expect(encodes.started).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    const [event, meta] = warn.mock.calls[0];
    expect(event).toBe("wedding_upload_encode_failed");
    // Exactly these keys: no image bytes, cookies, tokens or file names.
    expect(meta).toStrictEqual({
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      format: "jpeg",
      width: 1200,
      height: 800,
      bytes: photo.length >> 1,
      errorClass: "Error",
      errorCode: undefined,
      errorMessage: expect.any(String),
    });
    expect(
      (meta as { errorMessage: string }).errorMessage.length,
    ).toBeLessThanOrEqual(200);
    expect(stored.files).toHaveLength(0);
    expect(stored.reserved).toHaveLength(0);
    expect([slots.encode?.active, slots.encode?.waiting]).toEqual([0, 0]);
  });

  it("khách hủy giữa lúc gửi body thì trả 499, không log lỗi", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    const header = await jpeg(16, 16).toBuffer();
    const controller = new AbortController();
    let sent = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(stream) {
          if (!sent) {
            sent = true;
            stream.enqueue(new Uint8Array(header));
            return;
          }
          // What Node does when the socket closes mid-body: the response
          // closes, which aborts the signal, then the body fails.
          controller.abort();
          stream.error(
            Object.assign(new Error("aborted"), { code: "ECONNRESET" }),
          );
        },
      },
      { highWaterMark: 0 },
    );
    const response = await upload(body, "image/jpeg", controller.signal);
    expect(response.status).toBe(499);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Đã hủy tải ảnh",
    });
    expect(error).not.toHaveBeenCalled();
    expect(slots.acquired).toBe(0);
    expect(stored.files).toHaveLength(0);
    expect(stored.reserved).toHaveLength(0);
  });

  it("lỗi DB hay ghi file lúc khách vừa hủy vẫn là 500 có log", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    const photo = await jpeg(64, 64).toBuffer();
    for (const step of ["onReserve", "onWrite"] as const) {
      const controller = new AbortController();
      stored[step] = () => {
        controller.abort();
        throw Object.assign(new Error("no space left"), { code: "ENOSPC" });
      };
      const response = await upload(photo, "image/jpeg", controller.signal);
      expect(response.status).toBe(500);
      expect((await response.json()).message).toBe("Chưa tải được ảnh");
      stored[step] = () => {};
    }
    expect(error.mock.calls.map(([event]) => event)).toEqual([
      "wedding_upload_error",
      "wedding_upload_error",
    ]);
    expect(stored.files).toHaveLength(0);
  });
});
