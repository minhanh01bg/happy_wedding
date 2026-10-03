import { AuthPage } from "@/components/wedding/auth-page";
export const metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false },
};
export default function Login() {
  return <AuthPage mode="admin" />;
}
