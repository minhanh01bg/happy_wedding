import { describe, expect, it, vi } from "vitest";

import {
  createRateLimiter,
  MEMORY_STORE_FULL_REPORT_INTERVAL_MS,
  MEMORY_STORE_FULL_SWEEP_INTERVAL_MS,
  MEMORY_STORE_MAX_KEYS,
  MEMORY_STORE_SWEEP_INTERVAL_MS,
  MemoryRateLimitStore,
  RateLimitStoreFullError,
} from "@/server/security/rate-limit";
import type { RateLimitPolicy } from "@/server/security/rate-limit-policy";

const T0 = 1_000_000_000;

describe("Bounded in-process rate-limit store", () => {
  it("counts within the window and starts over once it has passed", async () => {
    const store = new MemoryRateLimitStore();
    expect(await store.incrementAndGetTtl("a", 60, T0)).toEqual({
      count: 1,
      ttlSeconds: 60,
    });
    expect(await store.incrementAndGetTtl("a", 60, T0 + 20_500)).toEqual({
      count: 2,
      ttlSeconds: 40,
    });
    expect(await store.incrementAndGetTtl("a", 60, T0 + 60_000)).toEqual({
      count: 1,
      ttlSeconds: 60,
    });
  });

  it("drops expired entries on access, at most once per sweep interval", async () => {
    const store = new MemoryRateLimitStore();
    await store.incrementAndGetTtl("short-1", 1, T0);
    await store.incrementAndGetTtl("short-2", 1, T0);
    await store.incrementAndGetTtl("long", 3600, T0);
    expect(store.size).toBe(3);

    // Expired, but the last sweep was less than an interval ago.
    await store.incrementAndGetTtl("long", 3600, T0 + 5_000);
    await store.incrementAndGetTtl("other", 30, T0 + 5_000);
    expect(store.size).toBe(4);

    await store.incrementAndGetTtl(
      "after-interval",
      60,
      T0 + MEMORY_STORE_SWEEP_INTERVAL_MS,
    );
    // short-1, short-2 and "other" (30 s) are gone; "long" stays.
    expect(store.size).toBe(2);
    expect(
      await store.incrementAndGetTtl(
        "long",
        3600,
        T0 + MEMORY_STORE_SWEEP_INTERVAL_MS,
      ),
    ).toMatchObject({ count: 3 });
  });

  it("caps the number of keys at 50,000 by default", () => {
    expect(MEMORY_STORE_MAX_KEYS).toBe(50_000);
  });

  it("refuses a new key when full but keeps counting existing keys", async () => {
    const onFull = vi.fn();
    const store = new MemoryRateLimitStore({ maxKeys: 3, onFull });
    for (const key of ["a", "b", "c"]) {
      await store.incrementAndGetTtl(key, 600, T0);
    }

    await expect(store.incrementAndGetTtl("d", 600, T0 + 1)).rejects.toThrow(
      RateLimitStoreFullError,
    );
    expect(store.size).toBe(3);
    // Nothing was evicted: the existing counter continues, never reset early.
    expect(await store.incrementAndGetTtl("a", 600, T0 + 2)).toMatchObject({
      count: 2,
    });
    expect(onFull).toHaveBeenCalledTimes(1);
    expect(onFull).toHaveBeenCalledWith(3);
  });

  it("reports a full store at most once per report interval", async () => {
    const onFull = vi.fn();
    const store = new MemoryRateLimitStore({ maxKeys: 1, onFull });
    await store.incrementAndGetTtl("a", 86_400, T0);
    for (let i = 0; i < 5; i++) {
      await expect(
        store.incrementAndGetTtl(`new-${i}`, 60, T0 + i * 1_000),
      ).rejects.toThrow(RateLimitStoreFullError);
    }
    expect(onFull).toHaveBeenCalledTimes(1);

    await expect(
      store.incrementAndGetTtl(
        "later",
        60,
        T0 + MEMORY_STORE_FULL_REPORT_INTERVAL_MS,
      ),
    ).rejects.toThrow(RateLimitStoreFullError);
    expect(onFull).toHaveBeenCalledTimes(2);
  });

  it("frees room once entries expire, and reuses an expired key's slot", async () => {
    const store = new MemoryRateLimitStore({ maxKeys: 2 });
    await store.incrementAndGetTtl("short", 1, T0);
    await store.incrementAndGetTtl("long", 3600, T0);

    // A full store still restarts an expired key in place.
    await expect(
      store.incrementAndGetTtl("short", 1, T0 + 2_000),
    ).resolves.toEqual({ count: 1, ttlSeconds: 1 });

    // Expired at T0 + 3 s; the full-store sweep runs at most once a second.
    await expect(
      store.incrementAndGetTtl("new", 60, T0 + 3_000),
    ).resolves.toEqual({ count: 1, ttlSeconds: 60 });
    expect(store.size).toBe(2);
    await expect(
      store.incrementAndGetTtl("newer", 60, T0 + 3_000 + 10),
    ).rejects.toThrow(RateLimitStoreFullError);
    await expect(
      store.incrementAndGetTtl(
        "newer",
        60,
        T0 + 3_000 + MEMORY_STORE_FULL_SWEEP_INTERVAL_MS,
      ),
    ).rejects.toThrow(RateLimitStoreFullError);
  });

  describe("limiter decisions on a full store", () => {
    const secret = "k".repeat(32);
    const closed: RateLimitPolicy = {
      name: "full-closed",
      failClosed: true,
      buckets: [{ name: "per-ip", limit: 2, windowSeconds: 600 }],
    };
    const open: RateLimitPolicy = {
      ...closed,
      name: "full-open",
      failClosed: false,
    };
    const target = (ip: string) => [
      { bucketName: "per-ip", dimension: "ip", identifier: ip },
    ];

    async function fullStore() {
      const store = new MemoryRateLimitStore({ maxKeys: 2 });
      const limiter = createRateLimiter({ store, secret });
      // Keys are per policy, so fill the store through the fail-closed one.
      for (let i = 0; i < 3; i++) {
        await limiter.check(closed, target("198.51.100.1"));
      }
      await limiter.check(closed, target("198.51.100.2"));
      expect(store.size).toBe(2);
      return limiter;
    }

    it("denies a new client under a fail-closed policy", async () => {
      const limiter = await fullStore();
      await expect(
        limiter.check(closed, target("198.51.100.3")),
      ).resolves.toMatchObject({
        allowed: false,
        reason: "limiter_unavailable",
      });
    });

    it("keeps an over-limit client limited, never resetting its counter", async () => {
      const limiter = await fullStore();
      await expect(
        limiter.check(closed, target("198.51.100.1")),
      ).resolves.toMatchObject({ allowed: false, reason: "rate_limited" });
      await expect(
        limiter.check(closed, target("198.51.100.2")),
      ).resolves.toMatchObject({ allowed: true, remaining: 0 });
    });

    it("lets a new client through under a fail-open policy", async () => {
      const limiter = await fullStore();
      await expect(
        limiter.check(open, target("198.51.100.3")),
      ).resolves.toMatchObject({ allowed: true });
    });
  });
});
