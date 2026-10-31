import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { randomUUID } from "@/lib/random-id";

const V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const webCrypto = globalThis.crypto;

/** Như trình duyệt trên http thường: có getRandomValues, không có randomUUID. */
function stubInsecureCrypto() {
  const getRandomValues = vi.fn((array: Uint8Array) =>
    webCrypto.getRandomValues(array),
  );
  vi.stubGlobal("crypto", { getRandomValues });
  return getRandomValues;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("randomUUID", () => {
  it("uses crypto.randomUUID when the browser provides it", () => {
    const native = vi.spyOn(webCrypto, "randomUUID");
    const id = randomUUID();
    expect(native).toHaveBeenCalledOnce();
    expect(id).toMatch(V4);
  });

  it("builds a v4 UUID from getRandomValues when randomUUID is missing", () => {
    const getRandomValues = stubInsecureCrypto();
    expect(globalThis.crypto.randomUUID).toBeUndefined();
    const random = vi.spyOn(Math, "random");

    const ids = Array.from({ length: 200 }, () => randomUUID());

    expect(getRandomValues).toHaveBeenCalledTimes(200);
    expect(random).not.toHaveBeenCalled();
    expect(new Set(ids).size).toBe(200);
    for (const id of ids) {
      expect(id).toMatch(V4);
      expect(id[14]).toBe("4"); // version nibble
      expect("89ab").toContain(id[19]); // variant 10xx
      expect(z.uuid().safeParse(id).success).toBe(true); // schema của server
    }
  });

  it("sets the version and variant bits whatever bytes come back", () => {
    for (const fill of [0x00, 0xff]) {
      vi.stubGlobal("crypto", {
        getRandomValues: (array: Uint8Array) => array.fill(fill),
      });
      expect(randomUUID()).toBe(
        fill === 0
          ? "00000000-0000-4000-8000-000000000000"
          : "ffffffff-ffff-4fff-bfff-ffffffffffff",
      );
    }
  });
});
