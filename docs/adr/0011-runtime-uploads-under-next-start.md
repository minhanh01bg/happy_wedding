# ADR 0011 — Phục vụ ảnh và MP3 upload bằng route khi chạy `next start`

Date: 2026-11-01. Status: Accepted / implemented.

## Context

Site chuyển từ `next dev` sang `next build` + `next start`. Khách tải ảnh (ADR 0008) và MP3 (ADR 0010) lúc site đang chạy, vào `public/uploads/weddings/<uuid>.<đuôi>`. `next dev` kiểm tra đĩa ở mỗi request nên thấy tệp mới ngay. `next start` thì chỉ liệt kê `public/` **một lần lúc khởi động** (`publicFolderItems` trong `next/dist/server/lib/router-utils/filesystem.js`), nên tệp tải lên sau đó trả 404 cho tới lần khởi động lại. `/_next/image` cũng hỏng theo: với URL nội bộ, optimizer không đọc đĩa mà gửi request giả qua chính router của Next (`fetchInternalImage` trong `image-optimizer.js`), nên nó gặp cùng lỗi 404.

## Decision

1. **Route handler `src/app/uploads/weddings/[file]/route.ts`** (GET và HEAD, `force-dynamic`) đọc đĩa ở mỗi request, logic nằm trong `src/app/uploads/serve-upload.ts`. URL giữ nguyên `/uploads/weddings/<tệp>`, nên dữ liệu, schema và `weddingImageSource()` không đổi. Tệp có lúc khởi động vẫn do Next phục vụ như file tĩnh (Next so `public/` trước route); route chỉ nhận tệp mới hơn. Optimizer đi qua router nên tìm thấy route và tối ưu được ảnh mới.
2. **Đường dẫn an toàn:** tên phải là một đoạn duy nhất `^[A-Za-z0-9_-]{1,128}\.(đuôi)$`: không `/`, không `..`, không tệp ẩn, đuôi chữ thường. Chỉ nhận `webp`, `jpg`, `jpeg`, `png` và `mp3`, mỗi đuôi gắn với một Content-Type cố định; tên khác trả 404. Tệp được mở với `O_NOFOLLOW` rồi `fstat` phải là tệp thường, nên symlink (kể cả trỏ vào trong thư mục) và thư mục đều trả 404. Thư mục cố định là `process.cwd()/public/uploads/weddings`, đúng nơi hai route upload ghi.
3. **Header:** `Content-Type` theo đuôi, `X-Content-Type-Options: nosniff`, `Accept-Ranges: bytes`, `Last-Modified`, và `Cache-Control: public, max-age=31536000, immutable`, vì tên là UUID do server tạo, ghi một lần, không bao giờ ghi đè. 404 có `Cache-Control: no-store`.
4. **Range cho MP3 (và mọi tệp):** một khoảng `bytes=` trả 206 với `Content-Range`; khoảng nằm ngoài tệp trả 416 với `bytes */<size>`. Nhiều khoảng hoặc header sai thì trả cả tệp với 200, như RFC 9110 cho phép. Tệp được stream, không nạp cả 40 MB vào bộ nhớ.
5. **Lỗi đĩa** khác "không có tệp" trả 500 kèm correlationId và log `upload_serve_error` (chỉ errorClass và errorCode, không có tên tệp).
6. **Không trace thư mục upload lúc build:** đường dẫn đánh dấu `/*turbopackIgnore: true*/`. Không có nó, Turbopack cảnh báo và đưa cả dự án (gồm `public/` với mọi ảnh khách) vào file trace của route.

## Alternatives

- **nginx `alias` tới thư mục upload:** nhanh hơn cho tệp lớn, nhưng thư mục home của tài khoản vận hành để quyền `700`, nginx không đọc được nếu không nới quyền. Nó cũng không sửa được `/_next/image`, vì optimizer gọi qua Next chứ không qua nginx. Sẽ thành hai đường phục vụ khác nhau cho cùng một URL.
- **Chuyển upload ra ngoài `public/` và phục vụ hoàn toàn bằng route:** sạch hơn về lâu dài, mọi tệp có cùng header. Nhưng phải dời tệp đang có và sửa hai route upload, `weddingImageSource` và backup, ngoài phạm vi bước này. Route hiện tại đã nhận tham số `root` để làm việc đó sau.
- **Khởi động lại server sau mỗi upload:** gây downtime theo hành động của khách.
- **Header trong `next.config.ts` cho `/uploads/*`:** không sửa được 404, và sẽ gắn cache dài cả vào response 404.
- **Custom server:** mất tối ưu của Next, thêm mã vận hành.

## Consequences

