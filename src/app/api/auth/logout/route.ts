import { NextResponse } from "next/server";

import {
  adminCookieOptionsForRequest,
  revokeAdminSession,
  SESSION_COOKIE,
} from "@/server/auth/session";
import { hasSafeMutationOrigin } from "@/server/http/origin";

export const dynamic = "force-dynamic";

function readCookie(cookieHeader: string | null, name: string): string | null {
  const encoded = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!hasSafeMutationOrigin(request)) {
    return NextResponse.json(
      { message: "Yêu cầu từ nguồn không tin cậy" },
      {
        status: 403,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (token) {
    await revokeAdminSession(token);
  }

  const response = NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    },
  );

  response.cookies.set(SESSION_COOKIE, "", {
    ...adminCookieOptionsForRequest(request),
    maxAge: 0,
  });

  return response;
}
