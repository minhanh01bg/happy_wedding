/** Thrown when every slot is taken and the queue is full, or a wait times out. */
export class SlotsBusyError extends Error {
  constructor() {
    super("All slots are busy");
    this.name = "SlotsBusyError";
  }
}

/** Thrown when the caller's signal aborts before a slot is granted. */
export class SlotsAbortedError extends Error {
  constructor() {
    super("Waiting for a slot was aborted");
    this.name = "SlotsAbortedError";
  }
}

type Waiter = { grant: () => void };

/**
 * In-process semaphore with a bounded FIFO queue. `acquire` resolves with a
 * release function once a slot is free. It rejects with SlotsBusyError at once
 * when `queue` callers are already waiting, or after `waitMs` in the queue.
 * When `signal` aborts first, the caller leaves the queue and `acquire`
 * rejects with SlotsAbortedError without taking a slot. A released slot passes
 * straight to the oldest waiter.
 */
export function createSlots(options: {
  slots: number;
  queue: number;
  waitMs: number;
}) {
  let active = 0;
  const waiters: Waiter[] = [];

  function releaser() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = waiters.shift();
      if (next) next.grant();
      else active--;
    };
  }

  function acquire(signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) return Promise.reject(new SlotsAbortedError());
    if (active < options.slots) {
      active++;
      return Promise.resolve(releaser());
    }
    if (waiters.length >= options.queue)
      return Promise.reject(new SlotsBusyError());
    return new Promise((resolve, reject) => {
      function leave(error: Error) {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(error);
      }
      function onAbort() {
        leave(new SlotsAbortedError());
      }
      const waiter: Waiter = {
        grant: () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
          resolve(releaser());
        },
      };
      const timer = setTimeout(
        () => leave(new SlotsBusyError()),
        options.waitMs,
      );
      signal?.addEventListener("abort", onAbort, { once: true });
      waiters.push(waiter);
    });
  }

  return {
    acquire,
    get active() {
      return active;
    },
    get waiting() {
      return waiters.length;
    },
  };
}
