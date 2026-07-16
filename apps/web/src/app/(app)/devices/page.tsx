import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { listDevices } from "@/server/devices";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { DeviceImportExport } from "@/components/devices/device-import-export";

export const dynamic = "force-dynamic";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("devices:read");
  const { q } = await searchParams;
  const devices = await listDevices(q);
  const canWrite = hasPermission(session.role, "devices:write");
  const canExport = hasPermission(session.role, "devices:export");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Naprave</h1>
          <p className="text-sm text-muted-foreground">{devices.length} zapisov</p>
        </div>
        {canWrite ? (
          <Link href="/devices/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nova naprava
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" placeholder="Išči po imenu, IP, serijski…" defaultValue={q ?? ""} className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {canWrite || canExport ? <DeviceImportExport /> : null}

      {devices.length === 0 ? (
        <EmptyState
          title="Ni naprav"
          description="Dodajte napravo ročno ali uvozite CSV."
          action={
            canWrite ? (
              <Link href="/devices/new" className={cn(buttonVariants())}>
                Nova naprava
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Naprava</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">IP</th>
                <th className="p-3 font-medium">Model</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(({ device, siteName, manufacturerName }) => (
                <tr key={device.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/devices/${device.id}`} className="font-medium text-primary hover:underline">
                      {device.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{manufacturerName ?? ""}</p>
                  </td>
                  <td className="p-3 text-muted-foreground">{siteName ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{device.ipAddress ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{device.model ?? "—"}</td>
                  <td className="p-3">
                    <Badge>{device.status}</Badge>
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
