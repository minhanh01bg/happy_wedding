import { NextResponse, type NextRequest } from "next/server";

import { logger } from "@/lib/logger";
import { readJsonBody } from "@/server/http/read-json-body";
import { sanitizeCspReport } from "@/server/security/csp";
import { mutationLimit } from "@/server/wedding/guards";

export const dynamic = "force-dynamic";

const REPORT_CONTENT_TYPES = [
  "application/csp-report",
  "application/reports+json",
  "application/json",
];
const MAX_REPORT_BYTES = 8_000;
const MAX_FIELD_LENGTH = 300;

function clip(value: unknown): string | undefined {
  return typeof value === "string"
    ? value.slice(0, MAX_FIELD_LENGTH)
    : undefined;
}

export async function POST(request: NextRequest) {
  const noContent = new NextResponse(null, { status: 204 });
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase();
    const requiredContentType = REPORT_CONTENT_TYPES.find((type) =>
      contentType?.includes(type),
    );
    if (!requiredContentType) return noContent;
    await mutationLimit(request, "csp-report");
    const body = await readJsonBody(request, {
      maxBytes: MAX_REPORT_BYTES,
      requiredContentType,
    });
    if (!body.ok) return noContent;
    const sanitized = sanitizeCspReport(body.data);

    const disposition = clip(sanitized["disposition"]);
    const isEnforce =
      disposition === "enforce" ||
      (!disposition && process.env.CSP_MODE === "enforce");

    const payload = {
      category: "csp.violation",
      directive:
        clip(sanitized["violated-directive"]) ||
        clip(sanitized["effective-directive"]),
      blockedUri: clip(sanitized["blocked-uri"]),
      documentUri: clip(sanitized["document-uri"]),
      disposition: disposition || (isEnforce ? "enforce" : "report"),
    };

    if (isEnforce) {
      logger.warn("CSP Violation reported", payload);
    } else {
      logger.info("CSP Violation reported", payload);
    }

    return noContent;
  } catch {
    // Reports are best-effort; rate-limited or malformed reports are dropped.
    return noContent;
  }
}
