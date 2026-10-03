"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "./client";
export function GuestForm({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="inline-actions"
      onSubmit={async (e) => {
        e.preventDefault();
        const element = e.currentTarget;
        const form = new FormData(element);
        setBusy(true);
        setError("");
        try {
          await post("/api/wedding/guests", {
            invitationId,
            name: String(form.get("name")),
            group: String(form.get("group")),
          });
          element.reset();
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Chưa thêm được khách");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Tên khách mời
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          placeholder="Anh chị, gia đình, bạn bè…"
        />
      </label>
      <label>
        Nhóm khách
        <input
          name="group"
          defaultValue="Bạn bè"
          minLength={1}
          maxLength={80}
          required
        />
      </label>
      <button disabled={busy} type="submit">
        {busy ? "Đang thêm…" : "Tạo lời mời riêng"}
      </button>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
