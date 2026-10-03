import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-page">
      <p className="eyebrow">HỶ STUDIO</p>
      <h1>Lời mời chưa sẵn sàng</h1>
      <p>Thiệp chưa xuất bản, đã hết hạn hoặc đường dẫn không còn hoạt động.</p>
      <Link className="button" href="/">
        Về trang chủ
      </Link>
    </main>
  );
}
