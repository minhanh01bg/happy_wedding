import { merchantSettings } from "@/server/wedding/settings";
import { AdminRecordForm } from "@/components/wedding/admin-form";
export default async function Settings() {
  const settings = await merchantSettings();
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">CẤU HÌNH VẬN HÀNH</p>
          <h1>Thanh toán & hỗ trợ</h1>
          <p>Thông tin này hiển thị trên đơn dịch vụ của khách.</p>
        </div>
      </div>
      <section className="panel">
        <AdminRecordForm kind="settings" initial={settings} />
      </section>
      <section className="panel">
        <h2>Thanh toán tự động SePay</h2>
        <p>
          Webhook: <code>/api/payments/sepay</code>
        </p>
        <p style={{ marginTop: 15 }}>
          Bật xác thực API Key trên SePay, chọn giao dịch tiền vào và đúng tài
          khoản nhận tiền. Quản trị máy chủ cấu hình SEPAY_WEBHOOK_API_KEY (tối
          thiểu 32 ký tự) và SEPAY_ACCOUNT_NUMBER. Chưa cấu hình thì webhook
          ngừng nhận thanh toán tự động.
        </p>
        <p className="fine" style={{ marginTop: 15 }}>
          Webhook kiểm tra đúng tài khoản, mã đơn, số tiền và chống xử lý trùng.
          Không lưu khóa xác thực trong giao diện.
        </p>
      </section>
    </>
  );
}
