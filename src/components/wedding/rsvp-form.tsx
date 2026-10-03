"use client";
import { useState, useRef } from "react";
import { post } from "./client";
import type { WeddingEvent } from "@/lib/wedding";
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export function RsvpForm({
  slug,
  events,
  guestName = "",
  guestToken,
  disabled = false,
}: {
  slug: string;
  events: WeddingEvent[];
  guestName?: string;
  guestToken?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attendance, setAttendance] = useState("attending");
  const clientId = useRef("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      if (!clientId.current) {
        try {
          clientId.current =
            localStorage.getItem(`rsvp:${slug}`) || crypto.randomUUID();
          localStorage.setItem(`rsvp:${slug}`, clientId.current);
        } catch {
          clientId.current = crypto.randomUUID();
        }
      }
      await post(`/api/wedding/rsvp/${slug}`, {
        clientId: clientId.current,
        name: String(form.get("name")),
        attendance,
        partySize: Number(form.get("partySize") || 1),
        eventIndex: Number(form.get("eventIndex")),
        message: String(form.get("message") || ""),
        ...(guestToken ? { guestToken } : {}),
      });
      setMessage(
        "Đã lưu phản hồi. Cảm ơn bạn! Lời chúc sẽ xuất hiện sau khi cặp đôi duyệt. Bạn có thể gửi lại để cập nhật xác nhận.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được phản hồi");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="wedding-rsvp form-stack" onSubmit={submit}>
      {disabled && (
        <div className="notice">
          Đây là bản xem thử. Chức năng gửi phản hồi sẽ hoạt động sau khi thiệp
          được xuất bản.
        </div>
      )}
      <label>
        Tên của bạn
        <input
          name="name"
          defaultValue={guestName}
          placeholder="Tên bạn muốn được gọi"
          minLength={2}
          maxLength={100}
          required
        />
      </label>
      <label>
        Bạn có thể đến chung vui không?
        <select
          name="attendance"
          value={attendance}
          onChange={(e) => setAttendance(e.target.value)}
        >
          <option value="attending">Có, mình sẽ tham dự</option>
          <option value="declined">Mình rất tiếc, không thể đến</option>
          <option value="undecided">Mình sẽ xác nhận sau</option>
        </select>
      </label>
      <div className="grid-two">
        <label>
          Bạn đến tiệc nào?
          <select name="eventIndex">
            {events.map((event, i) => (
              <option
                key={`${event.title}-${event.date}-${event.venue}`}
                value={i}
              >
                {event.title}
              </option>
            ))}
          </select>
        </label>
        {attendance === "attending" && (
          <label>
            Số người tham dự
            <select name="partySize">
              {PARTY_SIZES.map((size) => (
                <option value={size} key={size}>
                  {size} người
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label>
        Gửi đôi lời chúc
        <textarea
          name="message"
          maxLength={1000}
          placeholder="Một lời chúc cho ngày chung đôi…"
          rows={3}
        />
      </label>
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
      <button type="submit" disabled={busy || disabled}>
        {busy ? "Đang gửi…" : "Gửi xác nhận & lời chúc"}
      </button>
      <p className="fine">
        Phản hồi được gửi riêng đến cặp đôi. Lời chúc chỉ công khai sau khi được
        duyệt.
      </p>
    </form>
  );
}
