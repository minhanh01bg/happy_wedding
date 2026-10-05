import Link from "next/link";
import { Header, Footer } from "@/components/wedding/shell";
import { SupportContacts } from "@/components/wedding/support-contacts";
import { merchantSettings } from "@/server/wedding/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hướng dẫn & hỗ trợ" };

export default async function Support() {
  const { support, supportPhone, supportEmail } = await merchantSettings();
  return (
    <>
      <Header />
      <main className="section support-guide">
        <div className="page-intro">
          <p className="eyebrow">ĐỒNG HÀNH CÙNG NGÀY VUI</p>
          <h1>Hướng dẫn & hỗ trợ</h1>
          <p>
            Từng bước chuẩn bị thiệp, gửi lời mời và đón khách thật chu đáo.
          </p>
        </div>
        <section className="panel" aria-labelledby="support-contact-title">
          <h2 id="support-contact-title">Liên hệ chủ dịch vụ</h2>
          <SupportContacts settings={{ support, supportPhone, supportEmail }} />
          {!supportPhone && !supportEmail && (
            <p>
              Chưa công bố số điện thoại hoặc email hỗ trợ. Nếu đang xem bản
              minh họa, hãy liên hệ người đã gửi đường dẫn dịch vụ cho bạn.
            </p>
          )}
          <p>
            Khi cần kiểm tra thanh toán, chuẩn bị mã đơn trong mục Đơn dịch vụ
            và thông tin giao dịch đã chuyển.
          </p>
        </section>
        <div className="grid-two">
          <section className="panel" aria-labelledby="buyer-guide-title">
            <h2 id="buyer-guide-title">Hai bạn tạo thiệp</h2>
            <ol>
              <li>
                <Link className="text-link" href="/templates">
                  Xem mẫu thiệp
                </Link>{" "}
                đầy đủ, rồi chọn phong cách phù hợp.
              </li>
              <li>
                Tạo tài khoản, thay thông tin minh họa bằng tên, ngày giờ, gia
                đình và địa điểm của hai bạn.
              </li>
              <li>
                Lưu bản nháp, tải ảnh, thêm tài khoản mừng cưới riêng cho nhà
                trai và nhà gái nếu muốn.
              </li>
              <li>
                Xem trước bản đã lưu trên điện thoại; kiểm tra ngày giờ của từng
                tiệc, địa chỉ và ngân hàng.
              </li>
              <li>
                Chọn gói, chuyển đúng số tiền và nội dung trên đơn. Sau khi giao
                dịch được xác nhận, trở lại thiệp để xuất bản.
              </li>
              <li>
                Sao chép link hoặc QR của thiệp để tự gửi. Tạo lời mời riêng có
                tên khách nếu cần, theo dõi phản hồi và duyệt lời chúc.
              </li>
            </ol>
            <div className="inline-actions">
              <Link className="button" href="/dashboard/new">
                Tạo bản nháp miễn phí
              </Link>
              <Link className="text-link" href="/pricing">
                So sánh các gói
              </Link>
            </div>
          </section>
          <section className="panel" aria-labelledby="guest-guide-title">
            <h2 id="guest-guide-title">Bạn nhận lời mời</h2>
            <ol>
              <li>
                Mở đường dẫn do cặp đôi gửi. Bạn không cần tài khoản để xem
                thiệp hoặc phản hồi.
              </li>
              <li>
                Bấm Mở thiệp để xem hiệu ứng, hoặc Xem ngay, bỏ qua hiệu ứng để
                đọc trực tiếp.
              </li>
              <li>
                Chọn Lịch tiệc & chỉ đường; đọc đúng ngày giờ và địa điểm của
                tiệc bạn được mời.
              </li>
              <li>
                Ở Xác nhận tham dự, chọn tiệc, số người đi cùng và gửi phản hồi.
                Có thể gửi lại từ cùng lời mời để cập nhật.
              </li>
              <li>
                Nếu mừng cưới từ xa, chọn đúng Nhà trai hoặc Nhà gái, rồi kiểm
                tra ngân hàng và chủ tài khoản trước khi chuyển.
              </li>
            </ol>
            <p>
              Không mở được thiệp hoặc chưa rõ lịch tiệc? Liên hệ cặp đôi đã gửi
              lời mời để nhận đường dẫn và thông tin mới nhất.
            </p>
            <Link className="text-link" href="/w/thiep-mau">
              Xem một thiệp minh họa
            </Link>
          </section>
        </div>
        <section className="faq">
          <h2>Khi cần kiểm tra lại</h2>
          {[
            [
              "Đã chuyển tiền nhưng đơn còn chờ xác nhận?",
              "Thông báo đã chuyển chỉ gửi yêu cầu kiểm tra. Đối chiếu số tiền, ngân hàng và mã đơn trên trang thanh toán; bấm Kiểm tra trạng thái để tải lại. Nếu vẫn chờ, liên hệ chủ dịch vụ với mã đơn và thông tin giao dịch. Không cần tạo thêm một đơn giống nhau.",
            ],
            [
              "Vì sao khách chưa mở được đường dẫn thiệp?",
              "Trong Thiệp của tôi, kiểm tra thiệp đã xuất bản và gói còn hạn. Bản nháp hoặc bản xem trước chỉ dành cho bạn. Nếu thiệp bị quản trị tạm khóa, cần liên hệ chủ dịch vụ để xử lý.",
            ],
            [
              "Sửa nội dung rồi nhưng bản xem trước chưa đổi?",
              "Bấm Lưu thay đổi trước khi mở bản xem trước. Nếu đã đổi đường dẫn thiệp, gửi lại đường dẫn mới cho khách. Khi có thông báo dữ liệu đã thay đổi, tải lại trang trước khi sửa tiếp.",
            ],
            [
              "Quên mật khẩu tài khoản?",
              "Hiện chưa có khôi phục mật khẩu tự phục vụ. Liên hệ chủ dịch vụ để được hướng dẫn về tài khoản; không dùng tài khoản mới để truy cập thiệp thuộc tài khoản cũ.",
            ],
            [
              "QR mừng cưới có phải tiền mua gói không?",
              "Không. QR mừng cưới trên thiệp gửi tiền tới tài khoản của cặp đôi. Tiền mua gói chỉ chuyển theo thông tin và mã đơn trong tài khoản dịch vụ.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
        <p>
          <Link className="text-link" href="/policies">
            Đọc điều khoản & quyền riêng tư
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
