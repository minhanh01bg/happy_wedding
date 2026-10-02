/** Tham so chung cho moi loader danh sach trong /admin. */
export interface ListQuery<TFilters = Record<string, never>> {
  page?: number;
  pageSize?: number;
  q?: string;
  filters?: TFilters;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface PageWindow {
  skip: number;
  take: number;
}

/** `?page=` tu URL: rong, sai dinh dang hay < 1 deu ve trang 1. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function totalPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Count first so an oversized URL can never reach Prisma as an invalid offset. */
export async function paginate<T>(
  request: { page: number; pageSize: number },
  count: () => PromiseLike<number>,
  find: (window: PageWindow) => PromiseLike<T[]>,
): Promise<PageResult<T>> {
  const pageSize = Number.isFinite(request.pageSize)
    ? Math.min(2_147_483_647, Math.max(1, Math.floor(request.pageSize)))
    : 1;
  const requestedPage = Number.isFinite(request.page)
    ? Math.max(1, Math.floor(request.page))
    : 1;
  const total = await count();
  const lastPage = totalPageCount(total, pageSize);
  const page = Math.min(requestedPage, lastPage);
  if (total === 0) return { items: [], total, page: 1, pageSize };
  const items = await find({ skip: (page - 1) * pageSize, take: pageSize });
  return { items, total, page, pageSize };
}
