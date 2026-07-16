import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { getDevice } from "@/server/devices";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { requireOrgSession } from "@/lib/org-context";
import { DeviceForm } from "@/components/devices/device-form";

export const dynamic = "force-dynamic";

export default async function EditDevicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrgSession("devices:write");
  const { id } = await params;
  const [data, customers, sites] = await Promise.all([getDevice(id), listCustomers(), listSites()]);
  if (!data) notFound();
  const d = data.device;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uredi: {d.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Podatki naprave</CardTitle>
        </CardHeader>
        <CardContent>
          <DeviceForm
            mode="edit"
            deviceId={d.id}
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            sites={sites.map(({ site, customerName }) => ({
              id: site.id,
              name: `${site.name}${customerName ? ` (${customerName})` : ""}`,
              customerId: site.customerId,
            }))}
            initial={{
              name: d.name,
              customerId: d.customerId ?? "",
              siteId: d.siteId ?? "",
              buildingId: d.buildingId ?? "",
              floorId: d.floorId ?? "",
              roomId: d.roomId ?? "",
              deviceTypeName: data.deviceTypeName ?? "",
              manufacturerName: data.manufacturerName ?? "",
              model: d.model ?? "",
              serialNumber: d.serialNumber ?? "",
              inventoryNumber: d.inventoryNumber ?? "",
              macAddress: d.macAddress ?? "",
              ipAddress: d.ipAddress ?? "",
              subnetMask: d.subnetMask ?? "",
              gateway: d.gateway ?? "",
              dns: d.dns ?? "",
              vlan: d.vlan,
              switchPort: d.switchPort ?? "",
              username: d.username ?? "",
              firmware: d.firmware ?? "",
              supplier: d.supplier ?? "",
              status: d.status,
              tags: d.tags ?? "",
              notes: d.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
