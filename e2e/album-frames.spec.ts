import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import sharp from "sharp";

// The Lời yêu album sets prints two by two, then one across the album. A
// couple who upload only portraits put a portrait in every full-width frame,
// so these checks run on a draft holding eight synthetic 2:3 portraits (drawn
// here, never real wedding photos) as well as on the published demo, whose
// full-width prints are landscape.

/** Where the two faces sit in every synthetic portrait, as a share of height. */
const FACE_TOP = 0.14;
const FACE_BOTTOM = 0.3;
const PORTRAITS = 8;

/** A 1600×2400 JPEG: two round faces in the top third over two figures. */
async function syntheticPortrait(index: number) {
  const width = 1600;
  const height = 2400;
  const backdrops = [
    [214, 196, 184],
    [188, 206, 214],
    [205, 214, 188],
    [222, 200, 214],
    [200, 190, 222],
    [226, 214, 180],
    [180, 214, 206],
    [214, 184, 184],
  ];
  const [red, green, blue] = backdrops[index % backdrops.length];
  const radius = ((FACE_BOTTOM - FACE_TOP) / 2) * height;
  const faceY = ((FACE_TOP + FACE_BOTTOM) / 2) * height;
  const faces = [0.38 * width, 0.62 * width];
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const shade = 1 - (y / height) * 0.35;
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 3;
      const face = faces.findIndex(
        (centre) => (x - centre) ** 2 + (y - faceY) ** 2 <= radius ** 2,
      );
      const figure = faces.findIndex(
        (centre) => y > faceY + radius && Math.abs(x - centre) < 0.14 * width,
      );
      const colour =
        face >= 0
          ? [232, 196, 160]
          : figure === 0
            ? [38, 44, 70]
            : figure === 1
              ? [246, 244, 238]
              : [red * shade, green * shade, blue * shade];
      pixels[at] = colour[0];
      pixels[at + 1] = colour[1];
      pixels[at + 2] = colour[2];
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 82 })
    .toBuffer();
}

const SCREENS = [
  { width: 390, height: 844, dpr: 2 },
  { width: 1024, height: 768, dpr: 1 },
  { width: 1440, height: 900, dpr: 1 },
];
const DEMO = "/w/thiep-mau";
let draft = "";
let session: Awaited<ReturnType<BrowserContext["storageState"]>>;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/account/register");
  await page.getByLabel("Tên của bạn").fill("Khách album ảnh dọc");
  await page
    .getByLabel("Số điện thoại")
    .fill(`09${String(Date.now()).slice(-8)}`);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("customer-password-2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Tạo tài khoản & bắt đầu" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/dashboard/new?template=template-rose");
  await page.getByLabel("Đường dẫn thiệp").fill(`album-doc-${Date.now()}`);
  // The new form starts with the demo album; this couple brings their own.
  const removeFirst = page.getByRole("button", {
    name: "Xóa ảnh 1",
    exact: true,
  });
  while (await removeFirst.count()) await removeFirst.click();
  const count = page.getByText(/^\d+\/\d+ ảnh ·/);
  await expect(count).toHaveText(/^0\//);
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  await expect(page).toHaveURL(/\/dashboard\/c[a-z0-9]+$/);
  draft = `/dashboard/${page.url().split("/").at(-1)}/preview`;

  for (let index = 0; index < PORTRAITS; index++) {
    await page.locator('input[type="file"]').setInputFiles({
      name: `chan-dung-${index + 1}.jpg`,
      mimeType: "image/jpeg",
      buffer: await syntheticPortrait(index),
    });
    await expect(count).toHaveText(new RegExp(`^${index + 1}/`), {
      timeout: 60_000,
    });
  }
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu thiệp");
  session = await context.storageState();
  await context.close();
});

