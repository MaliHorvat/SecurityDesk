import { getPublicAppName } from "@/lib/app";
import { getDictionary } from "@/lib/i18n";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const t = getDictionary("sl");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginForm labels={t.auth} appName={getPublicAppName()} />
    </main>
  );
}
