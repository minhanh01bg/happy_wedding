// @vitest-environment node
import { createHash } from "node:crypto";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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

import { GET, HEAD } from "@/app/w/[slug]/og.jpg/route";
import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";
import { publishInvitation } from "@/server/wedding/service";
import {
  cardWindow,
  renderShareImage,
  shareCover,
  shareImageResponse,
  SHARE_IMAGE_CACHE_DIR,
} from "@/server/wedding/share-image";

import {
  ALBUM_PHOTO,
  clean,
  COVER,
  draft,
  makeProject,
  photo,
  published,
  resetProject,
  seedCatalog,
  SLUG,
  writeUpload,
} from "./share-fixtures";

let project: string;
let accountId: string;

function request(query = "", method = "GET") {
  // Behind nginx the app sees its loopback address, never the public host.
  return new Request(`http://127.0.0.1:3200/w/${SLUG}/og.jpg${query}`, {
    method,
  });
}

const params = { params: Promise.resolve({ slug: SLUG }) };

async function invitationWithTemplate() {
  return prisma.invitation.findFirstOrThrow({
    where: { slug: SLUG },
    include: { template: true },
  });
}

async function currentVersion() {
  return (await shareCover(await invitationWithTemplate(), { root: project }))!
    .version;
}

function renders(info: { mock: { calls: unknown[][] } }) {
  return info.mock.calls.filter(([event]) => event === "share_image_rendered")
    .length;
}

async function sha256(file: string) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

beforeAll(async () => {
  project = await makeProject();
});

beforeEach(async () => {
  await resetProject(project);
  accountId = await seedCatalog();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await clean();
  await prisma.$disconnect();
  await rm(project, { recursive: true, force: true });
});

describe("cardWindow", () => {
  it("follows the attention point across a panorama", () => {
    expect(
      cardWindow({ width: 2400, height: 630 }, { x: 1800, y: 300 }),
    ).toEqual({ left: 1200, top: 0 });
    expect(cardWindow({ width: 2400, height: 630 }, { x: 100 })).toEqual({
      left: 0,
      top: 0,
    });
  });

  it("never crops lower than the hero's 25% framing", () => {
    // 3:2 photo scaled to 1200×800: 170 px to lose, at most 43 above.
    const photo = { width: 1200, height: 800 };
    expect(cardWindow(photo, { y: 700 }).top).toBe(43);
    expect(cardWindow(photo, { y: 330 }).top).toBe(15);
    expect(cardWindow(photo, { y: 10 }).top).toBe(0);
    expect(cardWindow(photo).top).toBe(43);
  });

  it("centres when there is no attention point", () => {
    expect(cardWindow({ width: 1300, height: 630 })).toEqual({
      left: 50,
      top: 0,
    });
  });
});

