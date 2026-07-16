import { notFound } from "next/navigation";
import { requireOrgSession } from "@/lib/org-context";
import { getNetworkSwitch } from "@/server/network";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { SwitchForm } from "@/components/network/switch-form";

export const dynamic = "force-dynamic";

export default async function EditNetworkSwitchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrgSession("network:write");
  const { id } = await params;
  const [data, customers, sites] = await Promise.all([
    getNetworkSwitch(id),
    listCustomers(),
    listSites(),
  ]);
  if (!data) notFound();

  const sw = data.switch;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uredi stikalo</h1>
      <SwitchForm
        mode="edit"
        switchId={id}
        initial={{
          name: sw.name,
          customerId: sw.customerId ?? "",
          siteId: sw.siteId ?? "",
          deviceId: sw.deviceId ?? "",
          manufacturer: sw.manufacturer ?? "",
          model: sw.model ?? "",
          ipAddress: sw.ipAddress ?? "",
          macAddress: sw.macAddress ?? "",
          serialNumber: sw.serialNumber ?? "",
          portCount: sw.portCount,
          poeBudgetWatts: sw.poeBudgetWatts,
          location: sw.location ?? "",
          rack: sw.rack ?? "",
          uPosition: sw.uPosition ?? "",
          firmware: sw.firmware ?? "",
          notes: sw.notes ?? "",
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
