import { AuthPage } from "@/components/wedding/auth-page";
import { safeNext } from "@/lib/auth-next";
export const metadata = { title: "Đăng nhập", robots: { index: false } };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AuthPage mode="login" next={safeNext((await searchParams).next)} />;
}