async function onScreen(
  browser: Browser,
  screen: { width: number; height: number; dpr: number },
  run: (page: Page) => Promise<void>,
) {
  const context = await browser.newContext({
    storageState: session,
    viewport: { width: screen.width, height: screen.height },
    deviceScaleFactor: screen.dpr,
  });
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

async function openInvitation(page: Page, path: string) {
  await page.goto(path);
  await page
    .getByRole("button", { name: "Xem ngay, bỏ qua hiệu ứng", exact: true })
    .click();
  await expect(page.locator(".invitation-opening")).not.toBeVisible();
}

const frames = (page: Page) => page.locator("#album [data-album-photo]");

/** What a guest sees of one print: whether its photo arrived and shows. */
function frameState(frame: Locator) {
  return frame.evaluate((element: HTMLElement) => {
    const image = element.querySelector("img")!;
    const bounds = element.getBoundingClientRect();
    return {
      loaded: image.complete && image.naturalWidth > 0,
      opacity: getComputedStyle(element).opacity,
      reveal: element.dataset.reveal,
      inView: bounds.bottom > 0 && bounds.top < innerHeight,
      loading: image.loading,
      currentSrc: image.currentSrc,
    };
  });
}

async function expectFrameShown(frame: Locator) {
  await expect
    .poll(() => frameState(frame), { timeout: 20_000 })
    .toMatchObject({ loaded: true, opacity: "1", reveal: "in" });
}

/**
 * "slow" wheels through the album a step at a time; "fast" jumps from the top
 * of the page straight to frame 03, the way a flick past the story lands.
 */
async function scrollAlbum(page: Page, pace: "slow" | "fast") {
  if (pace === "fast") {
    await frames(page)
      .nth(2)
      .evaluate((element) =>
        window.scrollTo({
          top: element.getBoundingClientRect().top + scrollY - 80,
          behavior: "instant",
        }),
      );
    return;
  }
  const { start, end } = await page
    .locator("#album .wedding-album")
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        start: bounds.top + scrollY - innerHeight,
        end: bounds.bottom + scrollY,
      };
    });
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: "instant" }),
    start,
  );
  await page.mouse.move(20, 20);
  for (let y = start; y < end; y += 240) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(80);
  }
}

/**
 * The browser fetched a candidate wide enough for the frame. Chrome may take
 * the lower candidate on a 2x screen (its geometric-mean rule), so the bar
 * there is 1.5x the frame, still above what a too-small `sizes` yields.
 */
async function expectSharp(frame: Locator, dpr: number) {
  const { width, fetched } = await frame.evaluate((element) => ({
    width: element.clientWidth,
    fetched: Number(
      new URL(
        element.querySelector("img")!.currentSrc,
        location.href,
      ).searchParams.get("w"),
    ),
  }));
  expect(
    fetched,
    `ảnh tải về cho khung rộng ${width}px`,
  ).toBeGreaterThanOrEqual(
    Math.min(2048, Math.ceil(width * (dpr > 1 ? 1.5 : 1))),
  );
}

for (const screen of SCREENS)
  for (const route of ["draft", DEMO])
    test(`every Lời yêu album print loads its photo at ${screen.width}px on ${route === DEMO ? "the demo" : "a portrait-only draft"}`, async ({
      browser,
    }) => {
      await onScreen(browser, screen, async (page) => {
        await openInvitation(page, route === DEMO ? DEMO : draft);
        const prints = frames(page);
        if (route !== DEMO) await expect(prints).toHaveCount(PORTRAITS);
        await scrollAlbum(page, "slow");
        for (const frame of await prints.all()) {
          await frame.scrollIntoViewIfNeeded();
          await expectFrameShown(frame);
          await expectSharp(frame, screen.dpr);
        }
      });
    });

/**
 * Where the faces land inside the print, as a share of the frame's height
 * (0 = top edge, 1 = bottom edge), from the image's cover crop and its
 * scroll-driven drift.
 */
function faceBand(frame: Locator) {
  return frame.evaluate(
    (element, [faceTop, faceBottom]) => {
      const image = element.querySelector("img")!;
      const box = image.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      const height = Math.max(
        box.height,
        box.width / (image.naturalWidth / image.naturalHeight),
      );
      const position = getComputedStyle(image).objectPosition.split(" ");
      const top =
        box.top + (box.height - height) * (parseFloat(position[1]) / 100);
      return {
        top: (top + faceTop * height - bounds.top) / bounds.height,
        bottom: (top + faceBottom * height - bounds.top) / bounds.height,
      };
    },
    [FACE_TOP, FACE_BOTTOM],
  );
}

/** Face band with the print entering, centred and leaving the viewport. */
async function faceBandWhileScrolling(frame: Locator) {
  const bands = [];
  for (const place of ["entering", "centred", "leaving"] as const) {
    await frame.evaluate((element, place) => {
      const bounds = element.getBoundingClientRect();
      const offset = {
        entering: innerHeight - bounds.height,
        centred: (innerHeight - bounds.height) / 2,
        leaving: 0,
      }[place];
      window.scrollTo({
        top: bounds.top + scrollY - offset,
        behavior: "instant",
      });
      return new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      );
    }, place);
    bands.push({ place, ...(await faceBand(frame)) });
  }
  return bands;
}

