import { notFound } from "next/navigation";
import { requireOrgSession } from "@/lib/org-context";
import { getHandoverPackage } from "@/server/handover";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { HandoverForm } from "@/components/handover/handover-form";

export const dynamic = "force-dynamic";

export default async function EditHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrgSession("handover:write");
  const { id } = await params;
  const [data, customers, sites] = await Promise.all([
    getHandoverPackage(id),
    listCustomers(),
    listSites(),
  ]);
  if (!data) notFound();
  if (data.package.status === "accepted") notFound();

  const pkg = data.package;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uredi predajni paket</h1>
      <HandoverForm
        mode="edit"
        packageId={id}
        initial={{
          title: pkg.title,
          description: pkg.description ?? "",
          customerId: pkg.customerId,
          siteId: pkg.siteId ?? "",
          status: pkg.status === "superseded" ? "draft" : pkg.status,
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
    </div>
  );
}
