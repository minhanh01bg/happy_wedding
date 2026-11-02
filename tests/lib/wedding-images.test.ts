import { describe, expect, it } from "vitest";
import {
  demonstrationPhotos,
  DEMO_PHOTOS,
  heroCover,
} from "@/lib/wedding-images";

const legacy = [
  "/images/couple.jpg",
  "/images/flowers.jpg",
  "/images/celebration.jpg",
];
describe("demonstration album upgrade", () => {
  it("upgrades the original demonstration while preserving customer albums", () => {
    expect(demonstrationPhotos(legacy, true)).toEqual(DEMO_PHOTOS);
    expect(demonstrationPhotos(legacy, false)).toEqual(legacy);
  });
  it("preserves custom demonstration photos including an intentionally empty album", () => {
    const custom = ["/uploads/our-wedding.jpg"];
    expect(demonstrationPhotos(custom, true)).toEqual(custom);
    expect(demonstrationPhotos([], true)).toEqual([]);
  });
});
describe("hero cover", () => {
  const demo = { isDemo: true, coverUrl: "/images/couple.jpg" };
  it("gives each demonstration design its own couple photo from the album", () => {
    expect(heroCover(demo, "loi-hen", DEMO_PHOTOS)).toBe(
      "/images/wedding-couple-journey.jpg",
    );
  });
  it("keeps the chosen cover otherwise", () => {
    const upload =
      "/uploads/weddings/3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.webp";
    expect(
      heroCover(
        { isDemo: false, coverUrl: "/images/couple.jpg" },
        "loi-hen",
        DEMO_PHOTOS,
      ),
    ).toBe("/images/couple.jpg");
    expect(
      heroCover({ isDemo: true, coverUrl: upload }, "loi-hen", DEMO_PHOTOS),
    ).toBe(upload);
    expect(heroCover(demo, "loi-hen", [])).toBe("/images/couple.jpg");
    expect(heroCover(demo, "unknown", DEMO_PHOTOS)).toBe("/images/couple.jpg");
  });
});
