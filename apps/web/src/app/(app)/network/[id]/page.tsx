import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getNetworkSwitch } from "@/server/network";
import { listDevices } from "@/server/devices";
import { PortMapPanel } from "@/components/network/port-map-panel";
import { PortImportPanel } from "@/components/network/port-import-panel";

export const dynamic = "force-dynamic";

export default async function NetworkSwitchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession("network:read");
  const { id } = await params;
  const [data, devices] = await Promise.all([getNetworkSwitch(id), listDevices()]);
  if (!data) notFound();

  const canWrite = hasPermission(session.role, "network:write");
  const { switch: sw, customerName, siteName, ports, summary } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <Link href="/network" className="hover:underline">
              Omrežje
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{sw.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[customerName, siteName, sw.ipAddress].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>
              {summary.used}/{summary.total} portov
            </Badge>
            <Badge>
              PoE {summary.poeUsedWatts}/{summary.poeBudgetWatts} W
              {summary.poeOverBudget ? " – prekoračeno" : ""}
            </Badge>
            {summary.errors > 0 ? <Badge>{summary.errors} napak</Badge> : null}
          </div>
        </div>
        {canWrite ? (
          <Link href={`/network/${sw.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
            Uredi
          </Link>
        ) : null}
      </div>

      <dl className="grid gap-3 rounded-xl border p-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Proizvajalec / model</dt>
          <dd>{[sw.manufacturer, sw.model].filter(Boolean).join(" ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Omara / U</dt>
          <dd>{[sw.rack, sw.uPosition].filter(Boolean).join(" / ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Firmware</dt>
          <dd>{sw.firmware || "—"}</dd>
        </div>
      </dl>

      <PortMapPanel
        ports={ports}
        devices={devices.map(({ device }) => ({ id: device.id, name: device.name }))}
        canWrite={canWrite}
      />

      {canWrite ? <PortImportPanel switchId={sw.id} /> : null}
    </div>
  );
}
