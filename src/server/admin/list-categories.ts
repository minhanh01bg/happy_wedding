import type { CategoryWithProductCount } from "@/server/categories/get-categories";
import { prisma } from "@/server/db/prisma";

import { paginate, type ListQuery, type PageResult } from "./pagination";

export const CATEGORIES_PAGE_SIZE = 20;

export async function listAdminCategories(
  query: ListQuery = {},
): Promise<PageResult<CategoryWithProductCount>> {
  return paginate(
    { page: query.page ?? 1, pageSize: query.pageSize ?? CATEGORIES_PAGE_SIZE },
    () => prisma.category.count(),
    ({ skip, take }) =>
      prisma.category.findMany({
        skip,
        take,
        // Match the global order used by moveCategoryAction, including ties.
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
        include: { _count: { select: { products: true } } },
      }),
  );
}
