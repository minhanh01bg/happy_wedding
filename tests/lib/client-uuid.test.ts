import { afterEach, describe, expect, it, vi } from "vitest";

import { createClientId } from "@/lib/client-uuid";

afterEach(() => vi.unstubAllGlobals());

describe("createClientId", () => {
  it("tạo UUID v4 bằng getRandomValues khi HTTP không có randomUUID", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      for (let index = 0; index < bytes.length; index++) bytes[index] = index;
      return bytes;
    });
    vi.stubGlobal("crypto", { getRandomValues });

    expect(createClientId()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it("không dùng Math.random cho mã đơn nếu thiếu nguồn ngẫu nhiên bảo mật", () => {
    vi.stubGlobal("crypto", {});
    expect(() => createClientId()).toThrow(/ngẫu nhiên bảo mật/i);
  });
});
