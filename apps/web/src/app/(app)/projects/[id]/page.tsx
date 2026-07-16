import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle, buttonVariants, cn } from "@securitydesk/ui";
import { getCctvProject } from "@/server/projects";
import { requireOrgSession } from "@/lib/org-context";
import { hasPermission } from "@securitydesk/shared";
import { CctvResultsPanel } from "@/components/projects/cctv-results";
import { ScenarioPanel } from "@/components/projects/scenario-panel";
import { buildSuggestedEquipment, buildSuggestedVlans } from "@/lib/cctv-export";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession("projects:read");
  const { id } = await params;
  const data = await getCctvProject(id);
  if (!data) notFound();
  const canWrite = hasPermission(session.role, "projects:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[data.customerName, data.siteName].filter(Boolean).join(" · ") || "Brez stranke/objekta"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge>{data.project.status}</Badge>
          {canWrite ? (
            <Link href={`/projects/${id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
              Uredi
            </Link>
          ) : null}
        </div>
      </div>

      {data.project.description ? (
        <p className="text-sm text-muted-foreground">{data.project.description}</p>
      ) : null}

      <CctvResultsPanel result={data.result} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Predlagana oprema</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {buildSuggestedEquipment(data.result).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Predlagani VLAN-i / IP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {buildSuggestedVlans().map((v) => (
              <p key={v.vlan}>
                VLAN {v.vlan} ({v.name}) – {v.purpose}
              </p>
            ))}
            <p className="pt-2">
              Predlagani IP razpon kamer: 10.101.0.0/24 (primer; prilagodite objektu).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabela kamer / skupin</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2">Skupina</th>
                <th className="p-2">Kamere</th>
                <th className="p-2">Codec</th>
                <th className="p-2">Bitrate</th>
                <th className="p-2">Dnevno</th>
              </tr>
            </thead>
            <tbody>
              {data.input.groups.map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="p-2">{g.name}</td>
                  <td className="p-2">{g.cameraCount}</td>
                  <td className="p-2">
                    {g.codec} / {g.resolution}
                  </td>
                  <td className="p-2">{g.bitrateMbps} Mbps</td>
                  <td className="p-2">
                    {data.result.groups.find((r) => r.id === g.id)?.dailyGb ?? "—"} GB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {canWrite ? (
        <ScenarioPanel
          projectId={id}
          scenarios={data.scenarios}
          baseRetention={data.project.retentionDays}
          baseReserve={data.project.reservePercent}
        />
      ) : null}
    </div>
  );
}
