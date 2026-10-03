"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { post } from "./client";

export function AuthForm({
  mode,
  next = "/dashboard",
}: {
  mode: "login" | "register" | "admin";
  next?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const phone = String(form.get("phone") || "");
    const password = String(form.get("password") || "");
    try {
      if (mode === "register") {
        await post("/api/customer-auth/register", {
          phone,
          password,
          displayName: String(form.get("displayName")),
        });
        await post("/api/customer-auth/login", { phone, password });
      } else
        await post(
          mode === "admin" ? "/api/auth/login" : "/api/customer-auth/login",
          mode === "admin" ? { password } : { phone, password },
        );
      router.push(mode === "admin" ? "/admin" : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa đăng nhập được");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-form">
      <p className="eyebrow">
        {mode === "admin" ? "KHÔNG GIAN QUẢN TRỊ" : "KHÔNG GIAN CỦA HAI BẠN"}
      </p>
      <h2>
        {mode === "register"
          ? "Bắt đầu chuyện của bạn."
          : mode === "admin"
            ? "Đăng nhập quản trị"
            : "Chào bạn trở lại."}
      </h2>
      <p>
        {mode === "register"
          ? "Tạo tài khoản để chọn mẫu và lưu lời mời của bạn."
          : "Đăng nhập để tiếp tục chăm chút những điều đẹp."}
      </p>
      <form onSubmit={submit} className="form-stack">
        {mode === "register" && (
          <label>
            Tên của bạn
            <input
              name="displayName"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              placeholder="Tên bạn muốn được gọi"
            />
          </label>
        )}
        {mode !== "admin" && (
          <label>
            Số điện thoại
            <input
              name="phone"
              autoComplete="tel"
              type="tel"
              required
              placeholder="09xx xxx xxx"
              maxLength={25}
            />
          </label>
        )}
        <label>
          Mật khẩu
          <input
            type="password"
            name="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            minLength={mode === "admin" ? 1 : 10}
            maxLength={128}
            required
            placeholder={
              mode === "register" ? "Tối thiểu 10 ký tự" : "Mật khẩu của bạn"
            }
          />
        </label>
        {mode === "register" && (
          <label className="inline-check">
            <input type="checkbox" required />
            <span>
              Tôi đồng ý với{" "}
              <Link className="muted-link" href="/policies">
                điều khoản & quyền riêng tư
              </Link>
              .
            </span>
          </label>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {busy
            ? "Đang xử lý…"
            : mode === "register"
              ? "Tạo tài khoản & bắt đầu"
              : "Đăng nhập"}
        </button>
      </form>
      {mode !== "admin" && (
        <div className="auth-bottom">
          {mode === "register" ? "Đã có tài khoản? " : "Lần đầu đến đây? "}
          <Link
            href={`/account/${mode === "register" ? "login" : "register"}?next=${encodeURIComponent(next)}`}
          >
            {mode === "register" ? "Đăng nhập" : "Tạo tài khoản"}
          </Link>
        </div>
      )}
      <div className="auth-bottom">
        <Link href="/">← Về Hỷ Studio</Link>
      </div>
    </div>
  );
}
