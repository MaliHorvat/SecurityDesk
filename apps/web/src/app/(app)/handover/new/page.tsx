import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { HandoverForm } from "@/components/handover/handover-form";

export const dynamic = "force-dynamic";

export default async function NewHandoverPage() {
  await requireOrgSession("handover:write");
  const [customers, sites] = await Promise.all([listCustomers(), listSites()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nov predajni paket</h1>
      <HandoverForm
        mode="create"
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
