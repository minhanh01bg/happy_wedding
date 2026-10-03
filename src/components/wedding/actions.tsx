"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "./client";

export function Logout({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="secondary small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await post(
              admin ? "/api/auth/logout" : "/api/customer-auth/logout",
              {},
            );
            router.push(admin ? "/login" : "/");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Lỗi đăng xuất");
            setBusy(false);
          }
        }}
      >
        Đăng xuất
      </button>
      {error && (
        <span role="alert" className="fine">
          {error}
        </span>
      )}
    </>
  );
}
export function MutationButton({
  endpoint,
  data,
  children,
  success = "Đã cập nhật",
  className = "secondary small",
}: {
  endpoint: string;
  data: unknown;
  children: React.ReactNode;
  success?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  return (
    <span>
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            await post(`/api/wedding/${endpoint}`, data);
            setFailed(false);
            setMessage(success);
            router.refresh();
          } catch (err) {
            setFailed(true);
            setMessage(
              err instanceof Error ? err.message : "Chưa thực hiện được",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang xử lý…" : children}
      </button>
      {message && (
        <span
          className={`fine ${failed ? "error-text" : ""}`}
          role={failed ? "alert" : "status"}
          style={{ display: "block", marginTop: 5 }}
        >
          {message}
        </span>
      )}
    </span>
  );
}
export function CopyButton({
  value,
  label = "Sao chép link",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <button
      className="secondary small"
      onClick={async () => {
        try {
          const url = value.startsWith("/")
            ? `${window.location.origin}${value}`
            : value;
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setError(false);
        } catch {
          setError(true);
        }
      }}
    >
      {error
        ? "Hãy sao chép đường dẫn hiển thị"
        : copied
          ? "Đã sao chép"
          : label}
    </button>
  );
}
export function RefreshButton() {
  const router = useRouter();
  return (
    <button className="secondary small" onClick={() => router.refresh()}>
      Kiểm tra trạng thái
    </button>
  );
}
