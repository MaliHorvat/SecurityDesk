import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { CAMERA_DEPLOY_SESSION_STATUS_LABELS, hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listCameraDeploySessions } from "@/server/camera-deploy";

export const dynamic = "force-dynamic";

export default async function CameraDeployPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("camera_deploy:read");
  const { q } = await searchParams;
  const sessions = await listCameraDeploySessions(q);
  const canWrite = hasPermission(session.role, "camera_deploy:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CameraDeploy</h1>
          <p className="text-sm text-muted-foreground">
            Načrtovanje IP območij, kamer in statusa namestitve na objektu.
          </p>
        </div>
        {canWrite ? (
          <Link href="/camera-deploy/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nova seja
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" placeholder="Išči seje…" defaultValue={q ?? ""} className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {sessions.length === 0 ? (
        <EmptyState
          title="Ni sej namestitve"
          description="Ustvarite sejo za načrtovanje IP naslovov in sledenje kameram na objektu."
          action={
            canWrite ? (
              <Link href="/camera-deploy/new" className={cn(buttonVariants())}>
                Nova seja
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Seja</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Napredovanje</th>
                <th className="p-3 font-medium">Posodobljeno</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/camera-deploy/${s.id}`} className="font-medium text-primary hover:underline">
                      {s.title}
                    </Link>
                    {s.customerName ? (
                      <p className="text-xs text-muted-foreground">{s.customerName}</p>
                    ) : null}
                  </td>
                  <td className="p-3 text-muted-foreground">{s.siteName ?? "—"}</td>
                  <td className="p-3">
                    <Badge>{CAMERA_DEPLOY_SESSION_STATUS_LABELS[s.status]}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {s.deployedCount}/{s.targetCount} nameščeno
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(s.updatedAt).toLocaleString("sl-SI")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