/** The wide print before this fix: 16:9 with a centred crop. */
const PREVIOUS_WIDE_PRINT = `
.wedding-page .album-loi-yeu .wedding-album > button:nth-child(3n) {
  aspect-ratio: 16 / 9 !important;
}
.wedding-page .album-loi-yeu .wedding-album > button:nth-child(3n) img {
  object-position: center !important;
}`;

for (const screen of [SCREENS[0], SCREENS[2]])
  test(`a portrait in a full-width Lời yêu print keeps the faces at ${screen.width}px`, async ({
    browser,
  }, testInfo) => {
    await onScreen(browser, screen, async (page) => {
      await openInvitation(page, draft);
      await scrollAlbum(page, "slow");
      for (const index of [2, 5]) {
        const frame = frames(page).nth(index);
        const name = `khung-${String(index + 1).padStart(2, "0")}-${screen.width}px`;
        await frame.scrollIntoViewIfNeeded();
        await expectFrameShown(frame);
        // Entrances move the print itself; measure once they have played.
        await frame.evaluate((element) =>
          Promise.all(
            element
              .getAnimations()
              .filter((animation) => animation.timeline === document.timeline)
              .map((animation) => animation.finished),
          ),
        );
        await expect(frame).not.toHaveClass(/is-landscape/);
        const ratio = await frame.evaluate(
          (element) => element.clientWidth / element.clientHeight,
        );
        expect(ratio).toBeCloseTo(1.5, 1);
        await expect(frame.locator("img")).toHaveCSS(
          "object-position",
          "50% 12%",
        );
        for (const band of await faceBandWhileScrolling(frame)) {
          expect(band.top, `${name} ${band.place}`).toBeGreaterThanOrEqual(0);
          expect(band.bottom, `${name} ${band.place}`).toBeLessThanOrEqual(1);
        }
        await testInfo.attach(`${name}-sau-khi-sua.png`, {
          body: await frame.screenshot(),
          contentType: "image/png",
        });

        // Control: the same measurement cuts the faces under the old crop.
        const previous = await page.addStyleTag({
          content: PREVIOUS_WIDE_PRINT,
        });
        await frame.scrollIntoViewIfNeeded();
        const [, centred] = await faceBandWhileScrolling(frame);
        expect(centred.top, `${name} với khung 16:9 cũ`).toBeLessThan(0);
        await testInfo.attach(`${name}-khung-cu-16-9.png`, {
          body: await frame.screenshot(),
          contentType: "image/png",
        });
        await previous.evaluate((element) => (element as Element).remove());
      }
    });
  });

test("landscape photos in the demo's full-width prints keep a centred 3:2 crop", async ({
  browser,
}, testInfo) => {
  await onScreen(browser, SCREENS[2], async (page) => {
    await openInvitation(page, DEMO);
    await scrollAlbum(page, "slow");
    for (const index of [2, 5]) {
      const frame = frames(page).nth(index);
      await frame.scrollIntoViewIfNeeded();
      await expectFrameShown(frame);
      await expect(frame).toHaveClass(/is-landscape/);
      const ratio = await frame.evaluate(
        (element) => element.clientWidth / element.clientHeight,
      );
      expect(ratio).toBeCloseTo(1.5, 1);
      await expect(frame.locator("img")).toHaveCSS(
        "object-position",
        "50% 50%",
      );
      await testInfo.attach(
        `thiep-mau-khung-${String(index + 1).padStart(2, "0")}-1440px.png`,
        { body: await frame.screenshot(), contentType: "image/png" },
      );
    }
  });
});

// Frame 03 was once seen never loading on a real invitation at 1024px and
// wider. These runs try to reproduce that on the portrait draft.
for (const width of [1024, 1280, 1440])
  for (const dpr of [1, 2])
    for (const pace of ["slow", "fast"] as const)
      test(`frame 03 loads at ${width}px, DPR ${dpr}, ${pace} scroll`, async ({
        browser,
      }) => {
        await onScreen(browser, { width, height: 800, dpr }, async (page) => {
          await openInvitation(page, draft);
          await scrollAlbum(page, pace);
          const frame = frames(page).nth(2);
          await expectFrameShown(frame);
          await expectSharp(frame, dpr);
        });
      });
