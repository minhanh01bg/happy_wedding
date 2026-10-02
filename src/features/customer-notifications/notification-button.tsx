"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";

import { NotificationList } from "@/components/kit/notification-list";
import type {
  CustomerNotificationDTO,
  CustomerNotificationsResponse,
} from "@/types/customer-notification";

export interface CustomerNotificationButtonProps {
  /** Chỉ gọi API thông báo khi đã biết là khách hàng đăng nhập. */
  enabled: boolean;
  className?: string;
  placement?: "header" | "page";
}

export function CustomerNotificationButton({
  enabled,
  className = "",
  placement = "header",
}: CustomerNotificationButtonProps) {
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

  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Focus close button when panel opens
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    }
  }, [open]);

  // Click outside and Escape key handling
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

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

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            void fetchNotifications();
          }
        }}
        className="border-border hover:bg-accent/12 focus-visible:ring-ring relative inline-flex min-h-11 items-center justify-center rounded-xl border px-3 font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Bell aria-hidden="true" className="size-5" />
        <span className="sr-only">Thông báo</span>
        {unreadCount > 0 && (
          <span
            data-testid="customer-notification-badge"
            className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold shadow-sm"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          id={panelId}
          aria-label="Hộp thư thông báo đơn hàng"
          className={
            placement === "page"
              ? "bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 absolute top-12 right-0 z-[100] max-h-[80dvh] w-80 origin-top-right transform-gpu overflow-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl duration-200 ease-out will-change-[transform,opacity] sm:w-96"
              : "bg-popover text-popover-foreground border-border animate-in fade-in-0 zoom-in-95 absolute top-full right-0 z-[100] mt-2 max-h-[80dvh] w-80 origin-top-right transform-gpu overflow-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl duration-200 ease-out will-change-[transform,opacity] sm:w-96"
          }
        >
          <header className="mb-3 flex items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-bold">Thông báo</h2>
              {unreadCount > 0 && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  className="hover:bg-muted text-primary flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold"
                >
                  <CheckCheck className="size-3.5" />
                  <span>Đọc tất cả</span>
                </button>
              )}
              <button
                ref={closeRef}
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className="hover:bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <NotificationList
            items={items}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            hasMore={Boolean(nextCursor)}
            onRetry={() => void fetchNotifications(failedCursor.current)}
            onLoadMore={() => {
              if (nextCursor) void fetchNotifications(nextCursor);
            }}
            onMarkRead={(id) => void markOne(id)}
            onNavigate={() => setOpen(false)}
            emptyDescription="Các cập nhật về đơn hàng của bạn sẽ hiển thị tại đây."
          />
        </section>
      )}
    </div>
  );
}
