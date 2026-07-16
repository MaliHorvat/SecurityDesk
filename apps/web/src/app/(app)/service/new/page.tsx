import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { listDevices } from "@/server/devices";
import { TicketForm } from "@/components/service/ticket-form";

export const dynamic = "force-dynamic";

export default async function NewServiceTicketPage() {
  await requireOrgSession("service:write");
  const [customers, sites, devices] = await Promise.all([
    listCustomers(),
    listSites(),
    listDevices(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nov servisni zahtevek</h1>
      <TicketForm
        mode="create"
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        sites={sites.map(({ site }) => ({
          id: site.id,
          name: site.name,
          customerId: site.customerId,
        }))}
        devices={devices.map(({ device }) => ({
          id: device.id,
          name: device.name,
          customerId: device.customerId ?? undefined,
        }))}
      />
    </div>
  );
}
