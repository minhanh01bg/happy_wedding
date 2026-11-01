/**
 * Giới hạn ảnh tải lên, dùng chung cho route upload và kiểm tra trước ở editor.
 * Đủ cho ảnh gốc máy ảnh (khoảng 5464×8192, 5–30 MB) mà không cần thu nhỏ.
 */
export const MAX_UPLOAD_IMAGE_MB = 40;
export const MAX_UPLOAD_IMAGE_BYTES = MAX_UPLOAD_IMAGE_MB * 1024 * 1024;
export const UPLOAD_IMAGE_TOO_LARGE = `Ảnh tối đa ${MAX_UPLOAD_IMAGE_MB} MB`;

/** Trần decode của Sharp; ảnh 5464×8192 là khoảng 44,8 megapixel. */
export const MAX_UPLOAD_IMAGE_PIXELS = 64_000_000;
/** WebP không lưu được cạnh dài hơn 16383 px. */
export const MAX_UPLOAD_IMAGE_SIDE = 16_383;
export const UPLOAD_IMAGE_SIDE_TOO_LARGE =
  "Ảnh có cạnh dài hơn 16.383 px. Vui lòng chọn ảnh nhỏ hơn";
export const UPLOAD_IMAGE_TYPE_INVALID = "Chỉ nhận ảnh JPEG, PNG hoặc WebP";
export const UPLOAD_SERVER_BUSY = "Máy chủ đang bận, vui lòng thử lại sau";
export const UPLOAD_IMAGE_INVALID = "Tệp ảnh không hợp lệ hoặc quá lớn";

/**
 * Nhạc nền chủ thiệp tải lên (ADR 0010). Bài khoảng 6 phút ở 320 kbps vẫn dưới
 * 15 MB. Định dạng kiểm theo byte bằng `isMp3` trong `wedding-music.ts`.
 */
export const MAX_UPLOAD_MUSIC_MB = 15;
export const MAX_UPLOAD_MUSIC_BYTES = MAX_UPLOAD_MUSIC_MB * 1024 * 1024;
export const UPLOAD_MUSIC_TOO_LARGE = `Tệp nhạc tối đa ${MAX_UPLOAD_MUSIC_MB} MB`;
export const UPLOAD_MUSIC_TYPE_INVALID =
  "Tệp không phải MP3 hợp lệ. Vui lòng chọn tệp nhạc MP3";

/**
 * Trần bộ nhớ giải nén, tính từ header trước khi decode. RAM lúc mã hóa tăng
 * theo khung ảnh chứ không theo cỡ file: PNG RGBA 16-bit 32 megapixel chỉ
 * 8,5 MB nhưng cần khoảng 950 MB. RGB 8-bit tới 64 megapixel (192 MB) vẫn lọt;
 * ảnh có alpha chỉ lọt tới khoảng 26,2 megapixel (xem `decodeCostBytes`).
 */
export const MAX_UPLOAD_DECODE_BYTES = 200 * 1024 * 1024;
export const UPLOAD_IMAGE_DECODE_TOO_LARGE =
  "Ảnh quá lớn để xử lý, vui lòng dùng ảnh JPEG 8-bit";

/** Byte mỗi mẫu theo kiểu `depth` của libvips; không rõ thì tính 2. */
const SAMPLE_BYTES: Record<string, number> = {
  uchar: 1,
  char: 1,
  ushort: 2,
  short: 2,
  uint: 4,
  int: 4,
  float: 4,
  complex: 8,
  double: 8,
  dpcomplex: 16,
};

/**
 * width × height × channels × byte mỗi mẫu, từ `metadata()` của Sharp. Ảnh có
 * alpha tính như RGBA 16-bit (8 byte/điểm ảnh) dù là 8-bit: WebP nén kênh alpha
 * tốn RAM theo số điểm ảnh, đo PNG RGBA 8-bit 52 megapixel cần 1,26 GB.
 */
export function decodeCostBytes(image: {
  width?: number;
  height?: number;
  channels?: number;
  depth?: string;
  hasAlpha?: boolean;
}) {
  const pixelBytes =
    (image.channels ?? 4) * (SAMPLE_BYTES[image.depth ?? ""] ?? 2);
  return (
    (image.width ?? 0) *
    (image.height ?? 0) *
    Math.max(pixelBytes, image.hasAlpha ? 8 : 0)
  );
}
