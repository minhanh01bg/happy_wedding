import { describe, expect, it } from "vitest";

import { decodeCostBytes, MAX_UPLOAD_DECODE_BYTES } from "@/lib/wedding-upload";

const fits = (image: Parameters<typeof decodeCostBytes>[0]) =>
  decodeCostBytes(image) <= MAX_UPLOAD_DECODE_BYTES;

describe("decodeCostBytes", () => {
  it("nhận JPEG RGB 8-bit tới trần 64 megapixel", () => {
    const rgb8 = { channels: 3, depth: "uchar", hasAlpha: false };
    expect(decodeCostBytes({ width: 5464, height: 8192, ...rgb8 })).toBe(
      5464 * 8192 * 3,
    );
    expect(fits({ width: 5464, height: 8192, ...rgb8 })).toBe(true);
    expect(fits({ width: 8192, height: 5464, ...rgb8 })).toBe(true);
    expect(fits({ width: 8000, height: 8000, ...rgb8 })).toBe(true);
  });

  it("từ chối RGBA 16-bit từ 32 megapixel và ảnh alpha lớn tương tự", () => {
    const rgba16 = { channels: 4, depth: "ushort", hasAlpha: true };
    expect(decodeCostBytes({ width: 5657, height: 5657, ...rgba16 })).toBe(
      5657 * 5657 * 8,
    );
    expect(fits({ width: 5657, height: 5657, ...rgba16 })).toBe(false);
    expect(fits({ width: 5100, height: 5100, ...rgba16 })).toBe(true);
    // Alpha counts as 8 bytes per pixel even at 8 bits or with fewer channels.
    for (const alpha of [
      { channels: 4, depth: "uchar" },
      { channels: 2, depth: "uchar" },
    ])
      expect(
        fits({ width: 5657, height: 5657, hasAlpha: true, ...alpha }),
      ).toBe(false);
    // Measured: 8-bit RGBA 52 MP took 1.26 GB. CMYK-like 4 channels without
    // alpha stays at 4 bytes per pixel.
    const big = { width: 7200, height: 7200, channels: 4, depth: "uchar" };
    expect(fits({ ...big, hasAlpha: true })).toBe(false);
    expect(fits({ ...big, hasAlpha: false })).toBe(true);
  });

  it("RGB 16-bit lọt tới khoảng 34,9 megapixel", () => {
    const rgb16 = { channels: 3, depth: "ushort", hasAlpha: false };
    expect(fits({ width: 5900, height: 5900, ...rgb16 })).toBe(true);
    expect(fits({ width: 6000, height: 6000, ...rgb16 })).toBe(false);
  });
});
