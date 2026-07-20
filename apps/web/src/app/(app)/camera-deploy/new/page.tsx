import Link from "next/link";
import { buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { CameraDeploySessionForm } from "@/components/camera-deploy/session-form";

export const dynamic = "force-dynamic";

export default async function NewCameraDeployPage() {
  const session = await requireOrgSession("camera_deploy:write");
  if (!hasPermission(session.role, "camera_deploy:write")) {
    return <p className="text-sm text-muted-foreground">Nimate pravic.</p>;
  }

  const [customers, sites] = await Promise.all([listCustomers(), listSites()]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Nova seja CameraDeploy</h1>
        <Link href="/camera-deploy" className={cn(buttonVariants({ variant: "outline" }))}>
          Nazaj
        </Link>
      </div>
      <CameraDeploySessionForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        sites={sites.map((s) => ({
          id: s.site.id,
          name: s.site.name,
          customerId: s.site.customerId,
        }))}
      />
    </div>
  );
}
