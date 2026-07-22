import Link from "next/link";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { Badge, buttonVariants, cn } from "@securitydesk/ui";
import { DESKTOP_CHANNEL_LABELS, DESKTOP_RELEASE_STATUS_LABELS, hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getDesktopRelease } from "@/server/desktop-releases";
import { ArtifactUploadForm } from "@/components/desktop/artifact-upload-form";
import { DesktopReleaseActions } from "@/components/desktop/release-actions";

export const dynamic = "force-dynamic";

export default async function DesktopReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireOrgSession("desktop_releases:read");
  } catch (error) {
    unstable_rethrow(error);
    redirect("/settings");
  }

  const { id } = await params;
  const data = await getDesktopRelease(id);
  if (!data) notFound();
  const { release, artifacts } = data;

  const canUpload = hasPermission(session.role, "desktop_releases:upload");
  const canManage = hasPermission(session.role, "desktop_releases:publish") || hasPermission(session.role, "desktop_releases:manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {release.title} · {release.version}
          </h1>
          <p className="text-sm text-muted-foreground">
            {DESKTOP_CHANNEL_LABELS[release.channel]} · <Badge>{DESKTOP_RELEASE_STATUS_LABELS[release.status]}</Badge>
            {release.isMandatory ? <Badge className="ml-2">obvezno</Badge> : null}
          </p>
        </div>
        <Link href="/settings/desktop" className={cn(buttonVariants({ variant: "outline" }))}>
          Nazaj
        </Link>
      </div>

      <div className="grid gap-4 text-sm md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-muted-foreground">Delež uvajanja</p>
          <p className="text-lg font-semibold">{release.rolloutPercentage}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-muted-foreground">Objavljeno</p>
          <p className="text-lg font-semibold">
            {release.publishedAt ? new Date(release.publishedAt).toLocaleString("sl-SI") : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-muted-foreground">Min. podprta različica</p>
          <p className="text-lg font-semibold">{release.minimumSupportedVersion ?? "—"}</p>
        </div>
      </div>

      {release.releaseNotes ? (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="mb-1 font-medium">Opis sprememb</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{release.releaseNotes}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Namestitvene datoteke ({artifacts.length})</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 font-medium">Platforma</th>
                  <th className="p-3 font-medium">Arhitektura</th>
                  <th className="p-3 font-medium">Vrsta</th>
                  <th className="p-3 font-medium">SHA-256</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.length === 0 ? (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={4}>
                      Ni naloženih datotek.
                    </td>
                  </tr>
                ) : (
                  artifacts.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-3">{a.platform}</td>
                      <td className="p-3">{a.architecture}</td>
                      <td className="p-3">{a.packageType}</td>
                      <td className="p-3 font-mono text-xs">{a.sha256 ? `${a.sha256.slice(0, 12)}…` : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {canUpload ? <ArtifactUploadForm releaseId={id} /> : null}
        </div>

        {canManage ? <DesktopReleaseActions releaseId={id} status={release.status} /> : null}
      </div>
    </div>
  );
}
