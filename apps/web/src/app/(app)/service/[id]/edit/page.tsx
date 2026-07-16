import { notFound } from "next/navigation";
import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { listDevices } from "@/server/devices";
import { getServiceTicket } from "@/server/service";
import { TicketForm } from "@/components/service/ticket-form";

export const dynamic = "force-dynamic";

function toLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditServiceTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOrgSession("service:write");
  const { id } = await params;
  const [data, customers, sites, devices] = await Promise.all([
    getServiceTicket(id),
    listCustomers(),
    listSites(),
    listDevices(),
  ]);
  if (!data) notFound();

  const t = data.ticket;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uredi zahtevek</h1>
      <TicketForm
        mode="edit"
        ticketId={id}
        initial={{
          title: t.title,
          description: t.description ?? "",
          customerId: t.customerId,
          siteId: t.siteId ?? "",
          deviceId: t.deviceId ?? "",
          category: t.category as "general",
          priority: t.priority,
          status: t.status,
          preferredAt: toLocal(t.preferredAt),
          attachmentNotes: t.attachmentNotes ?? "",
        }}
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
