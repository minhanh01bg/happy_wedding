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
