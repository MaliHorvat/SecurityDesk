import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { SwitchForm } from "@/components/network/switch-form";

export const dynamic = "force-dynamic";

export default async function NewNetworkSwitchPage() {
  await requireOrgSession("network:write");
  const [customers, sites] = await Promise.all([listCustomers(), listSites()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo stikalo</h1>
      <SwitchForm
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
