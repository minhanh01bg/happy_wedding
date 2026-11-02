import { createHmac } from "node:crypto";
import { Redis } from "@upstash/redis";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type { RateLimitPolicy } from "./rate-limit-policy";

export interface RateLimitStore {
  incrementAndGetTtl(
    key: string,
    windowSeconds: number,
    now?: number,
  ): Promise<{ count: number; ttlSeconds: number }>;
  delete?(key: string): Promise<void>;
}

export class UpstashRedisStore implements RateLimitStore {
  private redis: Redis;
  private static readonly LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`;

  constructor(url?: string, token?: string) {
    const redisUrl = url ?? env.UPSTASH_REDIS_REST_URL;
    const redisToken = token ?? env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      throw new Error("Missing Upstash Redis REST URL or token configuration");
    }

    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  async incrementAndGetTtl(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; ttlSeconds: number }> {
    const res = (await this.redis.eval(
      UpstashRedisStore.LUA_SCRIPT,
      [key],
      [windowSeconds],
    )) as unknown;

    if (
      !Array.isArray(res) ||
      typeof res[0] !== "number" ||
      typeof res[1] !== "number"
    ) {
      throw new Error("Malformed response from Redis rate limiter");
    }

    const count = res[0];
    const ttlSeconds = res[1] > 0 ? res[1] : windowSeconds;
    return { count, ttlSeconds };
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

/**
 * Most keys the in-process store holds. A key with its counter takes about
 * 240 bytes of heap (measured with HMAC'd keys), so a full store is about
 * 12 MB. Normal traffic for one wedding site stays far below this; only a
 * flood of distinct clients reaches it. See ADR 0012.
 */
export const MEMORY_STORE_MAX_KEYS = 50_000;
/** Expired entries are dropped on access at most this often. */
export const MEMORY_STORE_SWEEP_INTERVAL_MS = 60_000;
/** While full, a refused new key may trigger a sweep at most this often. */
export const MEMORY_STORE_FULL_SWEEP_INTERVAL_MS = 1_000;
/** While full, onFull is reported at most this often. */
export const MEMORY_STORE_FULL_REPORT_INTERVAL_MS = 60_000;

/** Thrown for a new key while the store already holds maxKeys live keys. */
export class RateLimitStoreFullError extends Error {
  constructor() {
    super("In-process rate-limit store is full");
    this.name = "RateLimitStoreFullError";
  }
}

export interface MemoryRateLimitStoreOptions {
  maxKeys?: number;
  /** Called when a new key is refused, at most once per report interval. */
  onFull?: (keys: number) => void;
}

/**
 * Fixed-window counters in this process's memory, bounded in size.
 *
 * Expired entries are swept on access (at most once a minute, and at most
 * once a second while full). With maxKeys live entries, a NEW key is refused
 * with RateLimitStoreFullError while existing keys keep counting. Nothing is
 * evicted early, so no counter is ever reset before its window ends: the
 * limiter treats the refusal as "limiter unavailable", so a fail-closed
 * policy denies the uncounted client and a fail-open policy lets it through.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<
    string,
    { count: number; expiresAt: number }
  >();
  private readonly maxKeys: number;
  private readonly onFull?: (keys: number) => void;
  private lastSweepAt = Number.NEGATIVE_INFINITY;
  private lastFullReportAt = Number.NEGATIVE_INFINITY;

  constructor(options: MemoryRateLimitStoreOptions = {}) {
    this.maxKeys = options.maxKeys ?? MEMORY_STORE_MAX_KEYS;
    this.onFull = options.onFull;
  }

  /** Entries held now, including expired ones not yet swept. */
  get size(): number {
    return this.entries.size;
  }

  async incrementAndGetTtl(
    key: string,
    windowSeconds: number,
    now = Date.now(),
  ): Promise<{ count: number; ttlSeconds: number }> {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > now) {
      entry.count += 1;
      const ttlSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
      return { count: entry.count, ttlSeconds };
    }

    if (this.sweepDue(now, MEMORY_STORE_SWEEP_INTERVAL_MS)) this.sweep(now);
    // An expired entry still in the map is reused in place: no new slot.
    if (!this.entries.has(key) && this.entries.size >= this.maxKeys) {
      if (this.sweepDue(now, MEMORY_STORE_FULL_SWEEP_INTERVAL_MS))
        this.sweep(now);
      if (this.entries.size >= this.maxKeys) {
        this.reportFull(now);
        throw new RateLimitStoreFullError();
      }
    }

    this.entries.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { count: 1, ttlSeconds: windowSeconds };
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  private sweepDue(now: number, intervalMs: number): boolean {
    // A clock that went backwards also sweeps, so it cannot stall sweeping.
    return now < this.lastSweepAt || now - this.lastSweepAt >= intervalMs;
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    this.lastSweepAt = now;
  }

  private reportFull(now: number): void {
    if (
      now >= this.lastFullReportAt &&
      now - this.lastFullReportAt < MEMORY_STORE_FULL_REPORT_INTERVAL_MS
    )
      return;
    this.lastFullReportAt = now;
    this.onFull?.(this.entries.size);
  }
}

// One in-process store per process: development and tests always, production
// only with RATE_LIMIT_STORE=memory.
let memoryStore: MemoryRateLimitStore | null = null;
function getGlobalMemoryStore(): RateLimitStore {
  if (!memoryStore) {
    memoryStore = new MemoryRateLimitStore({
      onFull: (keys) =>
        logger.warn("rate_limit_memory_store_full", {
          keys,
          maxKeys: MEMORY_STORE_MAX_KEYS,
        }),
    });
    if (process.env.NODE_ENV === "production") {
      logger.info("rate_limit_store_in_process", {
        store: "memory",
        validFor: "a single instance only",
        maxKeys: MEMORY_STORE_MAX_KEYS,
      });
    }
  }
  return memoryStore;
}

// One Upstash client per process: the REST client is stateless and safe to
// share, so building it on every check only adds allocation and setup cost.
// A failed construction is not cached, so the next call retries.
let upstashStore: UpstashRedisStore | null = null;
function getGlobalUpstashStore(): RateLimitStore {
  if (!upstashStore) {
    upstashStore = new UpstashRedisStore();
  }
  return upstashStore;
}

/**
 * The store this process uses when none is injected: in-process outside
 * production, and in production only with RATE_LIMIT_STORE=memory (env.ts
 * never defaults to it); Upstash otherwise. Null when production has no
 * usable store, so the caller applies the policy's fail-closed rule.
 */
function resolveDefaultStore(): RateLimitStore | null {
  if (
    process.env.NODE_ENV !== "production" ||
    env.RATE_LIMIT_STORE === "memory"
  )
    return getGlobalMemoryStore();
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  try {
    return getGlobalUpstashStore();
  } catch {
    return null;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Rate limiter timeout")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export interface RateLimitTarget {
  bucketName: string;
  dimension: string;
  identifier: string;
}

export type RateLimitDecision =
  | {
      allowed: true;
      remaining: number;
      limit: number;
      resetInSeconds: number;
    }
  | {
      allowed: false;
      reason: "rate_limited";
      retryAfterSeconds: number;
      limit: number;
      remaining: 0;
    }
  | {
      allowed: false;
      reason: "limiter_unavailable";
      retryAfterSeconds: number;
      limit: number;
      remaining: 0;
    };

/**
 * Derives an HMAC-SHA256 pseudonymized key for a given rate-limit dimension.
 *
 * CRITICAL SECURITY INVARIANT:
 * Plaintext identifiers (IP addresses, subnets, phone numbers, product IDs, tokens)
 * must NEVER be sent to Redis or stored in cache keys.
 */
export function deriveRateLimitKey(
  version: string,
  bucketName: string,
  dimension: string,
  rawIdentifier: string,
  secret: string = env.RATE_LIMIT_KEY_SECRET ||
    "fallback-secret-at-least-32-chars-long",
): string {
  const hash = createHmac("sha256", secret)
    .update(`${dimension}:${rawIdentifier}`)
    .digest("hex")
    .slice(0, 32);

  return `rl:${version}:${bucketName}:${dimension}:${hash}`;
}

export interface RateLimiterOptions {
  store?: RateLimitStore;
  secret?: string;
  timeoutMs?: number;
}

export interface RateLimiter {
  check(
    policy: RateLimitPolicy,
    targets: RateLimitTarget[],
  ): Promise<RateLimitDecision>;
  reset?(policy: RateLimitPolicy, target: RateLimitTarget): Promise<void>;
}

export function createRateLimiter(
  options: RateLimiterOptions = {},
): RateLimiter {
  const secret =
    options.secret ??
    env.RATE_LIMIT_KEY_SECRET ??
    "dev-test-rate-limit-secret-32-characters";

  return {
    async check(
      policy: RateLimitPolicy,
      targets: RateLimitTarget[],
    ): Promise<RateLimitDecision> {
      const timeoutMs = options.timeoutMs ?? policy.timeoutMs ?? 1500;

      // Lazy instantiate production store if not provided
      const store = options.store ?? resolveDefaultStore();
      if (!store) {
        if (policy.failClosed) {
          return {
            allowed: false,
            reason: "limiter_unavailable",
            retryAfterSeconds: 60,
            limit: 0,
            remaining: 0,
          };
        }
        return {
          allowed: true,
          remaining: 1,
          limit: 1,
          resetInSeconds: 60,
        };
      }

      try {
        const checkWithTimeout = async () => {
          let minRemaining = Infinity;
          let maxRetryAfter = 0;
          let overallLimit = 0;
          let isExceeded = false;
          let maxTtl = 0;

          const lookups = targets.flatMap((target) => {
            const bucketConfig = policy.buckets.find(
              (b) => b.name === target.bucketName,
            );
            return bucketConfig ? [{ target, bucketConfig }] : [];
          });

          // Buckets are independent keys, so increment them concurrently.
          // Promise.all rejects on the first failure, which keeps the
          // fail-closed/fail-open handling below unchanged.
          const results = await Promise.all(
            lookups.map(({ target, bucketConfig }) =>
              store.incrementAndGetTtl(
                deriveRateLimitKey(
                  "v1",
                  `${policy.name}:${target.bucketName}`,
                  target.dimension,
                  target.identifier,
                  secret,
                ),
                bucketConfig.windowSeconds,
              ),
            ),
          );

          lookups.forEach(({ bucketConfig }, index) => {
            const result = results[index];
            overallLimit = bucketConfig.limit;

            if (
              typeof result?.count !== "number" ||
              typeof result?.ttlSeconds !== "number" ||
              isNaN(result.count) ||
              isNaN(result.ttlSeconds)
            ) {
              throw new Error("Malformed limiter result");
            }

            const remaining = Math.max(0, bucketConfig.limit - result.count);
            if (remaining < minRemaining) {
              minRemaining = remaining;
            }
            if (result.ttlSeconds > maxTtl) {
              maxTtl = result.ttlSeconds;
            }

            if (result.count > bucketConfig.limit) {
              isExceeded = true;
              if (result.ttlSeconds > maxRetryAfter) {
                maxRetryAfter = result.ttlSeconds;
              }
            }
          });

          if (isExceeded) {
            return {
              allowed: false as const,
              reason: "rate_limited" as const,
              retryAfterSeconds: Math.max(1, maxRetryAfter),
              limit: overallLimit,
              remaining: 0 as const,
            };
          }

          return {
            allowed: true as const,
            remaining: minRemaining === Infinity ? 0 : minRemaining,
            limit: overallLimit,
            resetInSeconds: maxTtl,
          };
        };

        return await withTimeout(checkWithTimeout(), timeoutMs);
      } catch {
        if (policy.failClosed) {
          return {
            allowed: false,
            reason: "limiter_unavailable",
            retryAfterSeconds: 60,
            limit: 0,
            remaining: 0,
          };
        }
        return {
          allowed: true,
          remaining: 1,
          limit: 1,
          resetInSeconds: 60,
        };
      }
    },

    async reset(
      policy: RateLimitPolicy,
      target: RateLimitTarget,
    ): Promise<void> {
      const store = options.store ?? resolveDefaultStore();
      if (!store) return;
      if (typeof store.delete === "function") {
        const key = deriveRateLimitKey(
          "v1",
          `${policy.name}:${target.bucketName}`,
          target.dimension,
          target.identifier,
          secret,
        );
        await store.delete(key);
      }
    },
  };
}
