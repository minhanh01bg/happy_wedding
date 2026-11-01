# ADR 0009 — Bản đồ tiệc không giải link rút gọn trên server

Date: 2026-11-01. Status: Accepted / implemented.

## Context

Chủ studio muốn phần lịch tiệc “vẽ hẳn cái bản đồ ra”. Khách gửi link chia sẻ của Google Maps, thường là link rút gọn `maps.app.goo.gl/…`. Link rút gọn không chứa tọa độ: phải theo redirect mới thấy link dài, ví dụ `/maps/place/…/data=…!3d<lat>!4d<lng>…` (nhà trai) hoặc `maps.google.com/?q=<lat>,<lng>` (ghim GPS của nhà gái). Thiệp công khai có thể mang token khách mời cá nhân trên URL, nên bản đồ không được làm lộ token qua referrer.

## Decision

1. **Không gọi mạng khi lưu.** Mỗi tiệc có `mapUrl` tùy chọn (Zod: chỉ https, chỉ host Google Maps) và cặp `lat`/`lng` tùy chọn trong khung Việt Nam. Server chỉ kiểm chuỗi, không fetch và không theo redirect của link.
2. **Tọa độ đọc bằng hàm thuần** từ link dài: ưu tiên ghim `!3d!4d`, rồi `q=`/`query=`, cuối cùng tâm khung nhìn `@lat,lng`. Editor điền `lat`/`lng` khi khách dán link dài và xóa khi link đổi. Link rút gọn để trống tọa độ, trừ khi client API gửi kèm tọa độ đã biết.
3. **Bản đồ nhúng không cần API key:** `https://maps.google.com/maps?q=<lat>,<lng>&z=16&hl=vi&output=embed`, không có tọa độ thì `q=<venue, address>`. Mỗi địa điểm khác nhau một iframe, `loading="lazy"`, `referrerPolicy="no-referrer"`. Từ 01/11/2026 (bổ sung) iframe nằm ngay trong thẻ tiệc của địa điểm đó, không còn khối “Đường đến tiệc” riêng dưới các thẻ; các tiệc chung thẻ khi trùng bên và trùng địa điểm + địa chỉ sau khi bỏ khoảng trắng hai đầu. CSP mở `frame-src` cho đúng `https://maps.google.com` và `https://www.google.com`.
4. **Nút “Chỉ đường đến tiệc” mở đúng `mapUrl`** khi có, nên link rút gọn vẫn đưa khách tới ghim gốc trên Google Maps.

## Alternatives

- **(a) Server giải link rút gọn khi lưu** (allowlist host, `redirect: "manual"`, tối đa 3 bước, timeout ngắn). Bị loại vì: mutation lưu thiệp sẽ có request ra ngoài, nên dù có allowlist vẫn là một bề mặt SSRF cần giữ đúng mãi (redirect, IDN, cổng, DNS); kết quả phụ thuộc cách Google trả cho máy chủ (trang đồng ý cookie, trang 200 dùng JS thay vì 302, giới hạn với IP máy chủ), nên có thể hỏng âm thầm; lưu thiệp chậm thêm tới thời gian timeout; test và môi trường không có mạng không kiểm được đường thật.
- **Google Maps Embed/Geocoding API có key:** cần key, hạn mức và chi phí, key lộ trên trang công khai.
- **Vẽ bản đồ bằng thư viện tile (Leaflet/OSM):** thêm JS, tile từ bên thứ ba và CSP rộng hơn, không đổi được việc phải có tọa độ.

## Consequences

- Link dài và ghim GPS cho bản đồ ghim đúng chỗ. Link rút gọn không kèm tọa độ thì bản đồ tìm theo địa điểm + địa chỉ, có thể lệch nếu Google không nhận ra chữ; editor nói rõ điều này và chỉ cách dán link dài. Nút chỉ đường vẫn mở đúng link.
- Thiệp mẫu không có link, nên bản đồ tìm theo địa chỉ minh họa sẵn có; không thêm tọa độ hay địa chỉ thật.
- Không có Prisma migration: field mới nằm trong `eventsJson`, bản ghi cũ đọc như trước.
- Iframe của Google vẫn tải tài nguyên từ Google khi khách cuộn tới, nhưng không nhận URL thiệp (không referrer).

## Evidence

`tests/lib/event-map.test.ts` (schema, parser với hai link thật đã giải, URL nhúng, gộp địa điểm), `tests/components/invitation-event-maps.test.tsx` (bốn tiệc ở hai nơi thành hai thẻ, mỗi thẻ có bên, một iframe nằm trong thẻ, `referrerpolicy="no-referrer"`; mỗi tiệc một nơi vẫn mỗi tiệc một thẻ; góc bo từng mẫu) và `tests/server/security/csp.test.ts` (`frame-src`).

## Revisit when

Khách hay dán link rút gọn mà bản đồ theo địa chỉ lệch nhiều, cần chỉ đường nhiều chặng, hoặc dự án có hạ tầng gọi ra ngoài đã kiểm soát SSRF (proxy egress có allowlist) để giải link ngoài luồng lưu.
