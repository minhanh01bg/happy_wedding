import { describe, expect, it } from "vitest";
import { DEMO_CONTENT, invitationSchema } from "@/lib/wedding";

/** Dữ liệu giả: không dùng tên cặp đôi thật. */
const base = () => ({
  ...DEMO_CONTENT,
  templateId: "template-1",
  slug: "minh-hoa",
});

function parse(madeBy: unknown) {
  return invitationSchema.safeParse({ ...base(), madeBy });
}

describe("invitationSchema.madeBy (người làm thiệp)", () => {
  it("is optional: leaving it out stays undefined so the stored value is kept", () => {
    const input: Record<string, unknown> = base();
    delete input.madeBy;
    const parsed = invitationSchema.parse(input);
    expect(parsed).not.toHaveProperty("madeBy");
  });

  it("trims the credit and keeps Vietnamese text as typed", () => {
    expect(parse("  em họ cô dâu  ")).toMatchObject({
      success: true,
      data: { madeBy: "em họ cô dâu" },
    });
  });

  it("accepts an empty or blank value as a clear", () => {
    expect(parse("")).toMatchObject({ success: true, data: { madeBy: "" } });
    expect(parse("   ")).toMatchObject({ success: true, data: { madeBy: "" } });
  });

  it("allows 60 characters after trimming and rejects 61", () => {
    expect(parse(` ${"a".repeat(60)} `).success).toBe(true);
    const tooLong = parse("a".repeat(61));
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]).toMatchObject({
      path: ["madeBy"],
      message: "Người làm thiệp tối đa 60 ký tự",
    });
  });

  it.each([
    ["a newline", "bạn thân\nchú rể"],
    ["a carriage return", "bạn thân\r chú rể"],
    ["a tab", "bạn\tthân"],
    ["a NUL", "bạn\u0000thân"],
    ["a bell", "bạn\u0007thân"],
    ["a C1 control", "bạn\u0085thân"],
    ["a line separator", "bạn thân"],
    ["a paragraph separator", "bạn thân"],
  ])("rejects %s inside the credit", (_label, value) => {
    const result = parse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["madeBy"],
      message: "Người làm thiệp chỉ gồm một dòng chữ, không xuống dòng",
    });
  });

  it("rejects a non-string value", () => {
    expect(parse(42).success).toBe(false);
    expect(parse(null).success).toBe(false);
  });
});
