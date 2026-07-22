import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge, EmptyState, buttonVariants, cn } from "@securitydesk/ui";
import { DESKTOP_CHANNEL_LABELS, DESKTOP_RELEASE_STATUS_LABELS } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listDesktopInstallations, listDesktopReleases } from "@/server/desktop-releases";

export const dynamic = "force-dynamic";

export default async function DesktopReleasesPage() {
  try {
    await requireOrgSession("desktop_releases:read");
  } catch (error) {
    unstable_rethrow(error);
    redirect("/settings");
  }

  const [releases, installations] = await Promise.all([listDesktopReleases(), listDesktopInstallations()]);

  const installationsByPlatform = installations.reduce<Record<string, number>>((acc, i) => {
    acc[i.platform] = (acc[i.platform] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Izdaje namizne aplikacije</h1>
          <p className="text-sm text-muted-foreground">{releases.length} izdaj</p>
        </div>
        <Link href="/settings/desktop/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" />
          Nova izdaja
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Nameščene kopije</h2>
            <p className="text-sm text-muted-foreground">
              Skupaj {installations.length}
              {Object.keys(installationsByPlatform).length > 0
                ? " · " +
                  Object.entries(installationsByPlatform)
                    .map(([platform, count]) => `${platform}: ${count}`)
                    .join(" · ")
                : ""}
            </p>
          </div>
          <Link href="/settings/desktop/installations" className={cn(buttonVariants({ variant: "outline" }))}>
            Vse namestitve
          </Link>
        </div>
      </div>

      {releases.length === 0 ? (
        <EmptyState
          title="Ni izdaj"
          description="Ustvarite prvo izdajo namizne aplikacije."
          action={
            <Link href="/settings/desktop/new" className={cn(buttonVariants())}>
              Nova izdaja
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Različica</th>
                <th className="p-3 font-medium">Naslov</th>
                <th className="p-3 font-medium">Kanal</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Uvajanje</th>
                <th className="p-3 font-medium">Datotek</th>
                <th className="p-3 font-medium">Objavljeno</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/settings/desktop/${r.id}`} className="font-medium text-primary hover:underline">
                      {r.version}
                    </Link>
                    {r.isMandatory ? (
                      <Badge className="ml-2 align-middle">obvezno</Badge>
                    ) : null}
                  </td>
                  <td className="p-3">{r.title}</td>
                  <td className="p-3">{DESKTOP_CHANNEL_LABELS[r.channel]}</td>
                  <td className="p-3">
                    <Badge>{DESKTOP_RELEASE_STATUS_LABELS[r.status]}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.rolloutPercentage}%</td>
                  <td className="p-3 text-muted-foreground">{r.artifactCount}</td>
                  <td className="p-3 text-muted-foreground">
                    {r.publishedAt ? new Date(r.publishedAt).toLocaleString("sl-SI") : "—"}
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
