import { getPublicAppName } from "@/lib/app";
import { getDictionary } from "@/lib/i18n";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  const t = getDictionary("sl");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <ForgotPasswordForm labels={t.auth} appName={getPublicAppName()} />
    </main>
  );
}
