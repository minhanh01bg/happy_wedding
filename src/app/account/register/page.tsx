import { AuthPage } from "@/components/wedding/auth-page";
import { safeNext } from "@/lib/auth-next";
export const metadata = { title: "Tạo tài khoản", robots: { index: false } };
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <AuthPage mode="register" next={safeNext((await searchParams).next)} />
  );
}
