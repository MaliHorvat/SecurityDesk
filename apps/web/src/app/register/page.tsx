import { getPublicAppName } from "@/lib/app";
import { getDictionary } from "@/lib/i18n";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const t = getDictionary("sl");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <RegisterForm labels={t.auth} appName={getPublicAppName()} />
    </main>
  );
}
