import { describe, expect, it } from "vitest";
import { DEMO_CONTENT, invitationSchema } from "@/lib/wedding";
import { WEDDING_MUSIC } from "@/lib/wedding-music";

const content = { ...DEMO_CONTENT, templateId: "template", slug: "loi-hen" };
describe("invitation music sources", () => {
  it("accepts the bundled track, silence and an existing HTTPS audio URL", () => {
    for (const musicUrl of [
      WEDDING_MUSIC.url,
      "",
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
    ]) {
      expect(invitationSchema.safeParse({ ...content, musicUrl }).success).toBe(
        false,
      );
    }
  });
});
