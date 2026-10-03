import { Brand } from "./shell";
import { Botanical } from "./template-card";
import { AuthForm } from "./auth-form";
export function AuthPage({
  mode,
  next,
}: {
  mode: "login" | "register" | "admin";
  next?: string;
}) {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Brand />
        <div>
          <p className="eyebrow">MỘT KHỞI ĐẦU THẬT ĐẸP</p>
          <h1>
            Ngày vui của bạn.
            <br />
            Một lời mời
            <br />
            <em>đầy yêu thương.</em>
          </h1>
          <p>
            Tạo, lưu và chia sẻ thiệp cưới — tất cả trong không gian riêng của
            hai bạn.
          </p>
        </div>
        <p>Hỷ Studio · Từng chi tiết, đều được chăm chút.</p>
        <Botanical />
      </aside>
      <section className="auth-main">
        <AuthForm mode={mode} next={next} />
      </section>
    </main>
  );
}
