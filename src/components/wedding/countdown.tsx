"use client";
import { useSyncExternalStore } from "react";
function subscribe(listener: () => void) {
  const timer = setInterval(listener, 1000);
  return () => clearInterval(timer);
}
const snapshot = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => 0;
export function Countdown({ date }: { date: string }) {
  const now = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const seconds = Math.max(
    0,
    Math.floor(new Date(date).getTime() / 1000) - now,
  );
  const values = [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ];
  return (
    <div className="countdown" aria-label="Đếm ngược tới ngày cưới">
      {["Ngày", "Giờ", "Phút", "Giây"].map((label, i) => (
        <div key={label}>
          <strong>{now ? String(values[i]).padStart(2, "0") : "—"}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
