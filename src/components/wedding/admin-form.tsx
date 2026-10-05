"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BankSelect } from "./bank-select";
import { PALETTES, LAYOUTS } from "@/lib/wedding";
import { post } from "./client";
type Values = Record<string, string | number | boolean | undefined>;
export function AdminRecordForm({
  kind,
  initial = {},
}: {
  kind: "templates" | "plans" | "settings";
  initial?: Values;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const text = (name: string) => String(initial[name] ?? "");
  const number = (name: string, fallback: number) =>
    Number(initial[name] ?? fallback);
  const input = (name: string, label: string, required = true) => (
    <label>
      {label}
      <input
        name={name}
        defaultValue={text(name)}
        required={required}
        maxLength={name === "slug" ? 80 : 300}
      />
    </label>
  );
  const numeric = (
    name: string,
    label: string,
    fallback: number,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        name={name}
        defaultValue={number(name, fallback)}
        min={min}
        max={max}
        step={1}
        required
      />
    </label>
  );
  const check = (name: string, label: string, fallback = false) => (
    <label className="inline-check">
      <input
        name={name}
        type="checkbox"
        defaultChecked={Boolean(initial[name] ?? fallback)}
      />
      {label}
    </label>
  );
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const value = (key: string) => String(form.get(key) || "");
        const checked = (key: string) => form.get(key) === "on";
        setBusy(true);
        setMessage("");
        setError("");
        try {
          let data: Record<string, unknown>;
          if (kind === "settings")
            data = {
              bank: value("bank"),
              account: value("account"),
              name: value("name"),
              support: value("support"),
              supportPhone: value("supportPhone"),
              supportEmail: value("supportEmail"),
            };
          else if (kind === "templates")
            data = {
              ...(initial.id ? { id: initial.id } : {}),
              name: value("name"),
              slug: value("slug"),
              category: value("category"),
              description: value("description"),
              palette: value("palette"),
              layout: value("layout"),
              premium: checked("premium"),
              active: checked("active"),
              sortOrder: Number(form.get("sortOrder")),
            };
          else
            data = {
              ...(initial.id ? { id: initial.id } : {}),
              name: value("name"),
              description: value("description"),
              price: Number(form.get("price")),
              months: Number(form.get("months")),
              maxPhotos: Number(form.get("maxPhotos")),
              premiumTemplates: checked("premiumTemplates"),
              removeBranding: checked("removeBranding"),
              active: checked("active"),
              sortOrder: Number(form.get("sortOrder")),
            };
          await post(`/api/wedding/admin/${kind}`, data);
          setMessage("Đã lưu cấu hình");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Chưa lưu được");
        } finally {
          setBusy(false);
        }
      }}
    >
      {kind === "settings" ? (
        <>
          <div className="grid-two">
            <label>
              Ngân hàng nhận tiền dịch vụ
              <BankSelect name="bank" defaultValue={text("bank")} />
            </label>
            {input("account", "Số tài khoản", false)}
          </div>
          {input("name", "Tên chủ tài khoản", false)}
          {input("support", "Kênh hỗ trợ (SĐT/email)", false)}
          <div className="grid-two">
            <label>
              Số điện thoại hỗ trợ
              <input
                type="tel"
                name="supportPhone"
                defaultValue={text("supportPhone")}
                maxLength={16}
                placeholder="0901234567"
              />
            </label>
            <label>
              Email hỗ trợ
              <input
                type="email"
                name="supportEmail"
                defaultValue={text("supportEmail")}
                maxLength={254}
                placeholder="hotro@tenmien.vn"
              />
            </label>
          </div>
          <p className="fine">
            Thông tin nhận tiền dịch vụ tách biệt với tài khoản mừng cưới của
            các cặp đôi. Điền đủ ngân hàng, tài khoản và tên chủ tài khoản để
            khách thấy QR thanh toán. Kênh hỗ trợ xuất hiện trên đơn để khách
            liên hệ khi cần.
          </p>
        </>
      ) : (
        <>
          {input(
            "name",
            kind === "plans" ? "Tên gói dịch vụ" : "Tên mẫu thiệp",
          )}
          {input("description", "Mô tả", false)}
          {kind === "templates" ? (
            <>
              <div className="grid-two">
                {input("slug", "Đường dẫn mẫu (chữ thường, số, gạch ngang)")}
                <label>
                  Phong cách
                  <select
                    name="category"
                    defaultValue={text("category") || "Tối giản"}
                  >
                    {["Tối giản", "Hoa lá", "Truyền thống", "Hiện đại"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <div className="grid-two">
                <label>
                  Phối màu
                  <select
                    name="palette"
                    defaultValue={text("palette") || "rose"}
                  >
                    {PALETTES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Bố cục
                  <select
                    name="layout"
                    defaultValue={text("layout") || "editorial"}
                  >
                    {LAYOUTS.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
              {check("premium", "Mẫu cao cấp (cần gói hỗ trợ)")}
            </>
          ) : (
            <>
              <div className="grid-two">
                {numeric("price", "Giá (VND)", 199000, 0, 50000000)}
                {numeric("months", "Thời hạn (tháng)", 12, 1, 60)}
              </div>
              {numeric("maxPhotos", "Giới hạn ảnh", 12, 1, 40)}
              {check("premiumTemplates", "Sử dụng mẫu cao cấp")}
              {check("removeBranding", "Ẩn thương hiệu trên thiệp")}
            </>
          )}
          {numeric("sortOrder", "Thứ tự hiển thị", 0, 0, 100)}
          {check("active", "Đang cung cấp", true)}
        </>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
      <button disabled={busy} type="submit">
        {busy ? "Đang lưu…" : "Lưu cấu hình"}
      </button>
    </form>
  );
}
export function ConfirmPaymentForm({
  id,
  total,
}: {
  id: string;
  total: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          await post("/api/wedding/admin/confirm-payment", {
            id,
            transactionId: String(form.get("transactionId")),
            amount: Number(form.get("amount")),
          });
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Chưa xác nhận được");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Mã giao dịch ngân hàng
        <input
          required
          minLength={4}
          maxLength={100}
          name="transactionId"
          placeholder="Mã tham chiếu trên sao kê"
        />
      </label>
      <label>
        Số tiền thực nhận (VND)
        <input
          type="number"
          name="amount"
          defaultValue={total}
          min={0}
          step={1}
          required
        />
      </label>
      <label className="inline-check">
        <input type="checkbox" required />
        <span>
          Tôi đã kiểm tra sao kê và xác nhận giao dịch đã vào đúng tài khoản.
        </span>
      </label>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {busy ? "Đang xác nhận…" : "Xác nhận tiền đã nhận & kích hoạt gói"}
      </button>
    </form>
  );
}
