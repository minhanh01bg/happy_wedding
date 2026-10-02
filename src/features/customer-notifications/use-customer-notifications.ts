"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CustomerNotificationDTO,
  CustomerNotificationsResponse,
} from "@/types/customer-notification";

/** Notification data lifecycle, cursor history and optimistic read mutations. */
export function useCustomerNotifications(enabled: boolean) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CustomerNotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const hasOlderPages = useRef(false);
  const mutationRevision = useRef(0);
  const pendingMutations = useRef(0);
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);

  const failedCursor = useRef<string | undefined>(undefined);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const inFlight = useRef<Promise<void> | null>(null);

  const fetchNotificationsRef =
    useRef<(cursor?: string) => Promise<void>>(null);
  const fetchNotifications = useCallback(
    async (cursor?: string): Promise<void> => {
      if (!enabled) return;
      if (inFlight.current) return inFlight.current;
      const requestGeneration = generation.current;
      const requestRevision = mutationRevision.current;
      let revalidateStale = false;
      if (cursor) setLoadingMore(true);
      const task = (async () => {
        try {
          setError(null);
          const res = await fetch(
            `/api/customer/notifications?limit=6${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
            {
              headers: { Accept: "application/json" },
            },
          );
          if (requestGeneration !== generation.current) return;
          if (!res.ok) {
            if (res.status === 401) {
              // Unauthenticated, hide or clear
              setItems([]);
              setUnreadCount(0);
              setNextCursor(null);
              return;
            }
            throw new Error("Không thể tải thông báo");
          }
          const data: CustomerNotificationsResponse = await res.json();
          if (requestGeneration !== generation.current) return;
          if (requestRevision !== mutationRevision.current) {
            revalidateStale = true;
            return;
          }
          if (
            !cursor &&
            itemsRef.current.length > 0 &&
            !data.items.some((item) =>
              itemsRef.current.some((existing) => existing.id === item.id),
            )
          )
            hasOlderPages.current = false;
          setItems((current) => {
            const pageItems =
              pendingMutations.current > 0
                ? data.items.map((item) => {
                    const existing = current.find((row) => row.id === item.id);
                    return existing
                      ? { ...item, readAt: existing.readAt }
                      : item;
                  })
                : data.items;
            const merged = cursor
              ? [
                  ...current,
                  ...pageItems.filter(
                    (item) =>
                      !current.some((existing) => existing.id === item.id),
                  ),
                ]
              : [
                  ...pageItems,
                  ...current.filter(
                    (item) =>
                      !data.items.some((newItem) => newItem.id === item.id),
                  ),
                ];
            return merged.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime() || b.id.localeCompare(a.id),
            );
          });
          if (cursor) hasOlderPages.current = true;
          if (cursor || !hasOlderPages.current)
            setNextCursor(data.nextCursor ?? null);
          if (pendingMutations.current === 0) setUnreadCount(data.unreadCount);
        } catch (err: unknown) {
          if (requestGeneration !== generation.current) return;
          failedCursor.current = cursor;
          setError(
            err instanceof Error
              ? err.message
              : "Đã có lỗi xảy ra khi tải thông báo",
          );
        } finally {
          if (requestGeneration === generation.current) {
            setLoading(false);
            setLoadingMore(false);
            inFlight.current = null;
            if (revalidateStale)
              queueMicrotask(() => {
                if (requestGeneration === generation.current)
                  void fetchNotificationsRef.current?.(cursor);
              });
          }
        }
      })();
      inFlight.current = task;
      return task;
    },
    [enabled],
  );

  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);
  useEffect(() => {
    generation.current += 1;
    inFlight.current = null;
    hasOlderPages.current = false;
    const effectGeneration = generation.current;
    queueMicrotask(() => {
      if (effectGeneration !== generation.current) return;
      setItems([]);
      setUnreadCount(0);
      setNextCursor(null);
      setError(null);
      setLoading(enabled);
      setLoadingMore(false);
      if (!enabled) setOpen(false);
      void fetchNotifications();
    });
    return () => {
      generation.current += 1;
    };
  }, [enabled, fetchNotifications]);

  const markOne = async (id: string) => {
    const previous = items.find((item) => item.id === id);
    if (!previous || previous.readAt) return;
    const requestGeneration = generation.current;
    mutationRevision.current += 1;
    pendingMutations.current += 1;
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const response = await fetch("/api/customer/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (!response.ok) throw new Error("Không thể cập nhật thông báo");
    } catch {
      if (requestGeneration !== generation.current) return;
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, readAt: previous.readAt } : item,
        ),
      );
      // Reconcile on failure
      void fetchNotifications();
    } finally {
      mutationRevision.current += 1;
      pendingMutations.current -= 1;
    }
  };

  const markAll = async () => {
    const previous = items;
    const cutoff = new Date();
    const requestGeneration = generation.current;
    mutationRevision.current += 1;
    pendingMutations.current += 1;
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => ({ ...item, readAt: new Date().toISOString() })),
    );
    setUnreadCount(0);

    try {
      const response = await fetch("/api/customer/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) throw new Error("Không thể cập nhật thông báo");
      if (requestGeneration !== generation.current) return;
      setItems((current) =>
        current.map((item) =>
          !item.readAt && new Date(item.createdAt) <= cutoff
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch {
      if (requestGeneration !== generation.current) return;
      const readAtById = new Map(
        previous.map((item) => [item.id, item.readAt]),
      );
      setItems((current) =>
        current.map((item) =>
          readAtById.has(item.id)
            ? { ...item, readAt: readAtById.get(item.id) }
            : item,
        ),
      );
      // Reconcile on failure
      void fetchNotifications();
    } finally {
      mutationRevision.current += 1;
      pendingMutations.current -= 1;
    }
  };

  return {
    open,
    setOpen,
    items,
    unreadCount,
    loading,
    loadingMore,
    nextCursor,
    error,
    refresh: fetchNotifications,
    retry: () => fetchNotifications(failedCursor.current),
    loadMore: () =>
      nextCursor ? fetchNotifications(nextCursor) : Promise.resolve(),
    markOne,
    markAll,
  };
}
