/**
 * Tiny fake MP3s built in memory: an ID3v2.4 tag with a made-up title and
 * frames of silence-shaped zeros behind real Layer III headers. No real song.
 */

/** MPEG-1 Layer III, no CRC, 128 kbps, 44.1 kHz: 144 × 128000 / 44100 = 417 bytes. */
export const MPEG1_128K_HEADER = [0xff, 0xfb, 0x90, 0x00];
export const MPEG1_128K_FRAME_BYTES = 417;

export function frames(count: number, header = MPEG1_128K_HEADER) {
  const frame = Buffer.alloc(MPEG1_128K_FRAME_BYTES);
  frame.set(header);
  return Buffer.concat(Array.from({ length: count }, () => frame));
}

/** ID3v2.4 tag holding one TIT2 (title) frame; `size` overrides the declared body size. */
export function id3Tag(title = "Bai hat thu", size?: number) {
  const text = Buffer.from(`\u0003${title}`, "utf8");
  const frame = Buffer.alloc(10 + text.length);
  frame.write("TIT2", 0, "latin1");
  frame.writeUInt32BE(text.length, 4); // small enough to equal its syncsafe form
  text.copy(frame, 10);
  const body = size ?? frame.length;
  const header = Buffer.from([
    0x49,
    0x44,
    0x33,
    4,
    0,
    0,
    (body >> 21) & 0x7f,
    (body >> 14) & 0x7f,
    (body >> 7) & 0x7f,
    body & 0x7f,
  ]);
  return Buffer.concat([header, frame]);
}

/** A valid fake MP3: ID3 tag (unless `id3: false`) then `count` frames. */
export function fakeMp3({ id3 = true, count = 4 } = {}) {
  return Buffer.concat([id3 ? id3Tag() : Buffer.alloc(0), frames(count)]);
}

export const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);
