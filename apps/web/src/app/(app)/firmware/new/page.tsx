import Link from "next/link";
import { buttonVariants, cn } from "@securitydesk/ui";
import { requireOrgSession } from "@/lib/org-context";
import { hasPermission } from "@securitydesk/shared";
import { FirmwareAdvisoryForm } from "@/components/firmware/advisory-form";

export const dynamic = "force-dynamic";

export default async function NewFirmwareAdvisoryPage() {
  const session = await requireOrgSession("firmware:write");
  if (!hasPermission(session.role, "firmware:write")) {
    return <p className="text-sm text-muted-foreground">Nimate pravic.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Nov firmware advisory</h1>
        <Link href="/firmware" className={cn(buttonVariants({ variant: "outline" }))}>
          Nazaj
        </Link>
      </div>
      <FirmwareAdvisoryForm />
    </div>
  );
}
