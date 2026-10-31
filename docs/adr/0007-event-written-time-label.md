# ADR 0007 — Giờ tiệc ghi bằng chữ

Date: 2026-10-31. Status: Accepted / implemented.

## Context

Mỗi tiệc trong `Invitation.eventsJson` có `date` là một thời điểm ISO, và thiệp luôn in giờ của thời điểm đó. Thiệp in của nhà trai ghi “Lễ thành hôn nhà trai” ngày 09/11/2026 là “Thời gian: Buổi sáng”, không có giờ cụ thể. Nếu khách buộc phải chọn một giờ như 08:00, thiệp online sẽ khẳng định một giờ mà gia đình không đưa ra, và link “Thêm vào lịch” cũng mang giờ đó.

## Decision

1. **Thêm `timeLabel` tùy chọn vào từng tiệc**, là chữ tự do: trim, tối đa 40 ký tự, kiểm tra bằng Zod trong `eventSchema` cùng các field khác. Chuỗi rỗng được transform thành không có, nên field không được lưu và `eventsJson` của tiệc không nhãn giống hệt trước.
2. **`date` vẫn bắt buộc.** Nó vẫn cho ngày hiển thị, ngày trên lịch, thứ tự tiệc và việc so khớp với `weddingDate`. Khi có nhãn, phần giờ của `date` chỉ để xếp thứ tự và không hiện cho khách.
3. **Hiển thị:** mọi chỗ in giờ của tiệc (dòng giờ dưới tên tiệc ở cả mười mẫu, ô giờ riêng của Song hỷ, Khoảnh khắc, Bên nhau) in nhãn thay giờ; ngày vẫn hiện. `<time datetime>` chỉ mang ngày `YYYY-MM-DD` theo giờ Việt Nam, để dữ liệu máy đọc không chứa giờ giả.
4. **Lịch:** tiệc có nhãn tạo sự kiện cả ngày theo ngày Việt Nam của `date` (`dates=YYYYMMDD/YYYYMMDD`, ngày kết thúc loại trừ). Phần mô tả ghi “Thời gian: <nhãn>” và nói rõ thiệp không ghi giờ cụ thể. Link “Thêm ngày cưới vào lịch” ở phần đếm ngược làm giống vậy khi tiệc trùng đúng `weddingDate` có nhãn. Tiệc không nhãn giữ khoảng ba giờ tạm tính như cũ.
5. **Countdown không đổi:** vẫn đếm tới “Ngày giờ cưới chính” do khách nhập. Đây là field riêng của thiệp, không phải tiệc, nên nhãn không ảnh hưởng.

## Alternatives

- **Danh sách cố định** (Buổi sáng / Buổi trưa / Buổi chiều / Buổi tối): dễ kiểm soát nhưng thiệp in có nhiều cách ghi (“Giờ hoàng đạo”, “Sau lễ gia tiên”…). Chữ tự do ngắn đủ linh hoạt, và 40 ký tự giữ được bố cục các mẫu.
- **Cho `date` chỉ là ngày** (`YYYY-MM-DD`) khi không có giờ: đổi kiểu dữ liệu của field bắt buộc, làm vỡ sắp xếp, so khớp `weddingDate`, `weddingDateParts` và mọi bản ghi cũ. Nhãn riêng không chạm dữ liệu hiện có.
- **Cờ `noTime` kèm chữ cố định “Trong ngày”**: không ghi được đúng chữ gia đình muốn.
- **Lịch vẫn dùng giờ của `date` với nhãn trong mô tả**: lịch của khách sẽ báo một giờ sai, đúng điều cần tránh. Bỏ hẳn link lịch cho tiệc có nhãn thì khách mất chức năng. Sự kiện cả ngày là cách đúng đơn giản nhất mà Google Calendar hỗ trợ trực tiếp.

## Consequences

- Không có Prisma migration. Bản ghi cũ đọc và hiển thị y như trước; test render so markup của tiệc không nhãn ở mọi mẫu với chuỗi cũ.
- Nhãn dài có thể xuống dòng trong ô giờ hẹp của Song hỷ, Khoảnh khắc, Bên nhau. Thẻ tiệc đã có `overflow-wrap: anywhere` nên không tràn ngang.
- Countdown vẫn tính tới giờ khách nhập ở “Ngày giờ cưới chính”. Nếu ngày cưới chính là tiệc có nhãn thì nên nhập một giờ đại diện, ví dụ 08:00 cho “Buổi sáng”.
- RSVP, CSV và màn khách mời chỉ dùng tên tiệc nên không đổi. Admin chưa có màn nào hiển thị chi tiết tiệc.

## Evidence

Xem mục “Giờ ghi bằng chữ cho tiệc — 31/10/2026” trong [VERIFICATION](../VERIFICATION.md).

## Revisit when

Cần lịch trình nhiều mốc trong một tiệc (giờ đón khách, giờ làm lễ), cần xuất `.ics` hoặc dữ liệu có cấu trúc cho máy tìm kiếm, hoặc khách cần nhãn dài hơn 40 ký tự.