describe("renderShareImage", () => {
  it.each([
    ["portrait, shown whole on a blurred fill", 1600, 2400],
    ["square, shown whole on a blurred fill", 1500, 1500],
    ["3:2 landscape, cropped", 2400, 1600],
    ["panorama, cropped", 4000, 1000],
    ["small photo, enlarged", 300, 200],
  ])("makes a 1200×630 JPEG from a %s", async (_, width, height) => {
    const card = await renderShareImage(
      await photo(width, height).jpeg().toBuffer(),
    );
    const meta = await sharp(card).metadata();
    expect(meta).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
    expect(card.byteLength).toBeLessThan(300 * 1024);
  });

  it("drops the original's EXIF and reads grey and transparent photos", async () => {
    const tagged = await photo(1200, 1800)
      .jpeg()
      .withExif({ IFD0: { Artist: "Test", Copyright: "Test" } })
      .toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    const card = await renderShareImage(tagged);
    expect((await sharp(card).metadata()).exif).toBeUndefined();

    for (const input of [
      await photo(1600, 1000).greyscale().jpeg().toBuffer(),
      await sharp({
        create: {
          width: 800,
          height: 800,
          channels: 4,
          background: { r: 200, g: 100, b: 50, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer(),
    ])
      expect(
        await sharp(await renderShareImage(input)).metadata(),
      ).toMatchObject({ width: 1200, height: 630, channels: 3 });
  });
});

describe("GET /w/[slug]/og.jpg", () => {
  it("serves the published cover as a 1200×630 JPEG and caches it on disk", async () => {
    await published(accountId);
    const cover = await writeUpload(project);
    const original = await sha256(cover);
    const before = await stat(cover);
    const version = await currentVersion();
    const info = vi.spyOn(logger, "info");
    vi.spyOn(process, "cwd").mockReturnValue(project);

    const response = await GET(request(`?v=${version}`), params);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    const body = Buffer.from(await response.arrayBuffer());
    expect(response.headers.get("Content-Length")).toBe(
      String(body.byteLength),
    );
    expect(await sharp(body).metadata()).toMatchObject({
      format: "jpeg",
      width: 1200,
      height: 630,
    });
    expect(await readdir(path.join(project, SHARE_IMAGE_CACHE_DIR))).toEqual([
      `${version}.jpg`,
    ]);

    // The next crawler reads the cached card instead of decoding the photo.
    const again = await GET(request(`?v=${version}`), params);
    expect(Buffer.from(await again.arrayBuffer()).equals(body)).toBe(true);
    expect(renders(info)).toBe(1);

    // The upload itself is neither rewritten nor replaced.
    expect(await sha256(cover)).toBe(original);
    expect((await stat(cover)).mtimeMs).toBe(before.mtimeMs);
    expect(
      await readdir(path.join(project, "public/uploads/weddings")),
    ).toEqual([path.basename(COVER)]);
  });

  it("renders once for crawlers that arrive together", async () => {
    await published(accountId);
    await writeUpload(project);
    const info = vi.spyOn(logger, "info");
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        shareImageResponse(request(), SLUG, { root: project }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200, 200,
    ]);
    expect(renders(info)).toBe(1);
  });

  it("keeps an old or missing version only briefly", async () => {
    await published(accountId);
    await writeUpload(project);
    for (const query of ["", "?v=0000000000000000"]) {
      const response = await shareImageResponse(request(query), SLUG, {
        root: project,
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    }
  });

  it("answers HEAD with the headers and no body", async () => {
    await published(accountId);
    await writeUpload(project);
    vi.spyOn(process, "cwd").mockReturnValue(project);
    const response = await HEAD(request("", "HEAD"), params);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(Number(response.headers.get("Content-Length"))).toBeGreaterThan(0);
    expect(response.body).toBeNull();
  });

  it("changes the version when the cover changes", async () => {
    await published(accountId);
    await writeUpload(project, COVER, 900, 1350);
    const before = await currentVersion();
    await writeUpload(project, COVER, 1200, 800);
    expect(await currentVersion()).not.toBe(before);
  });

  it("falls back to the first album photo when the cover file is gone", async () => {
    await published(accountId, { photos: [ALBUM_PHOTO] });
    await writeUpload(project, ALBUM_PHOTO);
    const cover = await shareCover(await invitationWithTemplate(), {
      root: project,
    });
    expect(cover?.source).toBe(ALBUM_PHOTO);
    const response = await shareImageResponse(request(), SLUG, {
      root: project,
    });
    expect(response.status).toBe(200);
  });

  it("uses the bundled photo the hero shows when the couple kept the default cover", async () => {
    await published(accountId, { coverUrl: "/images/couple.jpg" });
    const cover = await shareCover(await invitationWithTemplate());
    expect(cover?.source).toBe("/images/wedding-couple-studio.jpg");
  });

  it("gives a draft 404 and renders nothing", async () => {
    await draft(accountId);
    await writeUpload(project);
    const info = vi.spyOn(logger, "info");
    const response = await shareImageResponse(request(), SLUG, {
      root: project,
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).not.toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(renders(info)).toBe(0);
  });

  it("gives 404 once the invitation is unpublished or the owner disabled", async () => {
    const invitation = await published(accountId);
    await writeUpload(project);
    await publishInvitation(accountId, invitation.id, false);
    expect(
      (await shareImageResponse(request(), SLUG, { root: project })).status,
    ).toBe(404);

    await publishInvitation(accountId, invitation.id, true);
    await prisma.customerAccount.update({
      where: { id: accountId },
      data: { disabledAt: new Date() },
    });
    expect(
      (await shareImageResponse(request(), SLUG, { root: project })).status,
    ).toBe(404);
  });

  it("gives 404 for an unknown slug and when no photo file exists", async () => {
    await published(accountId);
    expect(
      (await shareImageResponse(request(), SLUG, { root: project })).status,
    ).toBe(404);
    expect(
      (await shareImageResponse(request(), "khong-co", { root: project }))
        .status,
    ).toBe(404);
  });
});
