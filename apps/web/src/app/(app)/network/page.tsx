import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import {
  listNetworkIps,
  listNetworkSwitches,
  listNetworkVlans,
} from "@/server/network";
import { listSites } from "@/server/sites";
import { VlanIpPanel } from "@/components/network/vlan-ip-panel";

export const dynamic = "force-dynamic";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("network:read");
  const { q } = await searchParams;
  const [switches, vlans, ips, sites] = await Promise.all([
    listNetworkSwitches(q),
    listNetworkVlans(),
    listNetworkIps(),
    listSites(),
  ]);
  const canWrite = hasPermission(session.role, "network:write");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Omrežje · PortMap</h1>
          <p className="text-sm text-muted-foreground">{switches.length} stikal</p>
        </div>
        {canWrite ? (
          <Link href="/network/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Novo stikalo
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Išči stikala…" className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {switches.length === 0 ? (
        <EmptyState
          title="Ni stikal"
          description="Dodajte stikalo za dokumentiranje portov, VLAN-ov in PoE porabe."
          action={
            canWrite ? (
              <Link href="/network/new" className={cn(buttonVariants())}>
                Novo stikalo
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Stikalo</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">IP</th>
                <th className="p-3 font-medium">Porti</th>
                <th className="p-3 font-medium">PoE</th>
              </tr>
            </thead>
            <tbody>
              {switches.map(({ switch: sw, siteName, portSummary }) => (
                <tr key={sw.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/network/${sw.id}`} className="font-medium text-primary hover:underline">
                      {sw.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[sw.manufacturer, sw.model].filter(Boolean).join(" ") || "—"}
                    </p>
                  </td>
                  <td className="p-3 text-muted-foreground">{siteName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{sw.ipAddress ?? "—"}</td>
                  <td className="p-3">
                    {portSummary ? (
                      <Badge>
                        {portSummary.used}/{portSummary.total} zasedenih
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {portSummary
                      ? `${portSummary.poeUsedWatts}/${portSummary.poeBudgetWatts} W${
                          portSummary.poeOverBudget ? " ⚠" : ""
                        }`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VlanIpPanel
        vlans={vlans}
        ips={ips}
        sites={sites.map(({ site }) => ({ id: site.id, name: site.name }))}
        canWrite={canWrite}
      />
    </div>
  );
}
