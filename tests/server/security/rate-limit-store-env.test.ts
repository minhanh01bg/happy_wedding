import { afterEach, describe, expect, it, vi } from "vitest";

import { validateEnv } from "@/config/env";

// Every production field valid except the rate-limit store.
const production = {
  NODE_ENV: "production",
  RATE_LIMIT_KEY_SECRET: "r".repeat(32),
  TRUSTED_PROXY_MODE: "custom",
  TRUSTED_CLIENT_IP_HEADER: "x-real-ip",
  CANONICAL_ORIGIN: "https://thiep.example.com",
  NEXT_PUBLIC_APP_URL: "https://thiep.example.com",
  STORE_PASSWORD_HASH: `600000:${"4".repeat(32)}:${"5".repeat(64)}`,
};
const upstash = {
  UPSTASH_REDIS_REST_URL: "https://redis.example.com",
  UPSTASH_REDIS_REST_TOKEN: "token",
};

function failingFields(raw: Record<string, unknown>) {
  const result = validateEnv(raw);
  return result.success
    ? []
    : [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
}

describe("RATE_LIMIT_STORE validation", () => {
  it("still requires Upstash in production by default", () => {
    expect(failingFields(production)).toEqual([
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]);
    expect(failingFields({ ...production, ...upstash })).toEqual([]);
  });

  it("requires Upstash when RATE_LIMIT_STORE=upstash", () => {
    expect(
      failingFields({ ...production, RATE_LIMIT_STORE: "upstash" }),
    ).toEqual(["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]);
  });

  it("accepts production without Upstash only with RATE_LIMIT_STORE=memory", () => {
    const result = validateEnv({ ...production, RATE_LIMIT_STORE: "memory" });
    expect(result.success).toBe(true);
    expect(result.data?.RATE_LIMIT_STORE).toBe("memory");
  });

  it("keeps the other production checks with the memory store", () => {
    expect(
      failingFields({
        ...production,
        RATE_LIMIT_KEY_SECRET: undefined,
        RATE_LIMIT_STORE: "memory",
      }),
    ).toEqual(["RATE_LIMIT_KEY_SECRET"]);
  });

  it("rejects unknown stores and an empty value", () => {
    expect(
      failingFields({ ...production, RATE_LIMIT_STORE: "redis" }),
    ).toContain("RATE_LIMIT_STORE");
    expect(failingFields({ ...production, RATE_LIMIT_STORE: "" })).toContain(
      "RATE_LIMIT_STORE",
    );
  });

  it("never defaults to the memory store", () => {
    expect(
      validateEnv({ NODE_ENV: "development" }).data?.RATE_LIMIT_STORE,
    ).toBe(undefined);
    expect(
      validateEnv({ ...production, ...upstash }).data?.RATE_LIMIT_STORE,
    ).toBe(undefined);
  });
});

describe("Build-phase placeholders and the rate-limit store", () => {
  const productionRuntime = {
    ...production,
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
    RATE_LIMIT_STORE: undefined,
    NEXT_PHASE: undefined,
    npm_lifecycle_event: undefined,
  };

  function stubEnv(values: Record<string, string | undefined>) {
    for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("builds without Upstash but never turns the memory store on", async () => {
    stubEnv({ ...productionRuntime, NEXT_PHASE: "phase-production-build" });
    vi.resetModules();
    const { env } = await import("@/config/env");
    expect(env.RATE_LIMIT_STORE).toBe(undefined);
    expect(env.UPSTASH_REDIS_REST_URL).toBe(
      "https://build-time-dummy.upstash.io",
    );
  });

  it("refuses to start the same settings at runtime", async () => {
    stubEnv(productionRuntime);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    await expect(import("@/config/env")).rejects.toThrow(
      "Invalid environment variables",
    );
  });

  it("starts at runtime once RATE_LIMIT_STORE=memory is set", async () => {
    stubEnv({ ...productionRuntime, RATE_LIMIT_STORE: "memory" });
    vi.resetModules();
    const { env } = await import("@/config/env");
    expect(env.RATE_LIMIT_STORE).toBe("memory");
    expect(env.UPSTASH_REDIS_REST_URL).toBe(undefined);
  });
});
