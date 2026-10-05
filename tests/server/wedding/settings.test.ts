import { describe, expect, it, afterEach, vi } from "vitest";
import { merchantSchema } from "@/lib/wedding";
import { paymentReadiness } from "@/server/wedding/settings";

const legacy = {
  bank: "970436",
  account: "123456789",
  name: "TEST MERCHANT",
  support: "",
};
afterEach(() => vi.unstubAllEnvs());
describe("Merchant configuration", () => {
  it("reads old settings with empty new contacts", () => {
    expect(merchantSchema.parse(legacy)).toMatchObject({
      supportPhone: "",
      supportEmail: "",
    });
  });
  it("rejects incomplete accounts and invalid contact links", () => {
    for (const value of [
      { ...legacy, name: "" },
      { ...legacy, supportPhone: "javascript:alert(1)" },
      { ...legacy, supportEmail: "invalid" },
    ]) {
      expect(merchantSchema.safeParse(value).success).toBe(false);
    }
  });
  it("only reports automatic readiness for synchronized complete configuration", () => {
    vi.stubEnv("SEPAY_WEBHOOK_API_KEY", "x".repeat(32));
    vi.stubEnv("SEPAY_ACCOUNT_NUMBER", legacy.account);
    const settings = merchantSchema.parse(legacy);
    expect(paymentReadiness(settings).automaticReady).toBe(true);
    expect(
      paymentReadiness({ ...settings, account: "987654321" }).automaticReady,
    ).toBe(false);
    vi.stubEnv("SEPAY_WEBHOOK_API_KEY", "short");
    expect(paymentReadiness(settings).automaticReady).toBe(false);
  });
});
