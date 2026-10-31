import { test, expect } from "@playwright/test";

// Chrome on iOS writes its own attributes into the page before React hydrates:
// a frame token on <html> and an autofill id on every form field. React then
// reports "A tree hydrated but some attributes … didn't match" in the dev
// overlay, although the app never rendered those attributes.
function simulateChromeIos() {
  const fields = "form, input, textarea, select";
  let nextId = 0;
  const tag = (node: Node) => {
    if (!(node instanceof Element)) return;
    if (node === document.documentElement)
      node.setAttribute(
        "__gcrremoteframetoken",
        "e18e4ade9825e4ce5dd6891ccfe2d40a",
      );
    for (const field of [
      ...(node.matches(fields) ? [node] : []),
      ...node.querySelectorAll(fields),
    ])
      if (!field.hasAttribute("__gcruniqueid"))
        field.setAttribute("__gcruniqueid", String(++nextId));
  };
  if (document.documentElement) tag(document.documentElement);
  new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach(tag);
  }).observe(document, { childList: true, subtree: true });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Chrome on iOS attributes do not raise hydration warnings at ${viewport.width}px`, async ({
    page,
  }) => {
    const warnings: string[] = [];
    const hydration = /hydrat|didn't match/i;
    page.on("console", (message) => {
      if (
        (message.type() === "error" || message.type() === "warning") &&
        hydration.test(message.text())
      )
        warnings.push(`${page.url()} ${message.text()}`);
    });
    page.on("pageerror", (error) => {
      if (hydration.test(error.message))
        warnings.push(`${page.url()} ${error.message}`);
    });
    await page.addInitScript(simulateChromeIos);
    await page.setViewportSize(viewport);
    const scrollToEnd = () =>
      page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
          window.scrollTo({ top: y, behavior: "instant" });
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      });

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute(
      "__gcrremoteframetoken",
      /.+/,
    );
    await scrollToEnd();

    await page.goto("/w/thiep-mau");
    await expect(page.locator("html")).toHaveAttribute(
      "__gcrremoteframetoken",
      /.+/,
    );
    const rsvp = page.locator("#rsvp form");
    // The test only proves something if the fields really carry the ids.
    await expect(rsvp).toHaveAttribute("__gcruniqueid", /\d+/);
    await expect(rsvp.locator('input[name="name"]')).toHaveAttribute(
      "__gcruniqueid",
      /\d+/,
    );
    await expect(rsvp.locator('textarea[name="message"]')).toHaveAttribute(
      "__gcruniqueid",
      /\d+/,
    );
    await page.getByRole("button", { name: /^Mở thiệp/ }).click();
    await expect(page.locator(".invitation-opening")).not.toBeVisible();
    await scrollToEnd();
    await rsvp.scrollIntoViewIfNeeded();
    await expect(rsvp.getByLabel("Tên của bạn")).toBeVisible();
    await rsvp.getByLabel("Tên của bạn").fill("Khách dùng iPhone");
    await expect(rsvp.getByLabel("Tên của bạn")).toHaveValue(
      "Khách dùng iPhone",
    );

    expect(warnings).toEqual([]);
  });
}
