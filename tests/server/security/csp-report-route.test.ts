import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const logged = vi.hoisted(() => [] as unknown[]);
vi.mock("@/lib/logger", () => ({
  logger: {
    info: (_message: string, payload: unknown) => logged.push(payload),
    warn: (_message: string, payload: unknown) => logged.push(payload),
  },
}));

import { POST } from "@/app/api/csp-report/route";

function report(body: string, contentType = "application/csp-report") {
  return new Request("http://127.0.0.1:3200/api/csp-report", {
    method: "POST",
    headers: { "content-type": contentType, "x-real-ip": "127.0.0.1" },
    body,
  }) as unknown as NextRequest;
}

describe("POST /api/csp-report", () => {
  beforeEach(() => {
    logged.length = 0;
  });

  it("ghi log báo cáo hợp lệ với trường đã cắt ngắn", async () => {
    const response = await POST(
      report(
        JSON.stringify({
          "csp-report": {
            "violated-directive": "script-src " + "x".repeat(5_000),
            "blocked-uri": "https://evil.test/a.js?token=secret",
            "document-uri": "https://site.test/w/demo",
          },
        }),
      ),
    );
    expect(response.status).toBe(204);
    expect(logged).toHaveLength(1);
    const payload = logged[0] as Record<string, string>;
    expect(payload.directive.length).toBeLessThanOrEqual(300);
    expect(payload.blockedUri).not.toContain("secret");
  });

  it("bỏ qua body vượt giới hạn mà không ghi log", async () => {
    const response = await POST(
      report(JSON.stringify({ "csp-report": { x: "y".repeat(20_000) } })),
    );
    expect(response.status).toBe(204);
    expect(logged).toHaveLength(0);
  });

  it("bỏ qua content-type không phải báo cáo CSP", async () => {
    const response = await POST(report("{}", "text/plain"));
    expect(response.status).toBe(204);
    expect(logged).toHaveLength(0);
  });

  it("giới hạn tần suất theo IP", async () => {
    const body = JSON.stringify({ "csp-report": { "blocked-uri": "inline" } });
    for (let i = 0; i < 80; i++) await POST(report(body));
    expect(logged.length).toBeGreaterThan(0);
    expect(logged.length).toBeLessThan(80);
  });
});
