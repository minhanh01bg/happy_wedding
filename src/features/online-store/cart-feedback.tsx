"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";

import { useOnlineCart } from "./cart-context";
import type { CartMutationResult } from "./types";

const AUTO_DISMISS_MS = 4000;
const EXIT_MS = 180;

export function CartFeedback({ onViewCart }: { onViewCart?: () => void }) {
  const { feedback, dismissFeedback, openDrawer } = useOnlineCart();
  const handleViewCart = onViewCart || openDrawer;
  const [exitingFeedback, setExitingFeedback] =
    useState<CartMutationResult | null>(null);
  const feedbackRef = useRef(feedback);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    feedbackRef.current = feedback;
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = null;
  }, [feedback]);

  const beginExit = useCallback(
    (current: CartMutationResult) => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      setExitingFeedback(current);
      exitTimerRef.current = setTimeout(() => {
        exitTimerRef.current = null;
        if (feedbackRef.current !== current) return;
        dismissFeedback();
      }, EXIT_MS);
    },
    [dismissFeedback],
  );

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => beginExit(feedback), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [feedback, beginExit]);

  useEffect(
    () => () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    },
    [],
  );

  if (!feedback) return null;

  const isSuccess =
    feedback.status === "added" || feedback.status === "incremented";
  const isCapped = feedback.status === "capped";

  const Icon = isSuccess
    ? CheckCircle2
    : isCapped
      ? AlertTriangle
      : AlertCircle;

  const iconColor = isSuccess
    ? "text-success"
    : isCapped
      ? "text-warning"
      : "text-destructive";

  const messageText = (() => {
    if (feedback.message) return feedback.message;
    if (feedback.status === "added") {
      return `Đã thêm ${feedback.productName} vào giỏ hàng (SL: ${feedback.quantity})`;
    }
    if (feedback.status === "incremented") {
      return `Đã cập nhật số lượng ${feedback.productName} (SL: ${feedback.quantity})`;
    }
    if (feedback.status === "capped") {
      return `${feedback.productName}: Đã đạt số lượng tối đa`;
    }
    return `${feedback.productName} hiện không khả dụng`;
  })();

  return (
    <aside
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-0 bottom-4 left-0 z-50 flex justify-center px-4 sm:justify-end sm:px-6"
    >
      <div
        role="status"
        className={`border-border bg-card text-card-foreground pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md ${exitingFeedback === feedback ? "storefront-feedback-exit" : "storefront-feedback-enter"}`}
      >
        <Icon aria-hidden="true" className={`size-5 shrink-0 ${iconColor}`} />
        <div className="min-w-0 flex-1 text-sm font-medium">
          <p className="line-clamp-2">{messageText}</p>
          {isSuccess && (
            <div className="mt-1">
              <button
                type="button"
                onClick={handleViewCart}
                className="text-primary hover:text-primary/80 font-bold underline outline-none focus-visible:ring-2"
              >
                Xem giỏ
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => beginExit(feedback)}
          aria-label="Đóng thông báo"
          className="text-muted-foreground hover:text-foreground inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </aside>
  );
}
