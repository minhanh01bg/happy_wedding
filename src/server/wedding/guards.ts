import { getOptionalCustomerSession } from "@/server/customer-auth/session";
import { getAdminPrincipal } from "@/server/auth/require-admin-session";
import { hasSafeMutationOrigin } from "@/server/http/origin";
import { resolveTrustedClientIp } from "@/server/http/client-ip";
import { createRateLimiter } from "@/server/security/rate-limit";
import { WeddingError } from "./service";

export async function customer() {
  const session = await getOptionalCustomerSession();
  if (!session)
    throw new WeddingError(401, "Vui lòng đăng nhập tài khoản khách hàng");
  return session;
}
export async function admin(request: Request) {
  const principal = await getAdminPrincipal(request);
  if (!principal) throw new WeddingError(401, "Vui lòng đăng nhập quản trị");
  if (!["owner", "manager"].includes(principal.role))
    throw new WeddingError(403, "Không đủ quyền quản trị");
  return principal;
}
export function safeOrigin(request: Request) {
  if (!hasSafeMutationOrigin(request))
    throw new WeddingError(403, "Yêu cầu từ nguồn không tin cậy");
}
const limiter = createRateLimiter();
export async function mutationLimit(
  request: Request,
  scope: string,
  identifier?: string,
) {
  const ip = resolveTrustedClientIp(request);
  if (!ip.ok) throw new WeddingError(503, "Dịch vụ tạm thời không khả dụng");
  const decision = await limiter.check(
    {
      name: `wedding-${scope}`,
      failClosed: true,
      timeoutMs: 1500,
      buckets: [
        {
          name: "ip-burst",
          limit: scope === "rsvp" ? 20 : 60,
          windowSeconds: 60,
        },
        {
          name: "account-hour",
          limit: scope === "upload" ? 60 : 400,
          windowSeconds: 3600,
        },
      ],
    },
    [
      { bucketName: "ip-burst", dimension: "ip", identifier: ip.ip },
      {
        bucketName: "account-hour",
        dimension: "session",
        identifier: identifier || ip.ip,
      },
    ],
  );
  if (!decision.allowed)
    throw new WeddingError(
      decision.reason === "limiter_unavailable" ? 503 : 429,
      "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    );
}
