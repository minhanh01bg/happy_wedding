import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  WishModeration,
  wishReview,
} from "@/app/dashboard/[id]/guests/wish-moderation";
import { STATUS_LABELS } from "@/components/wedding/status";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("@/components/wedding/client", () => ({ post: vi.fn() }));

function shown(wishStatus: string) {
  const { container, unmount } = render(
    <WishModeration id="response-1" wishStatus={wishStatus} />,
  );
  const badge = container.querySelector(".badge");
  const result = {
    badge: badge?.textContent,
    badgeClass: badge?.className,
    note: container.querySelector(".fine")?.textContent ?? null,
    buttons: screen.getAllByRole("button").map((b) => b.textContent),
  };
  unmount();
  return result;
}

describe("wish moderation on the guest dashboard", () => {
  it("pending is the only unreviewed state", () => {
    expect(shown("pending")).toEqual({
      badge: "Chưa duyệt",
      badgeClass: "badge pending",
      note: null,
      buttons: ["Duyệt lời chúc", "Ẩn"],
    });
  });

  it("approved is reviewed and shown on the invitation", () => {
    expect(shown("approved")).toEqual({
      badge: "Đã duyệt",
      badgeClass: "badge approved",
      note: "Đang hiện trên thiệp",
      buttons: ["Ẩn khỏi thiệp"],
    });
  });

  it("hidden is still reviewed, only taken off the invitation", () => {
    expect(shown("hidden")).toEqual({
      badge: "Đã duyệt",
      badgeClass: "badge approved",
      note: "Đã ẩn khỏi thiệp",
      buttons: ["Hiện lại trên thiệp"],
    });
  });

  it("each button sends the status it names", () => {
    expect(
      Object.fromEntries(
        ["pending", "approved", "hidden"].map((s) => [
          s,
          wishReview(s).actions.map((a) => a.status),
        ]),
      ),
    ).toEqual({
      pending: ["approved", "hidden"],
      approved: ["hidden"],
      hidden: ["approved"],
    });
  });

  it("an unknown status counts as unreviewed", () => {
    expect(wishReview("something-else")).toBe(wishReview("pending"));
  });

  it("leaves the shared status labels for orders alone", () => {
    expect(STATUS_LABELS.pending).toBe("Chờ xác nhận");
    expect(STATUS_LABELS.hidden).toBe("Đã ẩn");
  });
});
