// @vitest-environment node
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { fakeMp3, PNG_BYTES } from "../lib/wedding-music-fake";

const stored = vi.hoisted(() => ({
  files: [] as { file: string; data: Buffer }[],
  onWrite: () => {},
}));
const auth = vi.hoisted(() => ({
  session: null as { accountId: string } | null,
  lookups: 0,
}));
const limits = vi.hoisted(() => [] as unknown[][]);

// Never touch public/uploads: files land in memory only.
vi.mock("node:fs/promises", () => ({
  mkdir: async () => undefined,
  writeFile: async (file: string, data: Buffer) => {
    stored.onWrite();
    stored.files.push({ file, data });
  },
}));
vi.mock("@/server/customer-auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/customer-auth/session")>()),
  getOptionalCustomerSession: async () => {
    auth.lookups++;
    return auth.session;
  },
}));
// Real customer/safeOrigin guards; the limiter only records its scope.
vi.mock("@/server/wedding/guards", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/wedding/guards")>()),
  mutationLimit: async (...args: unknown[]) => {
    limits.push(args.slice(1));
  },
}));

import { POST } from "@/app/api/wedding/upload-music/route";
import { logger } from "@/lib/logger";
import { DEMO_CONTENT, invitationSchema } from "@/lib/wedding";
import { MAX_UPLOAD_MUSIC_BYTES } from "@/lib/wedding-upload";
import { prisma } from "@/server/db/prisma";
import { MAX_UPLOADS_PER_INVITATION } from "@/server/wedding/service";

const MiB = 1024 * 1024;
const ORIGIN = "http://127.0.0.1:3200";
const PHONES = ["+84900000101", "+84900000102"];
const TEMPLATE = "upload-music-test-template";
const SLUG = "upload-music-test";
const NOT_MP3 = "Tệp không phải MP3 hợp lệ. Vui lòng chọn tệp nhạc MP3";
let owner: string;
let stranger: string;
let invitation: string;

function upload(
  body: BodyInit,
  {
    invitationId = invitation as string | null,
    headers = {} as Record<string, string>,
  } = {},
) {
  const query = invitationId === null ? "" : `?invitationId=${invitationId}`;
  return POST(
    new Request(`${ORIGIN}/api/wedding/upload-music${query}`, {
      method: "POST",
      headers: {
        "content-type": "audio/mpeg",
        origin: ORIGIN,
        "sec-fetch-site": "same-origin",
        ...headers,
      },
      body,
      duplex: "half",
    } as RequestInit),
  );
}

async function clean() {
  const accounts = await prisma.customerAccount.findMany({
    where: { phoneNormalized: { in: PHONES } },
    select: { id: true },
  });
  const ids = accounts.map((account) => account.id);
  await prisma.weddingUpload.deleteMany({ where: { accountId: { in: ids } } });
  await prisma.invitation.deleteMany({
    where: { OR: [{ ownerId: { in: ids } }, { slug: SLUG }] },
  });
  await prisma.weddingTemplate.deleteMany({ where: { id: TEMPLATE } });
  await prisma.customerAccount.deleteMany({ where: { id: { in: ids } } });
}

async function uploads() {
  return prisma.weddingUpload.findMany({ where: { invitationId: invitation } });
}

beforeAll(async () => {
  await clean();
  [owner, stranger] = await Promise.all(
    PHONES.map(async (phoneNormalized, i) => {
      const account = await prisma.customerAccount.create({
        data: {
          phoneNormalized,
          displayName: i ? "Nguoi La" : "Nguyen Van A",
          passwordHash: "unused",
        },
      });
      return account.id;
    }),
  );
  await prisma.weddingTemplate.create({
    data: {
      id: TEMPLATE,
      slug: TEMPLATE,
      name: "Test",
      category: "Tối giản",
      description: "Test",
    },
  });
  invitation = (
    await prisma.invitation.create({
      data: {
        ownerId: owner,
        templateId: TEMPLATE,
        slug: SLUG,
        groom: "Nguyen Van A",
        bride: "Tran Thi B",
        weddingDate: new Date("2026-12-20T10:00:00+07:00"),
      },
    })
  ).id;
});

