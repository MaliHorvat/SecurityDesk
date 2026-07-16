import { getPublicAppName } from "@/lib/app";
import { getDictionary } from "@/lib/i18n";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  const t = getDictionary("sl");
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <OnboardingForm labels={t.auth} appName={getPublicAppName()} />
    </main>
  );
}
