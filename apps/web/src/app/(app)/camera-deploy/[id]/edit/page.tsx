import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getCameraDeploySession } from "@/server/camera-deploy";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { CameraDeploySessionForm } from "@/components/camera-deploy/session-form";

export const dynamic = "force-dynamic";

export default async function EditCameraDeployPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession("camera_deploy:write");
  if (!hasPermission(session.role, "camera_deploy:write")) {
    return <p className="text-sm text-muted-foreground">Nimate pravic.</p>;
  }

  const { id } = await params;
  const [data, customers, sites] = await Promise.all([
    getCameraDeploySession(id),
    listCustomers(),
    listSites(),
  ]);
  if (!data) notFound();

  const { session: deploySession } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Uredi sejo</h1>
        <Link href={`/camera-deploy/${id}`} className={cn(buttonVariants({ variant: "outline" }))}>
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
        initial={{
          id: deploySession.id,
          title: deploySession.title,
          customerId: deploySession.customerId ?? "",
          siteId: deploySession.siteId,
          description: deploySession.description ?? "",
          status: deploySession.status,
          ipRangeStart: deploySession.ipRangeStart ?? "",
          ipRangeEnd: deploySession.ipRangeEnd ?? "",
          subnetMask: deploySession.subnetMask ?? "",
          gateway: deploySession.gateway ?? "",
          dnsServers: deploySession.dnsServers ?? "",
          defaultUsername: deploySession.defaultUsername ?? "",
          defaultPassword: "",
          vlanId: deploySession.vlanId,
        }}
      />
    </div>
  );
}
