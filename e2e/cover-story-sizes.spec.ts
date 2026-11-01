import { test, expect, type Browser, type Page } from "@playwright/test";

// The cover and the two story prints declare `sizes` from their rendered
// width (invitation-hero.tsx, invitation-story.tsx). On the Lời yêu demo each
// must arrive at least as wide as it is drawn in device pixels, unless the
// photo itself, or the widest variant (2048px), is narrower.

const DEMO = "/w/thiep-mau";
const SCREENS = [
  { width: 390, height: 844, dpr: 3 },
  { width: 1024, height: 768, dpr: 1 },
  { width: 1024, height: 768, dpr: 2 },
  { width: 1440, height: 900, dpr: 1 },
  { width: 1440, height: 900, dpr: 2 },
];
const PHOTOS = [
  { name: "ảnh bìa", selector: "[data-invitation-hero] [data-hero-photo] img" },
  {
    name: "ảnh in lớn ở câu chuyện",
    selector: ".story-loi-yeu [data-story-image].story-primary img",
  },
  {
    name: "ảnh in nhỏ ở câu chuyện",
    selector: ".story-loi-yeu [data-story-image].story-secondary img",
  },
];

async function onScreen(
  browser: Browser,
  screen: (typeof SCREENS)[number],
  run: (page: Page) => Promise<void>,
) {
  const context = await browser.newContext({
    viewport: { width: screen.width, height: screen.height },
    deviceScaleFactor: screen.dpr,
  });
  try {
    await run(await context.newPage());
  } finally {
    await context.close();
  }
}

/**
 * The drawn width of a loaded photo (its layout box, before the turn or
 * zoom of an entrance), the `w` the browser fetched, the `w` it fetches for
 * a `sizes` equal to that width, and the photo's own width.
 */
function measure(image: HTMLImageElement) {
  const param = (source: string, name: string) =>
    new URL(source, location.href).searchParams.get(name) ?? "";
  const width = parseFloat(getComputedStyle(image).width);
  const exact = new Image();
  exact.sizes = `${width}px`;
  exact.srcset = image.srcset;
  const original = new Image();
  original.src = param(image.currentSrc, "url");
  return Promise.all([
    exact.decode().catch(() => undefined),
    original.decode(),
  ]).then(() => ({
    width,
    fetched: Number(param(image.currentSrc, "w")),
    exact: Number(param(exact.currentSrc, "w")),
    original: original.naturalWidth,
  }));
}

for (const screen of SCREENS)
  test(`Lời yêu cover and story photos arrive sharp at ${screen.width}px, DPR ${screen.dpr}`, async ({
    browser,
  }) => {
    await onScreen(browser, screen, async (page) => {
      await page.goto(DEMO);
      await page
        .getByRole("button", { name: "Xem ngay, bỏ qua hiệu ứng", exact: true })
        .click();
      await expect(page.locator(".invitation-opening")).not.toBeVisible();
      for (const photo of PHOTOS) {
        const image = page.locator(photo.selector);
        await expect(image).toHaveCount(1);
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            image.evaluate(
              (element: HTMLImageElement) =>
                element.complete && element.naturalWidth > 0,
            ),
          )
          .toBe(true);
        const { width, fetched, exact, original } =
          await image.evaluate(measure);
        // Chromium may take the candidate just below width × DPR on a dense
        // screen (its geometric-mean rule) even when `sizes` is exact, so the
        // bar is never above what an exact `sizes` would fetch.
        const needed = Math.min(
          Math.ceil(width * screen.dpr),
          2048,
          original,
          exact,
        );
        expect(
          fetched,
          `${photo.name} rộng ${width}px, DPR ${screen.dpr}: tải bản ${fetched}px, cần ${needed}px`,
        ).toBeGreaterThanOrEqual(needed);
      }
    });
  });
