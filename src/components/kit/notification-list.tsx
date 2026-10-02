"use client";

import Link from "next/link";
import { Bell, Check, Package, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/kit/empty-state";
import { Skeleton } from "@/components/kit/skeleton-loader";

export interface NotificationListItem {
  id: string;
  title: string;
  body: string;
  href: string;
  kind: string;
  createdAt: string | Date;
  readAt?: string | Date | null;
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

export function NotificationListSkeleton() {
  return (
    <div
      role="status"
      data-testid="notification-list-skeleton"
      className="space-y-2"
    >
      <span className="sr-only">Đang tải thông báo…</span>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex gap-3 rounded-xl p-3"
        >
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationList({
  items,
  loading,
  error,
  loadingMore = false,
  hasMore = false,
  onRetry,
  onLoadMore,
  onMarkRead,
  onNavigate,
  emptyDescription,
}: {
  items: readonly NotificationListItem[];
  loading: boolean;
  error: string | null;
  loadingMore?: boolean;
  hasMore?: boolean;
  onRetry: () => void;
  onLoadMore?: () => void;
  onMarkRead: (id: string) => void;
  onNavigate?: () => void;
  emptyDescription: string;
}) {
  return (
    <div aria-busy={loading || loadingMore}>
      {loading && items.length === 0 ? (
        <NotificationListSkeleton />
      ) : items.length === 0 && !error ? (
        <EmptyState
          size="compact"
          icon={Bell}
          title="Chưa có thông báo"
          description={emptyDescription}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const Icon = item.kind.includes("stock") ? TriangleAlert : Package;
            return (
              <li
                key={item.id}
                className="notification-row-enter relative"
                style={{ animationDelay: `${Math.min(index % 6, 5) * 30}ms` }}
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    onNavigate?.();
                    if (!item.readAt) onMarkRead(item.id);
                  }}
                  className={`focus-visible:ring-ring flex gap-3 rounded-xl p-3 pr-14 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${item.readAt ? "hover:bg-muted/60" : "bg-primary/6 hover:bg-primary/10"}`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.readAt ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary"}`}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2 leading-snug font-semibold">
                      {item.title}
                      {!item.readAt ? (
                        <span
                          aria-hidden="true"
                          className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                        />
                      ) : null}
                    </span>
                    {!item.readAt ? (
                      <span className="sr-only">Chưa đọc. </span>
                    ) : null}
                    <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                      {item.body}
                    </span>
                    <time
                      dateTime={new Date(item.createdAt).toISOString()}
                      className="text-muted-foreground mt-2 block text-xs"
                    >
                      {dateFormatter.format(new Date(item.createdAt))}
                    </time>
                  </span>
                </Link>
                {!item.readAt ? (
                  <button
                    type="button"
                    aria-label={`Đánh dấu đã đọc: ${item.title}`}
                    onClick={() => onMarkRead(item.id)}
                    className="hover:bg-muted text-muted-foreground focus-visible:ring-ring absolute top-2 right-1 flex size-11 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Check aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <div
          role="alert"
          className="text-destructive mt-3 rounded-xl border p-3 text-sm"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 min-h-11 font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      {hasMore ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={onLoadMore}
          className="text-primary hover:bg-muted mt-3 min-h-11 w-full rounded-xl border text-sm font-semibold disabled:opacity-60"
        >
          {loadingMore ? "Đang tải thêm…" : "Tải thêm thông báo"}
        </button>
      ) : null}
      {loadingMore ? (
        <span role="status" className="sr-only">
          Đang tải thêm thông báo…
        </span>
      ) : null}
    </div>
  );
}
