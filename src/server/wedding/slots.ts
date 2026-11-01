/** Thrown when every slot is taken and the queue is full, or a wait times out. */
export class SlotsBusyError extends Error {
  constructor() {
    super("All slots are busy");
    this.name = "SlotsBusyError";
  }
}

type Waiter = { grant: () => void };

/**
 * In-process semaphore with a bounded FIFO queue. `acquire` resolves with a
 * release function once a slot is free. It rejects with SlotsBusyError at once
 * when `queue` callers are already waiting, or after `waitMs` in the queue.
 * A released slot passes straight to the oldest waiter.
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

  function acquire(): Promise<() => void> {
    if (active < options.slots) {
      active++;
      return Promise.resolve(releaser());
    }
    if (waiters.length >= options.queue)
      return Promise.reject(new SlotsBusyError());
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        grant: () => {
          clearTimeout(timer);
          resolve(releaser());
        },
      };
      const timer = setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index >= 0) waiters.splice(index, 1);
        reject(new SlotsBusyError());
      }, options.waitMs);
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
