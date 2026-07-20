import { redirect } from "next/navigation";
import { getPublicAppName } from "@/lib/app";
import { getDictionary } from "@/lib/i18n";
import { getAppSession } from "@/lib/session";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default async function OnboardingPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/login?next=/onboarding");
  }
  // Org already restored from memberships — skip creating a duplicate.
  if (session.organization) {
    redirect("/dashboard");
  }

  const t = getDictionary("sl");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <OnboardingForm labels={t.auth} appName={getPublicAppName()} />
    </main>
  );
}
