import { merchantSettings, paymentReadiness } from "@/server/wedding/settings";
import { AdminRecordForm } from "@/components/wedding/admin-form";
import { PaymentQr } from "@/components/wedding/payment-qr";
import { SupportContacts } from "@/components/wedding/support-contacts";
import { bankName } from "@/lib/banks";

export default async function Settings() {
  const settings = await merchantSettings();
  const readiness = paymentReadiness(settings);
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">CẤU HÌNH VẬN HÀNH</p>
          <h1>Thanh toán & hỗ trợ</h1>
          <p>
            Tài khoản nhận tiền mua gói dịch vụ. Khách mừng cưới dùng tài khoản
            riêng trên từng thiệp.
          </p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <p>Nhận tiền dịch vụ</p>
          <strong>{readiness.bankReady ? "Đã cấu hình" : "Chưa đủ"}</strong>
          <span className="fine">Ngân hàng · tài khoản · chủ tài khoản</span>
        </div>
        <div className="stat-card">
          <p>Liên hệ hỗ trợ</p>
          <strong>{readiness.supportReady ? "Đã có" : "Chưa có"}</strong>
          <span className="fine">Số điện thoại hoặc email bấm để liên hệ</span>
        </div>
        <div className="stat-card">
          <p>SePay tự động</p>
          <strong>
            {readiness.automaticReady ? "Cấu hình khớp" : "Chưa sẵn sàng"}
          </strong>
          <span className="fine">Chưa xác minh giao dịch ngân hàng thật</span>
        </div>
      </div>
      <div className="admin-report-grid">
        <section className="panel">
          <h2>Thông tin nhận tiền</h2>
          <AdminRecordForm kind="settings" initial={settings} />
        </section>
        <section className="panel">
          <h2>Thông tin khách sẽ nhìn thấy</h2>
          {readiness.bankReady ? (
            <>
              <div className="bank-details">
                <div>
                  <span>Ngân hàng</span>
                  <strong>{bankName(settings.bank)}</strong>
                </div>
                <div>
                  <span>Chủ tài khoản</span>
                  <strong>{settings.name}</strong>
                </div>
                <div>
                  <span>Số tài khoản</span>
                  <strong>{settings.account}</strong>
                </div>
              </div>
              <PaymentQr
                bank={settings.bank}
                account={settings.account}
                name={settings.name}
              />
              <p className="fine">
                QR này xem trước tài khoản nhận tiền. Trên đơn thật, hệ thống
                thêm đúng số tiền và mã đơn.
              </p>
            </>
          ) : (
            <p className="notice">
              Chưa có tài khoản đầy đủ. Khách sẽ được hướng dẫn liên hệ hỗ trợ
              trước khi thanh toán.
            </p>
          )}
          <SupportContacts settings={settings} />
        </section>
      </div>
      <section className="panel">
        <h2>Quy trình xác nhận thanh toán</h2>
        <ol className="payment-steps">
          <li>
            Khách chuyển đúng số tiền, đúng tài khoản và nội dung mã đơn được hệ
            thống tạo.
          </li>
          <li>
            Thông báo “đã chuyển” chỉ là yêu cầu kiểm tra; đơn vẫn chờ thanh
            toán.
          </li>
          <li>
            Quản trị đối chiếu sao kê rồi nhập mã giao dịch thực; hoặc SePay xác
            nhận khi cấu hình khớp.
          </li>
          <li>
            Tiền được ghi nhận một lần, gói kích hoạt và khách có thể xuất bản.
            Lịch sử đơn giữ giá và quyền lợi lúc mua.
          </li>
        </ol>
      </section>
      <section className="panel">
        <h2>Thanh toán tự động SePay</h2>
        <p className="notice">{readiness.automaticMessage}</p>
        <p>
          Webhook: <code>/api/payments/sepay</code>
        </p>
        <p style={{ marginTop: 15 }}>
          Trên SePay, chọn giao dịch tiền vào và xác thực API Key. Máy chủ cần
          SEPAY_WEBHOOK_API_KEY tối thiểu 32 ký tự và SEPAY_ACCOUNT_NUMBER trùng
          tài khoản đã lưu ở trên. Nếu đổi tài khoản nhận tiền mà chưa cập nhật
          máy chủ, tự động xác nhận sẽ tạm dừng.
        </p>
        <p className="fine" style={{ marginTop: 15 }}>
          Không hiển thị hoặc lưu khóa xác thực trên giao diện. Cấu hình khớp
          chưa chứng minh ngân hàng đã kết nối; cần giao dịch thử và đối chiếu
          sao kê trước khi mở bán.
        </p>
      </section>
    </>
  );
}