- Hai nguồn header: tệp có lúc khởi động được Next trả `Cache-Control: public, max-age=0` (trình duyệt kiểm lại bằng ETag), tệp mới trả `immutable` một năm. Sau mỗi lần khởi động lại, mọi tệp lại về nhóm thứ nhất. Cả hai đều đúng, chỉ khác mức cache.
- Optimizer cache biến thể ảnh trong `.next/cache/images` theo `max(minimumCacheTTL = 4 giờ, max-age của nguồn)`: một năm với ảnh mới, 4 giờ với ảnh có lúc khởi động. Khi hết hạn, Next trả bản cũ rồi mã hóa lại ở nền. Cache này không phụ thuộc build nên `scripts/deploy-prod.sh` giữ lại qua mỗi lần deploy.
- **Gỡ tệp (khiếu nại bản quyền, ADR 0010):** xóa tệp trong `public/uploads/weddings/` thì route trả 404 ngay. Nhưng biến thể ảnh đã tối ưu vẫn nằm trong `.next/cache/images` cho tới khi hết hạn, và trình duyệt đã tải thì giữ bản của nó. Để gỡ hẳn ảnh, xóa cả `.next/cache/images` (Next tự tạo lại, tốn CPU lần đầu mỗi ảnh). Tệp có lúc khởi động mà bị xóa thì Next trả 404 vì tệp không còn trên đĩa.
- Node stream byte của tệp, không dùng sendfile của nginx. Ở quy mô hiện tại không đáng kể.
- Chỉ đoạn cuối được kiểm symlink. Nếu chính `public/uploads/weddings` là symlink (ví dụ dời sang ổ khác), route vẫn chạy, đó là chủ ý.

## Evidence

`tests/api/uploads-route.test.ts` (11 test): bảng Content-Type, mọi tên bị từ chối (`..`, `/`, `\`, NUL, tệp ẩn, hai đuôi, `.svg`, `.html`, đuôi viết hoa, tên quá dài); `parseRange`; GET ảnh 200 với header và byte đúng; MP3 `bytes=10-19` trả 206 `bytes 10-19/100`; `bytes=100-` trả 416; nhiều khoảng trả 200 cả tệp; traversal, symlink ra ngoài và vào trong, thư mục, `.html`, tệp thiếu đều 404 `no-store`; HEAD không có body; tệp không đọc được trả 500 kèm correlationId và log `EACCES`.

Smoke test ngày 2026-11-01 với `next build` + `next start` trên cổng 3202, ảnh JPEG, MP3, symlink và tệp `.html` được ghi **sau** khi server khởi động:

| Request                                                                                                                  | Kết quả                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `GET /uploads/weddings/<mới>.jpg`                                                                                        | 200 `image/jpeg`, `public, max-age=31536000, immutable`, `nosniff`, byte trùng tệp trên đĩa |
| `HEAD` cùng URL                                                                                                          | 200, cùng header, không body                                                                |
| `GET /_next/image?url=/uploads/weddings/<mới>.jpg&w=640&q=75`, `Accept: image/webp`                                      | 200 `image/webp` 640×480, `X-Nextjs-Cache: MISS` rồi `HIT`                                  |
| cùng URL, không `Accept`                                                                                                 | 200 `image/jpeg`                                                                            |
| `GET /uploads/weddings/<có lúc boot>.jpg`                                                                                | 200 `image/jpeg`, `public, max-age=0` (Next tự phục vụ)                                     |
| `GET <mới>.mp3`, `Range: bytes=0-9`                                                                                      | 206 `audio/mpeg`, `Content-Range: bytes 0-9/25052`, 10 byte bắt đầu bằng `ID3`              |
| `Range: bytes=-100` / `bytes=25052-`                                                                                     | 206 `bytes 24952-25051/25052` / 416 `bytes */25052`                                         |
| `..%2F..%2F..%2Fpackage.json`, `%2e%2e%2f…`, `..%5c…`, symlink `.webp` → `package.json`, `.html`, đuôi `.JPG`, tệp thiếu | 404 `no-store`                                                                              |
| `/uploads/weddings/../../../package.json` gửi nguyên (`--path-as-is`)                                                    | 404 (Next chuẩn hóa thành `/package.json`, không có tệp đó)                                 |
| `/_next/image` với traversal hoặc symlink                                                                                | 400, không trả nội dung `package.json`                                                      |
| `/_next/static/chunks/<tệp>.js`                                                                                          | 200, `public, max-age=31536000, immutable`                                                  |

## Revisit when

Dời upload ra ngoài `public/` hoặc lên object storage/CDN, cần quy trình gỡ tệp chính thức (xóa luôn biến thể đã tối ưu), hoặc lưu lượng đủ lớn để nginx nên tự phục vụ tệp (khi đó cấp quyền đọc cho nginx và dùng `X-Accel-Redirect`).
