import { PrismaClient } from "@prisma/client";
import { DEMO_CONTENT } from "../src/lib/wedding";

const prisma = new PrismaClient();
const templates = [
  {
    id: "template-rose",
    slug: "loi-yeu",
    name: "Lời yêu",
    category: "Tối giản",
    description: "Một lời mời dịu dàng, trên nền hồng phấn và giấy ngà.",
    palette: "rose",
    layout: "editorial",
    premium: false,
  },
  {
    id: "template-sage",
    slug: "vuon-thuong",
    name: "Vườn thương",
    category: "Hoa lá",
    description: "Sắc xanh thanh mát, những nét hoa và khoảng trời bình yên.",
    palette: "sage",
    layout: "botanical",
    premium: false,
  },
  {
    id: "template-wine",
    slug: "song-hy",
    name: "Song hỷ",
    category: "Truyền thống",
    description: "Đỏ rượu vang, nét chữ trang trọng và niềm vui đoàn viên.",
    palette: "wine",
    layout: "classic",
    premium: false,
  },
  {
    id: "template-sand",
    slug: "ngay-chung-doi",
    name: "Ngày chung đôi",
    category: "Hiện đại",
    description: "Tinh giản, phóng khoáng và đậm dấu ấn riêng của hai bạn.",
    palette: "sand",
    layout: "editorial",
    premium: true,
  },
  {
    id: "template-midnight",
    slug: "dem-sao",
    name: "Đêm sao",
    category: "Hiện đại",
    description: "Xanh đêm và ánh vàng dành cho một buổi tiệc đáng nhớ.",
    palette: "midnight",
    layout: "classic",
    premium: true,
  },
  {
    id: "template-terracotta",
    slug: "nang-thu",
    name: "Nắng thu",
    category: "Hoa lá",
    description: "Sắc đất ấm, đường nét tự nhiên và một chút hoài niệm.",
    palette: "terracotta",
    layout: "botanical",
    premium: true,
  },
  {
    id: "template-minimal-sand",
    slug: "loi-hen",
    name: "Lời hẹn",
    category: "Tối giản",
    description:
      "Bố cục thư mời thoáng, tên hai người ở trung tâm và ảnh ngang bên dưới.",
    palette: "sand",
    layout: "minimal",
    premium: false,
  },
  {
    id: "template-minimal-rose",
    slug: "thu-tinh",
    name: "Thư tình",
    category: "Tối giản",
    description:
      "Tấm thư hồng dịu, không gian rộng và những dòng chữ trang nhã.",
    palette: "rose",
    layout: "minimal",
    premium: true,
  },
  {
    id: "template-cinematic-midnight",
    slug: "khoanh-khac",
    name: "Khoảnh khắc",
    category: "Hiện đại",
    description:
      "Ảnh cưới phủ khung mở đầu, tên hai người nổi bật trong bảng lời mời tối.",
    palette: "midnight",
    layout: "cinematic",
    premium: true,
  },
  {
    id: "template-cinematic-terracotta",
    slug: "ben-nhau",
    name: "Bên nhau",
    category: "Hiện đại",
    description:
      "Ảnh cưới khổ lớn và bảng lời mời ấm áp, dành cho câu chuyện của hai bạn.",
    palette: "terracotta",
    layout: "cinematic",
    premium: false,
  },
];
export async function seed() {
  await prisma.$transaction(
    templates.map((template, sortOrder) =>
      prisma.weddingTemplate.upsert({
        where: { id: template.id },
        create: { ...template, sortOrder },
        update: {},
      }),
    ),
  );
  const plans = [
    {
      id: "plan-essential",
      name: "Khởi đầu",
      description: "Đủ đầy cho một lời mời đẹp.",
      price: 199000,
      months: 12,
      maxPhotos: 12,
      premiumTemplates: false,
      removeBranding: false,
      sortOrder: 0,
    },
    {
      id: "plan-signature",
      name: "Trọn vẹn",
      description: "Thêm dấu ấn riêng cho ngày chung đôi.",
      price: 399000,
      months: 18,
      maxPhotos: 24,
      premiumTemplates: true,
      removeBranding: true,
      sortOrder: 1,
    },
    {
      id: "plan-keepsake",
      name: "Lưu giữ",
      description: "Một kỷ niệm ở lại lâu hơn.",
      price: 699000,
      months: 36,
      maxPhotos: 40,
      premiumTemplates: true,
      removeBranding: true,
      sortOrder: 2,
    },
  ];
  await prisma.$transaction(
    plans.map((plan) =>
      prisma.servicePlan.upsert({
        where: { id: plan.id },
        create: plan,
        update: {},
      }),
    ),
  );
  // Demo identity cannot log in: passwordHash is deliberately not a valid hash.
  const account = await prisma.customerAccount.upsert({
    where: { phoneNormalized: "+84000000000" },
    create: {
      phoneNormalized: "+84000000000",
      displayName: "Cặp đôi minh họa",
      passwordHash: "demo-disabled-login",
    },
    update: {},
  });
  const { events, photos, weddingDate, ...data } = DEMO_CONTENT;
  const invitation = await prisma.invitation.upsert({
    where: { slug: "thiep-mau" },
    create: {
      ...data,
      weddingDate: new Date(weddingDate),
      eventsJson: JSON.stringify(events),
      photosJson: JSON.stringify(photos),
      ownerId: account.id,
      templateId: "template-rose",
      slug: "thiep-mau",
      isDemo: true,
      status: "published",
    },
    update: {},
  });
  await prisma.serviceOrder.upsert({
    where: { clientId: "seed-demo" },
    create: {
      clientId: "seed-demo",
      code: "HYDEMO",
      accountId: account.id,
      invitationId: invitation.id,
      planId: "plan-signature",
      planName: "Dữ liệu minh họa",
      total: 0,
      months: 36,
      maxPhotos: 24,
      premiumTemplates: true,
      removeBranding: false,
      status: "paid",
      paidAt: new Date(),
      expiresAt: new Date("2036-01-01T00:00:00Z"),
    },
    update: {},
  });
  await prisma.setting.upsert({
    where: { key: "wedding.merchant" },
    create: {
      key: "wedding.merchant",
      value: JSON.stringify({
        bank: "",
        account: "",
        name: "",
        support: "Liên hệ quản trị viên để được hỗ trợ thanh toán.",
      }),
    },
    update: {},
  });
}
seed().finally(() => prisma.$disconnect());
