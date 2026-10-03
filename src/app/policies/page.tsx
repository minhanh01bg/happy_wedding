import { Header, Footer } from "@/components/wedding/shell";
export default function Policies() {
  return (
    <>
      <Header />
      <main className="section prose">
        <p className="eyebrow">THÔNG TIN DỊCH VỤ</p>
        <h1>Điều khoản & quyền riêng tư</h1>
        <div className="notice">
          Bản dự thảo dành cho dự án. Chủ dịch vụ cần điền tên đơn vị, địa chỉ,
          kênh hỗ trợ và xác nhận chính sách trước khi kinh doanh chính thức.
        </div>
        <h2>Dịch vụ thiệp cưới</h2>
        <p>
          Mỗi đơn kích hoạt một thiệp với số ảnh, quyền sử dụng mẫu và thời hạn
          đã ghi trên đơn. Thời hạn bắt đầu khi thanh toán được xác nhận. Gia
          hạn cộng vào thời hạn hiện tại nếu thiệp còn hiệu lực. Thiệp hết hạn
          sẽ dừng truy cập công khai.
        </p>
        <h2>Thanh toán & hỗ trợ</h2>
        <p>
          Khách chuyển khoản đúng số tiền và nội dung mã đơn. Ghi chú “đã
          chuyển” là thông báo để kiểm tra, chưa phải xác nhận thanh toán. Nếu
          chuyển nhầm, có yêu cầu hoàn tiền hoặc cần sửa thông tin tài khoản,
          hãy liên hệ kênh hỗ trợ được hiển thị trên đơn. Chính sách hoàn tiền
          và thời gian xử lý cần được chủ dịch vụ công bố trước khi mở bán.
        </p>
        <h2>Dữ liệu của bạn</h2>
        <p>
          Chúng tôi lưu số điện thoại đăng ký, mật khẩu đã băm, nội dung thiệp,
          ảnh, đơn dịch vụ, danh sách khách và phản hồi tham dự. Mật khẩu và
          danh sách khách không hiển thị công khai. Thông tin bạn đưa lên thiệp
          xuất bản có thể được bất kỳ ai biết đường dẫn truy cập. Ảnh tải lên có
          đường dẫn công khai; không tải tài liệu riêng tư hoặc nhạy cảm.
        </p>
        <h2>Lời chúc & quyền của khách</h2>
        <p>
          Lời chúc chỉ hiển thị công khai khi chủ thiệp phê duyệt. Phản hồi tham
          dự phục vụ việc tổ chức tiệc. Khách có thể gửi lại phản hồi bằng cùng
          lời mời cá nhân để cập nhật. Chủ thiệp có thể xuất danh sách và thu
          hồi thiệp.
        </p>
        <h2>Dịch vụ liên quan</h2>
        <p>
          Liên kết chỉ đường mở Google Maps. QR chuyển khoản sử dụng VietQR;
          nhạc nền chỉ tải khi khách bật phát. Khi dùng dịch vụ bên ngoài, dữ
          liệu liên quan được gửi tới nhà cung cấp đó.
        </p>
        <h2>Quyền sử dụng nội dung</h2>
        <p>
          Chỉ tải ảnh và nhạc khi bạn có quyền sử dụng. Các mẫu thiết kế của Hỷ
          Studio được tạo cho dự án; các trang tham khảo chỉ được dùng để nghiên
          cứu tính năng.
        </p>
      </main>
      <Footer />
    </>
  );
}
