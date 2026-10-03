import { redirect } from "next/navigation";
import { getOptionalCustomerSession } from "@/server/customer-auth/session";
import { prisma } from "@/server/db/prisma";
import { DEMO_CONTENT } from "@/lib/wedding";
import { InvitationEditor } from "@/components/wedding/invitation-editor";
export default async function New({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; plan?: string }>;
}) {
  const [query, session] = await Promise.all([
    searchParams,
    getOptionalCustomerSession(),
  ]);
  const suffix = new URLSearchParams();
  if (query.template) suffix.set("template", query.template);
  if (query.plan) suffix.set("plan", query.plan);
  if (!session)
    redirect(
      `/account/login?next=${encodeURIComponent(`/dashboard/new?${suffix}`)}`,
    );
  const templates = await prisma.weddingTemplate.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!templates.length)
    return (
      <div className="notice">
        Chưa có mẫu thiệp đang được cung cấp. Vui lòng liên hệ quản trị viên.
      </div>
    );
  const template =
    templates.find((t) => t.id === query.template) || templates[0];
  return (
    <>
      <div className="workspace-title">
        <div>
          <p className="eyebrow">LỜI MỜI ĐẦU TIÊN</p>
          <h1>Viết chuyện của hai bạn.</h1>
          <p>
            Thông tin dưới đây là minh họa. Hãy thay bằng thông tin ngày cưới
            của bạn.
          </p>
        </div>
      </div>
      <InvitationEditor
        initial={{ ...DEMO_CONTENT, templateId: template.id, slug: "" }}
        templates={templates}
        selectedPlan={query.plan}
      />
    </>
  );
}
