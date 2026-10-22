import { describe, expect, it } from "vitest";

import { buildCspHeader, parseCspDirectives } from "@/server/security/csp";

describe("buildCspHeader", () => {
  it("only allows same-origin scripts and connections in production", () => {
    const { headerValue } = buildCspHeader({
      isDev: false,
      mode: "enforce",
      extraImageOrigins: ["https://img.vietqr.io"],
    });
    const directives = parseCspDirectives(headerValue);
    expect(directives["script-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directives["connect-src"]).toEqual(["'self'"]);
    expect(directives["img-src"]).toContain("https://img.vietqr.io");
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("drops unsafe-inline scripts when a nonce is supplied", () => {
    const directives = parseCspDirectives(
      buildCspHeader({ isDev: false, mode: "enforce", nonce: "abc" })
        .headerValue,
    );
    expect(directives["script-src"]).toEqual(["'self'", "'nonce-abc'"]);
  });

  it("adds the Sentry origin to connect-src only when configured", () => {
    const directives = parseCspDirectives(
      buildCspHeader({
        isDev: false,
        mode: "report-only",
        sentryDsn: "https://key@o1.ingest.sentry.io/2",
      }).headerValue,
    );
    expect(directives["connect-src"]).toEqual([
      "'self'",
      "https://o1.ingest.sentry.io",
    ]);
  });
});
