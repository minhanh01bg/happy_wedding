"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty-page">
      <h1>Chưa tải được trang</h1>
      <p>Vui lòng thử lại sau một chút.</p>
      <button onClick={reset}>Thử lại</button>
    </main>
  );
}
