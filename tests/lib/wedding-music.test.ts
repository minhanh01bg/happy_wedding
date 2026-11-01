import { describe, expect, it } from "vitest";
import { DEMO_CONTENT, invitationSchema } from "@/lib/wedding";
import { WEDDING_MUSIC, isMp3, isUploadedMusicUrl } from "@/lib/wedding-music";
import {
  fakeMp3,
  frames,
  id3Tag,
  MPEG1_128K_HEADER,
  PNG_BYTES,
} from "./wedding-music-fake";

const content = { ...DEMO_CONTENT, templateId: "template", slug: "loi-hen" };
const UPLOADED = "/uploads/weddings/3f2c9a7e-5b1d-4c8e-9a0f-1b2c3d4e5f60.mp3";

describe("invitation music sources", () => {
  it("accepts the bundled track, silence, an uploaded MP3 and an existing HTTPS audio URL", () => {
    for (const musicUrl of [
      WEDDING_MUSIC.url,
      "",
      UPLOADED,
      "https://example.com/song.mp3",
    ]) {
      expect(invitationSchema.safeParse({ ...content, musicUrl }).success).toBe(
        true,
      );
    }
  });
  it("does not expand the local audio allowlist to arbitrary or traversal paths", () => {
    for (const musicUrl of [
      "/audio/other.mp3",
      "/audio/../secret.mp3",
      "http://example.com/song.mp3",
      "javascript:alert(1)",
      "https://192.168.1.1/song.mp3",
      "https://localhost/song.mp3",
      "https://[::1]/song.mp3",
      // Upload path: only the exact server-made <uuid>.mp3 name.
      "/uploads/weddings/song.mp3",
      "/uploads/weddings/abc-123.mp3",
      "/uploads/weddings/../../.env",
      "/uploads/weddings/../3f2c9a7e-5b1d-4c8e-9a0f-1b2c3d4e5f60.mp3",
      "/uploads/weddings/3f2c9a7e-5b1d-4c8e-9a0f-1b2c3d4e5f60.webp",
      "/uploads/weddings/3F2C9A7E-5B1D-4C8E-9A0F-1B2C3D4E5F60.mp3",
      `${UPLOADED}?v=1`,
      `${UPLOADED}/../x.mp3`,
      `/uploads/other/3f2c9a7e-5b1d-4c8e-9a0f-1b2c3d4e5f60.mp3`,
      `//evil.example${UPLOADED}`,
      `https://example.com${UPLOADED}x`,
    ]) {
      expect(
        invitationSchema.safeParse({ ...content, musicUrl }).success,
        musicUrl,
      ).toBe(false);
    }
  });
  it("names only the server-made upload path as uploaded music", () => {
    expect(isUploadedMusicUrl(UPLOADED)).toBe(true);
    expect(isUploadedMusicUrl(WEDDING_MUSIC.url)).toBe(false);
    expect(isUploadedMusicUrl("https://example.com/song.mp3")).toBe(false);
  });
});

describe("isMp3 reads the bytes, not the name", () => {
  it("accepts an ID3 tag followed by Layer III frames", () => {
    expect(isMp3(fakeMp3())).toBe(true);
  });
  it("accepts Layer III frames at the very start", () => {
    expect(isMp3(fakeMp3({ id3: false }))).toBe(true);
    // A file cut off inside its second frame still starts with a valid one.
    expect(isMp3(frames(2).subarray(0, 500))).toBe(true);
  });
  it("accepts MPEG-2 Layer III and zero padding after the ID3 tag", () => {
    // MPEG-2, Layer III, 64 kbps, 22.05 kHz: 72 × 64000 / 22050 = 208 bytes.
    const frame = Buffer.alloc(208);
    frame.set([0xff, 0xf3, 0x80, 0x00]);
    expect(isMp3(Buffer.concat([frame, frame]))).toBe(true);
    expect(isMp3(Buffer.concat([id3Tag(), Buffer.alloc(300), frames(2)]))).toBe(
      true,
    );
  });
  it("rejects PNG, text, HTML and empty files", () => {
    for (const bytes of [
      PNG_BYTES,
      Buffer.from("Không phải nhạc, chỉ là văn bản.\n"),
      Buffer.from("<!doctype html><script>alert(1)</script>"),
      Buffer.alloc(0),
    ]) {
      expect(isMp3(bytes)).toBe(false);
    }
  });
  it("rejects an ID3 tag with no audio frame behind it", () => {
    expect(isMp3(Buffer.concat([id3Tag(), PNG_BYTES]))).toBe(false);
    expect(isMp3(id3Tag())).toBe(false);
    // Declared tag size runs past the end of the file.
    expect(
      isMp3(Buffer.concat([id3Tag("Bai hat thu", 50_000), frames(2)])),
    ).toBe(false);
    // Size bytes must be syncsafe (high bit clear).
    const bad = fakeMp3();
    bad[6] = 0x80;
    expect(isMp3(bad)).toBe(false);
  });
  it("rejects headers that are not a valid Layer III frame", () => {
    const [, b1, b2, b3] = MPEG1_128K_HEADER;
    for (const header of [
      [0xff, 0xfd, b2, b3], // Layer II
      [0xff, 0xeb, b2, b3], // reserved MPEG version (01)
      [0xff, b1, 0x00 | (b2 & 0x0f), b3], // free-format bitrate
      [0xff, b1, 0xf0 | (b2 & 0x0f), b3], // bad bitrate index
      [0xff, b1, b2 | 0x0c, b3], // reserved sample rate
      [0xff, b1, b2, 0x02], // reserved emphasis
    ]) {
      expect(isMp3(frames(3, header)), header.join(",")).toBe(false);
    }
  });
  it("requires the second frame to start where the first one ends", () => {
    const broken = frames(3);
    broken[417] = 0x00;
    expect(isMp3(broken)).toBe(false);
  });
});
