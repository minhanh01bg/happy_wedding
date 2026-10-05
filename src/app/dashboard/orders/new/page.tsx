import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireCustomerSession } from "@/server/customer-auth/session";
import {
  PlanComparison,
  SharedPlanBenefits,
} from "@/components/wedding/plan-comparison";
import { Checkout } from "@/components/wedding/checkout";
export default async function NewOrder({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string; plan?: string }>;
}) {
  const session = await requireCustomerSession();
  const query = await searchParams;
  if (!query.invitation)
    return (
      <div className="empty-state">
        <h2>Tạo thiệp trước khi mua gói.</h2>
        <p>Mỗi đơn dịch vụ được gắn với một thiệp cụ thể.</p>
        <Link className="button" href="/dashboard/new">
          Tạo thiệp mới
        </Link>
      </div>
    );
  const invitation = await prisma.invitation.findFirst({
    where: { id: query.invitation, ownerId: session.accountId },
  });
  if (!invitation) notFound();
  const plans = await prisma.servicePlan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">SẴN SÀNG GỬI ĐI HẠNH PHÚC</p>
          <h1>Một gói cho ngày chung đôi.</h1>
          <p>
            {invitation.groom} & {invitation.bride}
          </p>
        </div>
        <Link
          className="button secondary small"
          href={`/dashboard/${invitation.id}`}
        >
          ← Về thiệp
        </Link>
      </div>
      <div className="panel">
        <Checkout
          invitationId={invitation.id}
          plans={plans}
          initialPlan={query.plan}
        />
      </div>
      <SharedPlanBenefits />
      <PlanComparison plans={plans} />
    </>
  );
}
