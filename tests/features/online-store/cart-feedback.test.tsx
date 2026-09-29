import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartFeedback } from "@/features/online-store/cart-feedback";
import type { CartMutationResult } from "@/features/online-store/types";

const cart = vi.hoisted(() => ({
  feedback: null as CartMutationResult | null,
  dismissFeedback: vi.fn(),
  openDrawer: vi.fn(),
}));

vi.mock("@/features/online-store/cart-context", () => ({
  useOnlineCart: () => cart,
}));

const added = (productName: string): CartMutationResult => ({
  status: "added",
  productId: productName,
  productName,
  quantity: 1,
});

describe("CartFeedback motion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    cart.feedback = added("Sản phẩm A");
    cart.dismissFeedback.mockReset();
    cart.openDrawer.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("giữ thông báo mới khi timer đóng thông báo cũ đã được hẹn", () => {
    const { rerender } = render(<CartFeedback />);
    fireEvent.click(screen.getByRole("button", { name: "Đóng thông báo" }));
    expect(screen.getByRole("status")).toHaveClass("storefront-feedback-exit");

    cart.feedback = added("Sản phẩm B");
    rerender(<CartFeedback />);
    act(() => vi.advanceTimersByTime(180));

    expect(screen.getByRole("status")).toHaveTextContent("Sản phẩm B");
    expect(cart.dismissFeedback).not.toHaveBeenCalled();
  });

  it("đóng sau exit animation và tự đóng sau 4 giây", () => {
    const { rerender } = render(<CartFeedback />);
    expect(screen.getByRole("status")).toHaveClass("storefront-feedback-enter");
    fireEvent.click(screen.getByRole("button", { name: "Đóng thông báo" }));
    expect(cart.dismissFeedback).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(180));
    expect(cart.dismissFeedback).toHaveBeenCalledTimes(1);

    cart.feedback = null;
    rerender(<CartFeedback />);
    cart.feedback = added("Sản phẩm C");
    rerender(<CartFeedback />);
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole("status")).toHaveClass("storefront-feedback-exit");
    act(() => vi.advanceTimersByTime(180));
    expect(cart.dismissFeedback).toHaveBeenCalledTimes(2);
  });
});
