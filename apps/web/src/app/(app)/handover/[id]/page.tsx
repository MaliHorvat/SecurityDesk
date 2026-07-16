import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission, HANDOVER_STATUS_LABELS } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getHandoverPackage } from "@/server/handover";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { HandoverForm } from "@/components/handover/handover-form";
import { HandoverDetailActions } from "@/components/handover/handover-detail-actions";

export const dynamic = "force-dynamic";

export default async function HandoverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession("handover:read");
  const { id } = await params;
  const [data, customers, sites] = await Promise.all([
    getHandoverPackage(id),
    listCustomers(),
    listSites(),
  ]);
  if (!data) notFound();

  const canWrite = hasPermission(session.role, "handover:write");
  const { package: pkg, customerName, siteName, checklist, documents, signatures } = data;
  const locked = pkg.status === "accepted";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <Link href="/handover" className="hover:underline">
              Predaja
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{pkg.title}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{customerName}</span>
            <span>·</span>
            <span>{siteName ?? "Brez objekta"}</span>
            <span>·</span>
            <span>v{pkg.version}</span>
          </div>
          <Badge>{HANDOVER_STATUS_LABELS[pkg.status]}</Badge>
        </div>
        {canWrite && !locked ? (
          <Link href={`/handover/${pkg.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
            Uredi podatke
          </Link>
        ) : null}
      </div>

      <HandoverForm
        mode="edit"
        packageId={pkg.id}
        locked={locked || !canWrite}
        initial={{
          title: pkg.title,
          description: pkg.description ?? "",
          customerId: pkg.customerId,
          siteId: pkg.siteId ?? "",
          status: pkg.status === "accepted" || pkg.status === "superseded" ? "ready" : pkg.status,
          retentionNotes: pkg.retentionNotes ?? "",
          serviceContacts: pkg.serviceContacts ?? "",
          deviceSummary: pkg.deviceSummary ?? "",
          ipTable: pkg.ipTable ?? "",
          notes: pkg.notes ?? "",
        }}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        sites={sites.map(({ site }) => ({
          id: site.id,
          name: site.name,
          customerId: site.customerId,
        }))}
      />

      <HandoverDetailActions
        packageId={pkg.id}
        publicToken={pkg.publicToken}
        status={pkg.status}
        checklist={checklist}
        documents={documents}
        signatures={signatures}
        canWrite={canWrite}
        defaultSigner={session.user.name}
      />
    </div>
  );
}
