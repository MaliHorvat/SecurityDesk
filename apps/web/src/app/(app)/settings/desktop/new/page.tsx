import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { buttonVariants, cn } from "@securitydesk/ui";
import { requireOrgSession } from "@/lib/org-context";
import { DesktopReleaseForm } from "@/components/desktop/release-form";

export const dynamic = "force-dynamic";

export default async function NewDesktopReleasePage() {
  try {
    await requireOrgSession("desktop_releases:write");
  } catch (error) {
    unstable_rethrow(error);
    redirect("/settings");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Nova izdaja</h1>
        <Link href="/settings/desktop" className={cn(buttonVariants({ variant: "outline" }))}>
          Nazaj
        </Link>
      </div>
      <DesktopReleaseForm />
    </div>
  );
}
