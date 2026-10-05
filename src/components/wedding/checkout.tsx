"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ServicePlan } from "@prisma/client";
import { money } from "@/lib/wedding";
import { post } from "./client";

export function Checkout({
  invitationId,
  plans,
  initialPlan,
}: {
  invitationId: string;
  plans: ServicePlan[];
  initialPlan?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(
    () => plans.find((p) => p.id === initialPlan)?.id || plans[0]?.id || "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const clientId = useRef("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          if (!clientId.current) clientId.current = crypto.randomUUID();
          const result = await post<{ data: { id: string } }>(
            "/api/wedding/orders",
            { invitationId, planId: selected, clientId: clientId.current },
          );
          router.push(`/dashboard/orders/${result.data.id}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Chưa tạo được đơn");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Chọn gói cho tấm thiệp</h2>
      {plans.map((p) => (
        <label className="checkout-plan" key={p.id}>
          <div>
            <input
              type="radio"
              name="plan"
              value={p.id}
              checked={selected === p.id}
              onChange={() => {
                setSelected(p.id);
                clientId.current = "";
              }}
            />
            <strong>{p.name}</strong>
            <span className="price">{money(p.price)}</span>
          </div>
          <p>
            {p.months} tháng · {p.maxPhotos} ảnh ·{" "}
            {p.premiumTemplates ? "Tất cả mẫu cao cấp" : "Mẫu cơ bản"}
            {p.removeBranding ? " · Ẩn thương hiệu" : ""}
          </p>
        </label>
      ))}
      <div className="notice" style={{ margin: "20px 0" }}>
        Một đơn kích hoạt một thiệp. Giá và quyền lợi được chốt khi tạo đơn.
        Thời hạn bắt đầu khi thanh toán được xác nhận.
      </div>
      <label className="inline-check" style={{ marginBottom: 20 }}>
        <input type="checkbox" required />
        <span>
          Tôi đã đọc thông tin gói và{" "}
          <a
            className="muted-link"
            href="/policies"
            target="_blank"
            rel="noopener noreferrer"
          >
            điều khoản dịch vụ
          </a>
          .
        </span>
      </label>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !selected}
        style={{ marginTop: 15 }}
      >
        {busy ? "Đang tạo đơn…" : "Tạo đơn & xem hướng dẫn thanh toán"}
      </button>
    </form>
  );
}
export function PaymentNote({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setMessage("");
        setError("");
        try {
          await post("/api/wedding/payment-note", {
            id,
            note: String(form.get("note")),
          });
          setMessage(
            "Đã báo cho quản trị viên. Đơn vẫn chờ kiểm tra giao dịch.",
          );
          router.refresh();
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Chưa gửi được thông báo",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Thông tin giao dịch đã chuyển
        <input
          name="note"
          minLength={4}
          maxLength={300}
          required
          placeholder="Mã giao dịch / tên người chuyển / giờ chuyển"
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? "Đang gửi…" : "Thông báo đã chuyển khoản"}
      </button>
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
