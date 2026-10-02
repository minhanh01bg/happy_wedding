"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  notificationListResponseSchema,
  type AdminNotificationDto,
} from "@/types/admin-notification";

interface NotificationContextValue {
  items: AdminNotificationDto[];
  unreadCount: number;
  cutoff: string | null;
  loading: boolean;
  loadingMore: boolean;
  nextCursor: string | null;
  loadMore: () => Promise<void>;
  error: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  markOne: (id: string) => Promise<void>;
  markAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function useAdminNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("NotificationProvider chưa được khởi tạo");
  return value;
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<AdminNotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cutoff, setCutoff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const hasOlderPages = useRef(false);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const mutationRevision = useRef(0);
  const pendingMutations = useRef(0);
  const failedCursor = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);

  const fetchPageRef = useRef<(cursor?: string) => Promise<void>>(null);
  const fetchPage = useCallback((cursor?: string): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const requestRevision = mutationRevision.current;
    let revalidateStale = false;
    const task = (async () => {
      try {
        const response = await fetch(
          `/api/admin/notifications?limit=6${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Không thể tải thông báo");
        const parsed = notificationListResponseSchema.parse(
          await response.json(),
        ).data;
        if (!mounted.current) return;
        if (requestRevision !== mutationRevision.current) {
          revalidateStale = true;
          return;
        }
        if (
          !cursor &&
          itemsRef.current.length > 0 &&
          !parsed.items.some((item) =>
            itemsRef.current.some((existing) => existing.id === item.id),
          )
        )
          hasOlderPages.current = false;
        setItems((current) => {
          const pageItems =
            pendingMutations.current > 0
              ? parsed.items.map((item) => {
                  const existing = current.find((row) => row.id === item.id);
                  return existing ? { ...item, readAt: existing.readAt } : item;
                })
              : parsed.items;
          const ids = new Set(pageItems.map((item) => item.id));
          const merged = cursor
            ? [
                ...current,
                ...pageItems.filter(
                  (item) =>
                    !current.some((existing) => existing.id === item.id),
                ),
              ]
            : [...pageItems, ...current.filter((item) => !ids.has(item.id))];
          return merged.sort(
            (a, b) =>
              b.createdAt.localeCompare(a.createdAt) ||
              b.id.localeCompare(a.id),
          );
        });
        if (cursor) hasOlderPages.current = true;
        if (cursor || !hasOlderPages.current) setNextCursor(parsed.nextCursor);
        if (pendingMutations.current === 0) setUnreadCount(parsed.unreadCount);
        if (!cursor) setCutoff(parsed.cutoff);
        setError(null);
      } catch {
        if (mounted.current) {
          failedCursor.current = cursor;
          setError("Không thể tải thông báo. Hãy thử lại.");
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
          setLoadingMore(false);
        }
        inFlight.current = null;
        if (revalidateStale && mounted.current)
          queueMicrotask(() => void fetchPageRef.current?.(cursor));
      }
    })();
    inFlight.current = task;
    return task;
  }, []);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);
  const refresh = useCallback(() => fetchPage(), [fetchPage]);
  const retry = useCallback(() => {
    if (failedCursor.current && !inFlight.current) setLoadingMore(true);
    return fetchPage(failedCursor.current);
  }, [fetchPage]);
  const loadMore = useCallback(() => {
    if (!nextCursor || inFlight.current)
      return inFlight.current ?? Promise.resolve();
    setLoadingMore(true);
    return fetchPage(nextCursor);
  }, [fetchPage, nextCursor]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    void refresh();
    let timer: ReturnType<typeof setInterval> | undefined;
    const syncTimer = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === "visible") {
        timer = setInterval(() => void refresh(), 15_000);
      }
    };
    const refetch = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    syncTimer();
    document.addEventListener("visibilitychange", syncTimer);
    window.addEventListener("focus", refetch);
    window.addEventListener("online", refetch);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", syncTimer);
      window.removeEventListener("focus", refetch);
      window.removeEventListener("online", refetch);
    };
  }, [refresh]);

  const mutate = useCallback(
    async (body: { id: string } | { allBefore: string }) => {
      const response = await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Không thể cập nhật thông báo");
      const payload = (await response.json()) as {
        data: { unreadCount: number };
      };
      setUnreadCount(payload.data.unreadCount);
    },
    [],
  );

  const markOne = useCallback(
    async (id: string) => {
      const previous = items.find((item) => item.id === id);
      if (!previous || previous.readAt) return;
      mutationRevision.current += 1;
      pendingMutations.current += 1;
      setItems((current) =>
        current.map((item) =>
          item.id === id && !item.readAt
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await mutate({ id });
      } catch {
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, readAt: previous.readAt } : item,
          ),
        );
        void refresh();
      } finally {
        mutationRevision.current += 1;
        pendingMutations.current -= 1;
      }
    },
    [items, mutate, refresh],
  );

  const markAll = useCallback(async () => {
    if (!cutoff) return;
    const previous = items;
    mutationRevision.current += 1;
    pendingMutations.current += 1;
    setItems((current) =>
      current.map((item) =>
        new Date(item.createdAt) <= new Date(cutoff) && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount(0);
    try {
      await mutate({ allBefore: cutoff });
      setItems((current) =>
        current.map((item) =>
          !item.readAt && new Date(item.createdAt) <= new Date(cutoff)
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      const readAtById = new Map(
        previous.map((item) => [item.id, item.readAt]),
      );
      setItems((current) =>
        current.map((item) =>
          readAtById.has(item.id)
            ? { ...item, readAt: readAtById.get(item.id)! }
            : item,
        ),
      );
      void refresh();
    } finally {
      mutationRevision.current += 1;
      pendingMutations.current -= 1;
    }
  }, [cutoff, items, mutate, refresh]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      cutoff,
      loading,
      loadingMore,
      nextCursor,
      loadMore,
      error,
      refresh,
      retry,
      markOne,
      markAll,
    }),
    [
      items,
      unreadCount,
      cutoff,
      loading,
      loadingMore,
      nextCursor,
      loadMore,
      error,
      refresh,
      retry,
      markOne,
      markAll,
    ],
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
