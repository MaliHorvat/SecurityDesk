import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getFirmwareAdvisory } from "@/server/firmware-guard";
import { FirmwareAdvisoryActions } from "@/components/firmware/advisory-actions";

export const dynamic = "force-dynamic";

export default async function FirmwareAdvisoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession("firmware:read");
  const { id } = await params;
  const data = await getFirmwareAdvisory(id);
  if (!data) notFound();

  const canWrite = hasPermission(session.role, "firmware:write");
  const { advisory, affectedModels, matches } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{advisory.title}</h1>
          <p className="text-sm text-muted-foreground">
            {advisory.vendor} · <Badge>{advisory.severity}</Badge>
          </p>
        </div>
        <Link href="/firmware" className={cn(buttonVariants({ variant: "outline" }))}>
          Nazaj
        </Link>
      </div>

      {advisory.description ? <p className="text-sm text-muted-foreground">{advisory.description}</p> : null}
      {advisory.recommendedAction ? (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="mb-1 font-medium">Priporočeno dejanje</p>
          <p className="text-muted-foreground">{advisory.recommendedAction}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Prizadeti modeli ({affectedModels.length})</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Proizvajalec</th>
                  <th className="p-3 font-medium">Tip</th>
                  <th className="p-3 font-medium">Pattern</th>
                </tr>
              </thead>
              <tbody>
                {affectedModels.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={3}>
                      Ni modelov.
                    </td>
                  </tr>
                ) : (
                  affectedModels.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-3">{m.manufacturerName}</td>
                      <td className="p-3">{m.deviceTypeName}</td>
                      <td className="p-3 font-mono text-xs">
                        {m.matchStrategy}: {m.versionPattern}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="text-sm font-semibold">Ujemanja naprav ({matches.length})</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Naprava</th>
                  <th className="p-3 font-medium">Firmware</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={3}>
                      Ni ujemanj. Dodajte modele in zaženite check.
                    </td>
                  </tr>
                ) : (
                  matches.map((m) => (
                    <tr key={m.matchId} className="border-t">
                      <td className="p-3">
                        <Link href={`/devices/${m.deviceId}`} className="text-primary hover:underline">
                          {m.deviceName}
                        </Link>
                        <p className="text-xs text-muted-foreground">{m.ipAddress ?? "—"}</p>
                      </td>
                      <td className="p-3 font-mono text-xs">{m.firmwareVersion ?? "—"}</td>
                      <td className="p-3">
                        <Badge>{m.matchStatus}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <FirmwareAdvisoryActions advisoryId={id} canWrite={canWrite} />
      </div>
    </div>
  );
}
