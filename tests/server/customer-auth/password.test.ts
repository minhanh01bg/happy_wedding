import { describe, expect, it } from "vitest";
import {
  hashCustomerPassword,
  verifyCustomerCredential,
  verifyCustomerPassword,
} from "@/server/customer-auth/password";
import {
  createOpaqueToken,
  digestOpaqueToken,
  CUSTOMER_SESSION_COOKIE,
  customerCookieOptionsForRequest,
} from "@/server/customer-auth/session";
import {
  adminCookieOptionsForRequest,
  SESSION_COOKIE,
} from "@/server/auth/session";

describe("customer credentials", () => {
  it("hash mật khẩu có salt và version", async () => {
    const a = await hashCustomerPassword("correct horse battery");
    const b = await hashCustomerPassword("correct horse battery");
    expect(a).toMatch(/^scrypt-v1\$/);
    expect(a).not.toBe(b);
    expect(await verifyCustomerPassword("correct horse battery", a)).toBe(true);
    expect(await verifyCustomerPassword("wrong password", a)).toBe(false);
  });
  it("token opaque 256-bit chỉ lưu digest", () => {
    const token = createOpaqueToken();
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(digestOpaqueToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(digestOpaqueToken(token)).not.toContain(token);
  });
  it("cookie customer tách biệt admin", () => {
    expect(CUSTOMER_SESSION_COOKIE).toBe("customer_session");
    expect(SESSION_COOKIE).toBe("pos_session");
    expect(CUSTOMER_SESSION_COOKIE).not.toBe(SESSION_COOKIE);
  });
});

describe("verifyCustomerCredential", () => {
  it("chạy scrypt đầy đủ kể cả khi không có tài khoản", async () => {
    const hash = await hashCustomerPassword("correct horse battery");
    expect(await verifyCustomerCredential("correct horse battery", hash)).toBe(
      true,
    );
    expect(await verifyCustomerCredential("wrong password", hash)).toBe(false);
    // Warm the dummy hash so the timed runs measure verification only.
    expect(await verifyCustomerCredential("x", undefined)).toBe(false);

    const time = async (encoded: string | undefined) => {
      const start = performance.now();
      for (let i = 0; i < 3; i++)
        await verifyCustomerCredential("wrong password", encoded);
      return performance.now() - start;
    };
    const existing = await time(hash);
    const missing = await time(undefined);
    expect(missing).toBeGreaterThan(existing * 0.4);
  });
});

describe("customerCookieOptionsForRequest", () => {
  it("đăng nhập và đăng xuất dùng cùng chính sách Secure với admin", () => {
    const https = new Request("https://example.test/api/customer-auth/login");
    expect(customerCookieOptionsForRequest(https)).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    const proxied = new Request("http://127.0.0.1/api/customer-auth/logout", {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(customerCookieOptionsForRequest(proxied).secure).toBe(true);
    const http = new Request("http://127.0.0.1/api/customer-auth/logout");
    expect(customerCookieOptionsForRequest(http).secure).toBe(
      adminCookieOptionsForRequest(http).secure,
    );
  });
});
