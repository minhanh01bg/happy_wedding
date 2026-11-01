export const WEDDING_MUSIC = {
  url: "/audio/loi-hen.mp3",
  title: "Lời hẹn — piano không lời",
} as const;

/**
 * Bài MP3 chủ thiệp tải lên: đúng tên `<uuid>.mp3` do server đặt, không nhận
 * đường dẫn local nào khác (ADR 0010).
 */
const UPLOADED_MUSIC_URL =
  /^\/uploads\/weddings\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp3$/;

export function isUploadedMusicUrl(url: string) {
  return UPLOADED_MUSIC_URL.test(url);
}

// Layer III: kbps theo chỉ số bitrate 1–14, Hz theo chỉ số tần số mẫu 0–2.
const MPEG1_KBPS = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const MPEG2_KBPS = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];
// Theo 2 bit phiên bản: 0 MPEG-2.5, 1 không dùng, 2 MPEG-2, 3 MPEG-1.
const SAMPLE_RATES = [
  [11025, 12000, 8000],
  [],
  [22050, 24000, 16000],
  [44100, 48000, 32000],
];

/** Độ dài frame MPEG Layer III có header 4 byte tại `at`; 0 nếu không phải header hợp lệ. */
function layer3FrameBytes(bytes: Uint8Array, at: number) {
  if (at + 4 > bytes.length) return 0;
  const [b0, b1, b2, b3] = bytes.subarray(at, at + 4);
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return 0; // 11 bit frame sync
  const version = (b1 >> 3) & 3;
  const layer = (b1 >> 1) & 3; // 1 là Layer III
  const bitrate = b2 >> 4; // 0 là free format, 15 không hợp lệ
  const rate = (b2 >> 2) & 3; // 3 không dùng
  const emphasis = b3 & 3; // 2 không dùng
  if (version === 1 || layer !== 1 || bitrate === 0 || bitrate === 15) return 0;
  if (rate === 3 || emphasis === 2) return 0;
  const mpeg1 = version === 3;
  const bitsPerSecond = (mpeg1 ? MPEG1_KBPS : MPEG2_KBPS)[bitrate] * 1000;
  const padding = (b2 >> 1) & 1;
  return (
    Math.floor(
      ((mpeg1 ? 144 : 72) * bitsPerSecond) / SAMPLE_RATES[version][rate],
    ) + padding
  );
}

/** Frame tại `at` hợp lệ, và nếu tệp còn chỗ thì frame kế tiếp bắt đầu đúng sau nó. */
function layer3FrameAt(bytes: Uint8Array, at: number) {
  const length = layer3FrameBytes(bytes, at);
  if (!length) return false;
  const next = at + length;
  return next + 4 > bytes.length || layer3FrameBytes(bytes, next) > 0;
}

/**
 * Sau thẻ ID3 có thể có byte đệm ngoài kích thước khai báo; chỉ dò frame đầu
 * trong khoảng này, không dò khắp tệp.
 */
const AFTER_ID3_SEARCH_BYTES = 4096;

/**
 * Kiểm tra MP3 theo byte, không theo Content-Type hay đuôi tệp: thẻ ID3v2 rồi
 * frame MPEG Layer III, hoặc frame Layer III ngay đầu tệp (ADR 0010).
 */
export function isMp3(bytes: Uint8Array) {
  // "ID3" + phiên bản 2–4 + cờ + kích thước syncsafe 4 byte (mỗi byte < 0x80).
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  if (!id3) return layer3FrameAt(bytes, 0);
  if (bytes.length < 10 || bytes[3] < 2 || bytes[3] > 4) return false;
  const size = bytes.subarray(6, 10);
  if (size.some((byte) => byte >= 0x80)) return false;
  const footer = bytes[3] === 4 && bytes[5] & 0x10 ? 10 : 0;
  const start =
    10 +
    ((size[0] << 21) | (size[1] << 14) | (size[2] << 7) | size[3]) +
    footer;
  const end = Math.min(bytes.length, start + AFTER_ID3_SEARCH_BYTES);
  for (let at = start; at < end; at++)
    if (layer3FrameAt(bytes, at)) return true;
  return false;
}
