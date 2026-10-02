import { expect, it } from "vitest";

import { paginate, parsePageParam } from "@/server/admin/pagination";

it("clamps oversized URL pages before handing an offset to SQLite", async () => {
  const result = await paginate(
    {
      page: parsePageParam("999999999999999999999999999999999999"),
      pageSize: 20,
    },
    async () => 23,
    async ({ skip, take }) => {
      expect(skip).toBe(20);
      return Array.from(
        { length: Math.min(take, 23 - skip) },
        (_, i) => skip + i,
      );
    },
  );
  expect(result.page).toBe(2);
  expect(result.items).toEqual([20, 21, 22]);
});