beforeEach(async () => {
  stored.files.length = 0;
  stored.onWrite = () => {};
  limits.length = 0;
  auth.session = { accountId: owner };
  auth.lookups = 0;
  await prisma.weddingUpload.deleteMany({
    where: { invitationId: invitation },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe("POST /api/wedding/upload-music", () => {
  it("lưu MP3 giả (ID3 + frame) của chủ thiệp dưới tên <uuid>.mp3 và trừ quota", async () => {
    const song = fakeMp3();
    const response = await upload(song);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    const url: string = body.data.url;
    expect(url).toMatch(
      /^\/uploads\/weddings\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp3$/,
    );
    // musicUrl accepts exactly what the route hands back.
    expect(
      invitationSchema.safeParse({
        ...DEMO_CONTENT,
        templateId: TEMPLATE,
        slug: SLUG,
        musicUrl: url,
      }).success,
    ).toBe(true);
    expect(stored.files).toHaveLength(1);
    expect(stored.files[0].file).toBe(
      `${process.cwd()}/public${url}`.replaceAll("\\", "/"),
    );
    expect(stored.files[0].data.equals(song)).toBe(true);
    const [row] = await uploads();
    expect(row).toMatchObject({
      accountId: owner,
      filename: url.split("/").pop(),
      bytes: song.length,
    });
    expect(limits).toEqual([["upload", owner]]);
  });

  it("nhận MP3 bắt đầu thẳng bằng frame, và tệp đúng 15 MB", async () => {
    const bare = fakeMp3({ id3: false });
    const full = Buffer.concat([
      fakeMp3(),
      Buffer.alloc(MAX_UPLOAD_MUSIC_BYTES - fakeMp3().length),
    ]);
    expect(full.length).toBe(15 * MiB);
    for (const body of [bare, full])
      expect((await upload(body)).status).toBe(200);
    expect(stored.files.map(({ data }) => data.length)).toEqual([
      bare.length,
      15 * MiB,
    ]);
  });

  it("từ chối PNG, văn bản hay HTML đổi đuôi .mp3 dù khai báo audio/mpeg", async () => {
    for (const body of [
      PNG_BYTES,
      Buffer.from("Day khong phai bai hat\n"),
      Buffer.from("<!doctype html><script>alert(1)</script>"),
      Buffer.alloc(0),
    ]) {
      const response = await upload(body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, message: NOT_MP3 });
    }
    expect(stored.files).toHaveLength(0);
    expect(await uploads()).toHaveLength(0);
  });

  it("chặn body quá 15 MB bằng 413 trong lúc đọc stream", async () => {
    const head = fakeMp3();
    let sent = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          const chunk = new Uint8Array(MiB);
          if (sent === 0) chunk.set(head);
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
      message: "Tệp nhạc tối đa 15 MB",
    });
    expect(cancelled).toBe(true);
    expect(sent).toBeLessThanOrEqual(18 * MiB);
    expect(stored.files).toHaveLength(0);
    expect(await uploads()).toHaveLength(0);
  });

  it("trả 404 cho người không phải chủ thiệp, không lưu gì", async () => {
    auth.session = { accountId: stranger };
    const response = await upload(fakeMp3());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Không tìm thấy thiệp",
    });
    expect(stored.files).toHaveLength(0);
    expect(await uploads()).toHaveLength(0);
    expect(limits).toHaveLength(0);
  });

  it("trả 401 khi chưa đăng nhập", async () => {
    auth.session = null;
    const response = await upload(fakeMp3());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Vui lòng đăng nhập tài khoản khách hàng",
    });
    expect(stored.files).toHaveLength(0);
  });

  it("trả 403 cho nguồn lạ hoặc cross-site trước khi đọc phiên", async () => {
    const attempts: Record<string, string>[] = [
      { origin: "https://evil.example" },
      { origin: "null" },
      { "sec-fetch-site": "cross-site" },
    ];
    for (const headers of attempts) {
      const response = await upload(fakeMp3(), { headers });
      expect(response.status).toBe(403);
      expect((await response.json()).ok).toBe(false);
    }
    expect(auth.lookups).toBe(0);
    expect(stored.files).toHaveLength(0);
  });

  it("báo lưu bản nháp trước khi thiếu invitationId", async () => {
    const response = await upload(fakeMp3(), { invitationId: null });
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe(
      "Lưu bản nháp trước khi tải nhạc",
    );
  });

  it("dùng chung quota upload với ảnh", async () => {
    await prisma.weddingUpload.createMany({
      data: Array.from({ length: MAX_UPLOADS_PER_INVITATION }, (_, i) => ({
        invitationId: invitation,
        accountId: owner,
        filename: `quota-${i}.webp`,
        bytes: 1,
        // Older than a day, so only the per-invitation cap applies.
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      })),
    });
    const response = await upload(fakeMp3());
    expect(response.status).toBe(409);
    expect(stored.files).toHaveLength(0);
  });

  it("lỗi ghi file trả 500 kèm correlationId, ghi log và bỏ bản ghi quota", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    stored.onWrite = () => {
      throw Object.assign(new Error("no space left"), { code: "ENOSPC" });
    };
    const response = await upload(fakeMp3());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      ok: false,
      message: "Chưa tải được nhạc",
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(error).toHaveBeenCalledWith("wedding_upload_music_error", {
      correlationId: body.correlationId,
      errorClass: "Error",
    });
    expect(await uploads()).toHaveLength(0);
  });
});
