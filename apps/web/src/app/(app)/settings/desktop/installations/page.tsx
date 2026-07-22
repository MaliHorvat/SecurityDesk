import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { Badge, Button, EmptyState, Input, Select, buttonVariants, cn } from "@securitydesk/ui";
import { DESKTOP_ARCHITECTURES, DESKTOP_CHANNEL_LABELS, DESKTOP_CHANNELS, DESKTOP_PLATFORMS } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listDesktopInstallations } from "@/server/desktop-releases";

export const dynamic = "force-dynamic";

export default async function DesktopInstallationsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; channel?: string; q?: string }>;
}) {
  try {
    await requireOrgSession("desktop_releases:read");
  } catch (error) {
    unstable_rethrow(error);
    redirect("/settings");
  }

  const { platform, channel, q } = await searchParams;
  const platformFilter = DESKTOP_PLATFORMS.find((p) => p === platform);
  const channelFilter = DESKTOP_CHANNELS.find((c) => c === channel);

  const installations = await listDesktopInstallations({
    platform: platformFilter,
    channel: channelFilter,
    search: q,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Namestitve namizne aplikacije</h1>
          <p className="text-sm text-muted-foreground">{installations.length} namestitev</p>
        </div>
        <Link href="/settings/desktop" className={cn(buttonVariants({ variant: "outline" }))}>
          Nazaj na izdaje
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <Input name="q" placeholder="Išči po ID / imenu naprave…" defaultValue={q ?? ""} className="max-w-xs" />
        <Select name="platform" defaultValue={platform ?? ""} className="w-40">
          <option value="">Vse platforme</option>
          {DESKTOP_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Select name="channel" defaultValue={channel ?? ""} className="w-40">
          <option value="">Vsi kanali</option>
          {DESKTOP_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {DESKTOP_CHANNEL_LABELS[c]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtriraj
        </Button>
      </form>

      {installations.length === 0 ? (
        <EmptyState title="Ni namestitev" description="Naprave se bodo pojavile po prvi prijavi v namizno aplikacijo." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Naprava</th>
                <th className="p-3 font-medium">Organizacija</th>
                <th className="p-3 font-medium">Platforma</th>
                <th className="p-3 font-medium">Različica</th>
                <th className="p-3 font-medium">Kanal</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Nazadnje aktivna</th>
              </tr>
            </thead>
            <tbody>
              {installations.map((i) => (
                <tr key={i.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium">{i.deviceName ?? "—"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{i.installationId}</p>
                  </td>
                  <td className="p-3 text-muted-foreground">{i.organizationName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {i.platform} · {i.architecture}
                    {i.osVersion ? <span className="block text-xs">{i.osVersion}</span> : null}
                  </td>
                  <td className="p-3 text-muted-foreground">{i.currentVersion ?? "—"}</td>
                  <td className="p-3">{DESKTOP_CHANNEL_LABELS[i.updateChannel]}</td>
                  <td className="p-3">
                    <Badge>{i.updateStatus ?? "—"}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {i.lastSeenAt ? new Date(i.lastSeenAt).toLocaleString("sl-SI") : "—"}
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
