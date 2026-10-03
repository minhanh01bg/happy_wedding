import { z } from "zod";
import { prisma } from "@/server/db/prisma";
const schema = z.object({
  bank: z.string(),
  account: z.string(),
  name: z.string(),
  support: z.string(),
});
export async function merchantSettings() {
  const row = await prisma.setting.findUnique({
    where: { key: "wedding.merchant" },
  });
  return row
    ? schema.parse(JSON.parse(row.value))
    : {
        bank: "",
        account: "",
        name: "",
        support: "Liên hệ quản trị viên để hỗ trợ thanh toán.",
      };
}
