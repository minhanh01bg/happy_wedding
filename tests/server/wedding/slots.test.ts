// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSlots, SlotsBusyError } from "@/server/wedding/slots";

describe("createSlots", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cho tối đa 2 lượt chạy, lượt sau chờ theo thứ tự đến", async () => {
    const slots = createSlots({ slots: 2, queue: 10, waitMs: 60_000 });
    const first = await slots.acquire();
    await slots.acquire();
    const order: string[] = [];
    const third = slots.acquire().then((release) => {
      order.push("third");
      return release;
    });
    const fourth = slots.acquire().then((release) => {
      order.push("fourth");
      return release;
    });
    expect([slots.active, slots.waiting]).toEqual([2, 2]);

    first();
    first();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["third"]);
    expect([slots.active, slots.waiting]).toEqual([2, 1]);

    (await third)();
    (await fourth)();
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["third", "fourth"]);
    expect([slots.active, slots.waiting]).toEqual([1, 0]);
  });

  it("từ chối ngay khi hàng chờ đã đầy", async () => {
    const slots = createSlots({ slots: 1, queue: 2, waitMs: 60_000 });
    await slots.acquire();
    const waiting = [slots.acquire(), slots.acquire()];
    await expect(slots.acquire()).rejects.toBeInstanceOf(SlotsBusyError);
    expect(slots.waiting).toBe(2);
    waiting.forEach((promise) => promise.catch(() => {}));
  });

  it("hết thời gian chờ thì từ chối và rời hàng", async () => {
    const slots = createSlots({ slots: 1, queue: 10, waitMs: 60_000 });
    const release = await slots.acquire();
    const late = slots.acquire();
    const settled = late.then(
      () => "granted",
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(59_999);
    expect(slots.waiting).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await settled).toBeInstanceOf(SlotsBusyError);
    expect(slots.waiting).toBe(0);

    release();
    expect(slots.active).toBe(0);
    await slots.acquire();
    expect(slots.active).toBe(1);
  });
});
