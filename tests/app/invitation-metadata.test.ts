// @vitest-environment node
import { rm } from "node:fs/promises";
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

import { invitationMetadata } from "@/app/w/[slug]/invitation-metadata";
import { generateMetadata } from "@/app/w/[slug]/page";
import { DEMO_CONTENT } from "@/lib/wedding";
import { prisma } from "@/server/db/prisma";
import { publicSiteUrl } from "@/server/http/site-url";
import { shareCover, shareImagePath } from "@/server/wedding/share-image";

import {
  clean,
  draft,
  makeProject,
  published,
  resetProject,
  seedCatalog,
  SLUG,
  writeUpload,
} from "../server/wedding/share-fixtures";

// next/font/local only runs through Next's compiler; page.tsx pulls it in.
vi.mock("next/font/local", () => ({
  default: () => ({ className: "font", variable: "font-variable", style: {} }),
}));

// A public origin, as production requires; the real domain stays out of git.
// The app URL is local on purpose: the canonical origin must win over it.
const SITE = "https://thiep.example";
vi.mock("@/config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/env")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      NEXT_PUBLIC_APP_URL: "http://0.0.0.0:3200",
      CANONICAL_ORIGIN: "https://thiep.example",
    },
  };
});

let project: string;
let accountId: string;

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

describe("publicSiteUrl", () => {
  it("prefers the public app URL, reduced to its origin", () => {
    expect(
      publicSiteUrl({
        NEXT_PUBLIC_APP_URL: "https://thiep.example/some/path",
        CANONICAL_ORIGIN: "https://other.example",
      }).href,
    ).toBe("https://thiep.example/");
  });

  it("skips a local app URL when the canonical origin is public", () => {
    for (const local of [
      "http://localhost:3200",
      "http://127.0.0.1:3200",
      "http://0.0.0.0:3200",
    ])
      expect(
        publicSiteUrl({
          NEXT_PUBLIC_APP_URL: local,
          CANONICAL_ORIGIN: "https://thiep.example",
        }).href,
      ).toBe("https://thiep.example/");
  });

  it("falls back to the local server when nothing public is configured", () => {
    expect(
      publicSiteUrl({
        NEXT_PUBLIC_APP_URL: undefined,
        CANONICAL_ORIGIN: undefined,
      }).href,
    ).toBe("http://localhost:3200/");
  });
});

describe("invitation metadata", () => {
  it("describes a published invitation for link previews", async () => {
    await published(accountId);
    await writeUpload(project);
    const invitation = await prisma.invitation.findFirstOrThrow({
      where: { slug: SLUG },
      include: { template: true },
    });
    const { version } = (await shareCover(invitation, { root: project }))!;

    const metadata = await invitationMetadata(SLUG, { root: project });

    expect(String(metadata.metadataBase)).toBe(`${SITE}/`);
    expect(metadata.title).toBe(
      `${DEMO_CONTENT.groom} & ${DEMO_CONTENT.bride} — Thiệp cưới`,
    );
    expect(metadata.description).toBe(DEMO_CONTENT.headline);
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toEqual({
      type: "website",
      url: `${SITE}/w/${SLUG}`,
      siteName: "Hỷ Studio",
      locale: "vi_VN",
      title: `${DEMO_CONTENT.groom} & ${DEMO_CONTENT.bride}`,
      description: DEMO_CONTENT.headline,
      images: [
        {
          url: `${SITE}${shareImagePath(SLUG, version)}`,
          width: 1200,
          height: 630,
          type: "image/jpeg",
          alt: `${DEMO_CONTENT.groom} và ${DEMO_CONTENT.bride} — ảnh thiệp cưới`,
        },
      ],
    });
    expect(metadata.twitter).toEqual({ card: "summary_large_image" });
    // Absolute https URLs on the public origin, no personal guest token.
    const text = JSON.stringify(metadata);
    expect(text).not.toMatch(/guest|localhost|127\.0\.0\.1|0\.0\.0\.0/);
    expect(text.match(/https?:\/\/[^"]+/g)?.sort()).toEqual([
      `${SITE}/`,
      `${SITE}/w/${SLUG}`,
      `${SITE}/w/${SLUG}/og.jpg?v=${version}`,
    ]);
  });

  it("is what the page's generateMetadata returns", async () => {
    await published(accountId);
    await writeUpload(project);
    vi.spyOn(process, "cwd").mockReturnValue(project);
    expect(
      await generateMetadata({ params: Promise.resolve({ slug: SLUG }) }),
    ).toEqual(await invitationMetadata(SLUG, { root: project }));
  });

  it("leaves out og:image when there is no photo file", async () => {
    await published(accountId);
    const metadata = await invitationMetadata(SLUG, { root: project });
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.openGraph).toMatchObject({ url: `${SITE}/w/${SLUG}` });
    expect(metadata.twitter).toEqual({ card: "summary" });
  });

  it("says nothing more about an unavailable invitation", async () => {
    await draft(accountId);
    await writeUpload(project);
    expect(await invitationMetadata(SLUG, { root: project })).toEqual({
      title: "Lời mời chưa sẵn sàng",
      robots: { index: false },
    });
  });
});
