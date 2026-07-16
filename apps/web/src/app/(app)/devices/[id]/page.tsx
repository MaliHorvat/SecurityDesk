import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle, buttonVariants, cn } from "@securitydesk/ui";
import { getDevice } from "@/server/devices";
import { requireOrgSession } from "@/lib/org-context";
import { hasPermission } from "@securitydesk/shared";
import { QrPanel } from "@/components/qr-panel";

export const dynamic = "force-dynamic";

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession("devices:read");
  const { id } = await params;
  const data = await getDevice(id);
  if (!data) notFound();
  const d = data.device;
  const canWrite = hasPermission(session.role, "devices:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{d.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[data.manufacturerName, d.model].filter(Boolean).join(" · ") || "Brez modela"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge>{d.status}</Badge>
          {canWrite ? (
            <Link href={`/devices/${d.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
              Uredi
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lokacija</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Stranka: {data.customerName ?? "—"}</p>
              <p>
                Objekt:{" "}
                {d.siteId ? (
                  <Link href={`/sites/${d.siteId}`} className="text-primary hover:underline">
                    {data.siteName}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
              <p>Vrsta: {data.deviceTypeName ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Omrežje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-sm text-muted-foreground">
              <p>IP: {d.ipAddress ?? "—"}</p>
              <p>MAC: {d.macAddress ?? "—"}</p>
              <p>Maska: {d.subnetMask ?? "—"}</p>
              <p>GW: {d.gateway ?? "—"}</p>
              <p>DNS: {d.dns ?? "—"}</p>
              <p>VLAN: {d.vlan ?? "—"}</p>
              <p>Port: {d.switchPort ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Identifikacija</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <p>Serijska: {d.serialNumber ?? "—"}</p>
              <p>Inventarna: {d.inventoryNumber ?? "—"}</p>
              <p>Firmware: {d.firmware ?? "—"}</p>
              <p>Dobavitelj: {d.supplier ?? "—"}</p>
              <p>Uporabnik: {d.username ?? "—"}</p>
              <p>Oznake: {d.tags ?? "—"}</p>
            </CardContent>
          </Card>
          {d.notes ? (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Opombe</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{d.notes}</CardContent>
            </Card>
          ) : null}
        </div>
        <QrPanel token={d.qrToken} label="QR naprave" />
      </div>
    </div>
  );
}
