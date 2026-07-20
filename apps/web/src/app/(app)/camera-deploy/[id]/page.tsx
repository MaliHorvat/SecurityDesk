import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle, buttonVariants, cn } from "@securitydesk/ui";
import {
  CAMERA_DEPLOY_SESSION_STATUS_LABELS,
  CAMERA_DEPLOY_TARGET_STATUS_LABELS,
  hasPermission,
  sessionProgress,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getCameraDeploySession } from "@/server/camera-deploy";
import { CameraDeployTargetForm } from "@/components/camera-deploy/target-form";
import { AutoAssignIpsButton, DeleteTargetButton, TargetStatusButton } from "@/components/camera-deploy/target-actions";

export const dynamic = "force-dynamic";

export default async function CameraDeployDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession("camera_deploy:read");
  const { id } = await params;
  const data = await getCameraDeploySession(id);
  if (!data) notFound();

  const canWrite = hasPermission(session.role, "camera_deploy:write");
  const { session: deploySession, targets } = data;
  const progress = sessionProgress(targets);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <Link href="/camera-deploy" className="hover:underline">
              CameraDeploy
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{deploySession.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge>{CAMERA_DEPLOY_SESSION_STATUS_LABELS[deploySession.status]}</Badge>
            <Badge className="bg-muted text-muted-foreground">
              {progress.deployed}/{progress.total} nameščeno ({progress.percent}%)
            </Badge>
          </div>
        </div>
        {canWrite ? (
          <Link href={`/camera-deploy/${deploySession.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
            Uredi sejo
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Omrežje in privzeti podatki</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Objekt:</span> {deploySession.siteName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Stranka:</span> {deploySession.customerName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">IP območje:</span>{" "}
            {deploySession.ipRangeStart && deploySession.ipRangeEnd
              ? `${deploySession.ipRangeStart} – ${deploySession.ipRangeEnd}`
              : deploySession.ipRangeStart ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Gateway:</span> {deploySession.gateway ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Maska:</span> {deploySession.subnetMask ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">VLAN:</span> {deploySession.vlanId ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Privzeti uporabnik:</span> {deploySession.defaultUsername ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">DNS:</span> {deploySession.dnsServers ?? "—"}
          </p>
          {deploySession.description ? (
            <div className="md:col-span-2">
              <p className="text-muted-foreground">Opis</p>
              <p className="whitespace-pre-wrap">{deploySession.description}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Kamere ({targets.length})</h2>
          {canWrite ? <AutoAssignIpsButton sessionId={deploySession.id} /> : null}
        </div>

        {canWrite ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dodaj kamero</CardTitle>
            </CardHeader>
            <CardContent>
              <CameraDeployTargetForm sessionId={deploySession.id} />
            </CardContent>
          </Card>
        ) : null}

        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Seja še nima kamer.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Kamera</th>
                  <th className="p-3 font-medium">IP</th>
                  <th className="p-3 font-medium">MAC</th>
                  <th className="p-3 font-medium">Status</th>
                  {canWrite ? <th className="p-3 font-medium">Akcije</th> : null}
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[t.manufacturer, t.model, t.locationLabel].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {t.currentIp || "—"} → {t.targetIp || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{t.macAddress ?? "—"}</td>
                    <td className="p-3">
                      <Badge>{CAMERA_DEPLOY_TARGET_STATUS_LABELS[t.status]}</Badge>
                    </td>
                    {canWrite ? (
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {t.status !== "configured" ? (
                            <TargetStatusButton targetId={t.id} status="configured" label="Konfigurirano" />
                          ) : null}
                          {t.status !== "deployed" ? (
                            <TargetStatusButton targetId={t.id} status="deployed" label="Nameščeno" />
                          ) : null}
                          {t.status !== "failed" ? (
                            <TargetStatusButton targetId={t.id} status="failed" label="Neuspešno" />
                          ) : null}
                          <DeleteTargetButton targetId={t.id} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
