"use client";
import { useState, useRef, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { randomUUID } from "@/lib/random-id";
import {
  EVENT_SIDES,
  EVENT_SIDE_LABELS,
  eventSide,
  type EventSide,
} from "@/lib/rsvp-events";
import { post } from "./client";
import type { WeddingEvent } from "@/lib/wedding";
import styles from "./rsvp-form.module.css";

/** Khớp giới hạn `partySize` của responseSchema. */
const MAX_PARTY_SIZE = 10;
/**
 * Form chỉ hỏi đến hay không. API vẫn nhận `undecided` cho phản hồi cũ và
 * trang đã mở từ trước, nhưng form không còn gửi giá trị này.
 */
const ATTENDANCE = [
  { value: "attending", label: "Có, mình sẽ tham dự" },
  { value: "declined", label: "Mình rất tiếc, không thể đến" },
] as const;
type Attendance = (typeof ATTENDANCE)[number]["value"];

/** Một lựa chọn: radio thật, nhãn bọc ngoài để bấm vào đâu cũng chọn được. */
function Choice({
  name,
  value,
  checked,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.choice}>
      <input
        suppressHydrationWarning
        className={styles.radio}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
      />
      <span className={styles.face}>
        <span className={styles.text}>{children}</span>
      </span>
    </label>
  );
}

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
  const [attendance, setAttendance] = useState<Attendance>("attending");
  const [partySize, setPartySize] = useState(1);
  const clientId = useRef("");
  // Chỉ hỏi bên khi thiệp có tiệc của cả nhà trai lẫn nhà gái. Tiệc chung
  // (không rõ bên) thuộc cả hai bên. Khách không chọn ngày: form gửi chỉ số
  // gốc của tiệc đầu tiên thuộc bên đã chọn, để danh sách khách biết bên nào.
  const options = events.map((event, index) => ({
    index,
    side: eventSide(event),
  }));
  const askSide = EVENT_SIDES.every((side) =>
    options.some((option) => option.side === side),
  );
  const [side, setSide] = useState<EventSide>(
    () => options.find((option) => option.side)?.side ?? "groom",
  );
  // Tính lại mỗi lần render vì danh sách tiệc có thể đổi trong bản xem thử.
  const eventIndex =
    (askSide
      ? options.find((option) => !option.side || option.side === side)
      : options[0]
    )?.index ?? 0;
  const attending = attendance === "attending";

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
            localStorage.getItem(`rsvp:${slug}`) || randomUUID();
          localStorage.setItem(`rsvp:${slug}`, clientId.current);
        } catch {
          clientId.current = randomUUID();
        }
      }
      await post(`/api/wedding/rsvp/${slug}`, {
        clientId: clientId.current,
        name: String(form.get("name")),
        attendance,
        partySize: attending ? partySize : 1,
        eventIndex: attending ? eventIndex : 0,
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
    <form
      suppressHydrationWarning
      className={`wedding-rsvp ${styles.form}`}
      onSubmit={submit}
    >
      {disabled && (
        <div className="notice">
          Đây là bản xem thử. Chức năng gửi phản hồi sẽ hoạt động sau khi thiệp
          được xuất bản.
        </div>
      )}
      <label className={styles.field}>
        <span className={styles.label}>Tên của bạn</span>
        <input
          suppressHydrationWarning
          className={styles.input}
          name="name"
          defaultValue={guestName}
          placeholder="Tên bạn muốn được gọi"
          minLength={2}
          maxLength={100}
          required
        />
      </label>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          Bạn có thể đến chung vui không?
        </legend>
        <div className={styles.stack}>
          {ATTENDANCE.map((option) => (
            <Choice
              key={option.value}
              name="attendance"
              value={option.value}
              checked={attendance === option.value}
              onSelect={() => setAttendance(option.value)}
            >
              {option.label}
            </Choice>
          ))}
        </div>
      </fieldset>
      {attending && askSide && (
        <fieldset className={`${styles.group} ${styles.reveal}`}>
          <legend className={styles.legend}>Bạn đến dự bên nào?</legend>
          <div className={styles.sides}>
            {EVENT_SIDES.map((value) => (
              <Choice
                key={value}
                name="side"
                value={value}
                checked={side === value}
                onSelect={() => setSide(value)}
              >
                {EVENT_SIDE_LABELS[value]}
              </Choice>
            ))}
          </div>
        </fieldset>
      )}
      {attending && (
        <fieldset className={`${styles.group} ${styles.reveal}`}>
          <legend className={styles.legend}>Số người tham dự</legend>
          <div className={styles.stepper}>
            {/* aria-disabled thay cho disabled để nút không mất focus ở giới hạn. */}
            <button
              type="button"
              className={styles.step}
              aria-label="Bớt một người"
              aria-disabled={partySize <= 1}
              onClick={() => setPartySize((size) => Math.max(1, size - 1))}
            >
              <Minus size={20} aria-hidden />
            </button>
            <span className={styles.count} aria-live="polite">
              {partySize} người
            </span>
            <button
              type="button"
              className={styles.step}
              aria-label="Thêm một người"
              aria-disabled={partySize >= MAX_PARTY_SIZE}
              onClick={() =>
                setPartySize((size) => Math.min(MAX_PARTY_SIZE, size + 1))
              }
            >
              <Plus size={20} aria-hidden />
            </button>
          </div>
        </fieldset>
      )}
      <label className={styles.field}>
        <span className={styles.label}>Gửi đôi lời chúc</span>
        <textarea
          suppressHydrationWarning
          className={styles.input}
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
      <button
        type="submit"
        className={styles.submit}
        disabled={busy || disabled}
      >
        {busy ? "Đang gửi…" : "Gửi xác nhận & lời chúc"}
      </button>
      <p className="fine">
        Phản hồi được gửi riêng đến cặp đôi. Lời chúc chỉ công khai sau khi được
        duyệt.
      </p>
    </form>
  );
}
