import { MutationButton } from "@/components/wedding/actions";

type WishStatus = "pending" | "approved" | "hidden";

/**
 * Duyệt lời chúc trên trang khách mời. Chỉ `pending` là chưa duyệt.
 * `hidden` vẫn là đã duyệt, chỉ không hiện trên thiệp; `approved` là đã duyệt
 * và hiện trên thiệp. Nhãn riêng cho lời chúc, không dùng STATUS_LABELS chung
 * vì `pending`/`hidden` ở đó còn dùng cho đơn hàng và màn hình khác.
 */
export const WISH_REVIEW: Record<
  WishStatus,
  {
    badge: string;
    reviewed: boolean;
    visibility?: string;
    actions: { status: "approved" | "hidden"; label: string }[];
  }
> = {
  pending: {
    badge: "Chưa duyệt",
    reviewed: false,
    actions: [
      { status: "approved", label: "Duyệt lời chúc" },
      { status: "hidden", label: "Ẩn" },
    ],
  },
  approved: {
    badge: "Đã duyệt",
    reviewed: true,
    visibility: "Đang hiện trên thiệp",
    actions: [{ status: "hidden", label: "Ẩn khỏi thiệp" }],
  },
  hidden: {
    badge: "Đã duyệt",
    reviewed: true,
    visibility: "Đã ẩn khỏi thiệp",
    actions: [{ status: "approved", label: "Hiện lại trên thiệp" }],
  },
};

/** Trạng thái lạ trong DB coi như chưa duyệt; trang công khai vẫn chỉ hiện approved. */
export function wishReview(status: string) {
  return WISH_REVIEW[status as WishStatus] ?? WISH_REVIEW.pending;
}

export function WishModeration({
  id,
  wishStatus,
}: {
  id: string;
  wishStatus: string;
}) {
  const review = wishReview(wishStatus);
  return (
    <div
      className="table-actions"
      style={{ marginTop: 10, alignItems: "center" }}
    >
      <span className={`badge ${review.reviewed ? "approved" : "pending"}`}>
        {review.badge}
      </span>
      {review.visibility && <span className="fine">{review.visibility}</span>}
      {review.actions.map((action) => (
        <MutationButton
          key={action.status}
          endpoint="moderate"
          data={{ id, status: action.status }}
        >
          {action.label}
        </MutationButton>
      ))}
    </div>
  );
}
