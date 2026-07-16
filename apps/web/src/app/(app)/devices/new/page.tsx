import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { DeviceForm } from "@/components/devices/device-form";

export const dynamic = "force-dynamic";

export default async function NewDevicePage() {
  await requireOrgSession("devices:write");
  const [customers, sites] = await Promise.all([listCustomers(), listSites()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nova naprava</h1>
      <Card>
        <CardHeader>
          <CardTitle>Podatki naprave</CardTitle>
        </CardHeader>
        <CardContent>
          <DeviceForm
            mode="create"
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            sites={sites.map(({ site, customerName }) => ({
              id: site.id,
              name: `${site.name}${customerName ? ` (${customerName})` : ""}`,
              customerId: site.customerId,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
