import type { StorefrontPromotion } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

import { paginate, type ListQuery, type PageResult } from "./pagination";

export const PROMOTIONS_PAGE_SIZE = 20;

export async function listAdminPromotions(
  query: ListQuery = {},
): Promise<PageResult<StorefrontPromotion>> {
  return paginate(
    { page: query.page ?? 1, pageSize: query.pageSize ?? PROMOTIONS_PAGE_SIZE },
    () => prisma.storefrontPromotion.count(),
    ({ skip, take }) =>
      prisma.storefrontPromotion.findMany({
        skip,
        take,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      }),
  );
}
