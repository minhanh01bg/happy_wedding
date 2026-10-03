import type { Metadata } from "next";

import { CustomerAuthForm } from "@/features/customer-account/auth-form";
import { CustomerAuthShell } from "@/features/customer-account/auth-shell";
import { getStoreName } from "@/server/settings/store-settings";

export const metadata: Metadata = {
  title: "Tạo tài khoản",
  robots: { index: false, follow: false },
};

export default async function CustomerRegisterPage() {
  const storeName = await getStoreName();
  return (
    <CustomerAuthShell storeName={storeName} mode="register">
      <CustomerAuthForm mode="register" />
    </CustomerAuthShell>
  );
}
