import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RateLimitPolicy } from "@/server/security/rate-limit-policy";

const redisMock = vi.hoisted(() => ({ constructed: 0, evalCalls: 0 }));
const logMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
// Stands in for the parsed env; each test sets the fields it needs.
const envMock = vi.hoisted(() => ({}) as Record<string, string | undefined>);

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor() {
      redisMock.constructed += 1;
    }

    async eval(): Promise<[number, number]> {
      redisMock.evalCalls += 1;
      return [1, 60];
    }

    async del(): Promise<number> {
      return 1;
    }
  },
}));

vi.mock("@/lib/logger", () => ({ logger: logMock }));
vi.mock("@/config/env", () => ({ env: envMock }));

const policy: RateLimitPolicy = {
  name: "store-selection",
  failClosed: true,
  buckets: [{ name: "ip-burst", limit: 2, windowSeconds: 60 }],
};
const ip = "203.0.113.9";
const targets = [{ bucketName: "ip-burst", dimension: "ip", identifier: ip }];

function setEnv(values: Record<string, string | undefined>) {
  for (const key of Object.keys(envMock)) delete envMock[key];
  Object.assign(envMock, { RATE_LIMIT_KEY_SECRET: "s".repeat(32) }, values);
}

describe("Rate-limit store selection in production", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    redisMock.constructed = 0;
    redisMock.evalCalls = 0;
    logMock.info.mockClear();
    logMock.warn.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses one in-process store with RATE_LIMIT_STORE=memory, even when Upstash is set", async () => {
    setEnv({
      RATE_LIMIT_STORE: "memory",
      UPSTASH_REDIS_REST_URL: "https://example-redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
    });
    const { createRateLimiter } = await import("@/server/security/rate-limit");

    // Two limiters share the process store, so the third request is limited.
    await expect(
      createRateLimiter().check(policy, targets),
    ).resolves.toMatchObject({ allowed: true, remaining: 1 });
    await expect(
      createRateLimiter().check(policy, targets),
    ).resolves.toMatchObject({ allowed: true, remaining: 0 });
    await expect(
      createRateLimiter().check(policy, targets),
    ).resolves.toMatchObject({ allowed: false, reason: "rate_limited" });

    expect(redisMock.constructed).toBe(0);
    expect(redisMock.evalCalls).toBe(0);
  });

  it("logs once, with the app logger, that the limiter is in-process for one instance", async () => {
    setEnv({ RATE_LIMIT_STORE: "memory" });
    const consoleInfo = vi.spyOn(console, "info");
    const { createRateLimiter } = await import("@/server/security/rate-limit");

    const limiter = createRateLimiter();
    await limiter.check(policy, targets);
    await limiter.check(policy, targets);
    await createRateLimiter().reset?.(policy, targets[0]);

    expect(logMock.info).toHaveBeenCalledTimes(1);
    expect(logMock.info).toHaveBeenCalledWith(
      "rate_limit_store_in_process",
      expect.objectContaining({
        store: "memory",
        validFor: "a single instance only",
        maxKeys: 50_000,
      }),
    );
    expect(consoleInfo).not.toHaveBeenCalled();
  });

  it("stores only HMAC'd keys in the in-process store", async () => {
    setEnv({ RATE_LIMIT_STORE: "memory" });
    const { createRateLimiter, MemoryRateLimitStore } =
      await import("@/server/security/rate-limit");
    const increment = vi.spyOn(
      MemoryRateLimitStore.prototype,
      "incrementAndGetTtl",
    );

    await createRateLimiter().check(policy, targets);

    expect(increment).toHaveBeenCalledTimes(1);
    const key = increment.mock.calls[0][0];
    expect(key).not.toContain(ip);
    expect(key).toMatch(/^rl:v1:store-selection:ip-burst:ip:[0-9a-f]{32}$/);
  });

  it("resets a key in the in-process store", async () => {
    setEnv({ RATE_LIMIT_STORE: "memory" });
    const { createRateLimiter } = await import("@/server/security/rate-limit");
    const limiter = createRateLimiter();

    await limiter.check(policy, targets);
    await limiter.check(policy, targets);
    await limiter.reset?.(policy, targets[0]);

    await expect(limiter.check(policy, targets)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("uses Upstash when RATE_LIMIT_STORE is unset or upstash", async () => {
    for (const RATE_LIMIT_STORE of [undefined, "upstash"]) {
      vi.resetModules();
      redisMock.constructed = 0;
      setEnv({
        RATE_LIMIT_STORE,
        UPSTASH_REDIS_REST_URL: "https://example-redis.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "token",
      });
      const { createRateLimiter } =
        await import("@/server/security/rate-limit");

      await createRateLimiter().check(policy, targets);

      expect(redisMock.constructed).toBe(1);
    }
    expect(logMock.info).not.toHaveBeenCalled();
  });

  it("fails closed without Upstash unless memory was chosen", async () => {
    setEnv({});
    const { createRateLimiter } = await import("@/server/security/rate-limit");

    await expect(
      createRateLimiter().check(policy, targets),
    ).resolves.toMatchObject({ allowed: false, reason: "limiter_unavailable" });
    await expect(
      createRateLimiter().check({ ...policy, failClosed: false }, targets),
    ).resolves.toMatchObject({ allowed: true });
    expect(redisMock.constructed).toBe(0);
    expect(logMock.info).not.toHaveBeenCalled();
  });
});
