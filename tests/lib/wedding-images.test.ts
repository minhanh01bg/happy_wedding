import { describe, expect, it } from "vitest";
import { demonstrationPhotos, DEMO_PHOTOS } from "@/lib/wedding-images";

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
