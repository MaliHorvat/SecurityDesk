import { ConfigBackupForm } from "@/components/config-vault/config-backup-form";
import { ConfigBackupsViewer } from "@/components/config-vault/config-backups-viewer";
import { listDevices } from "@/server/devices";
import { listConfigurationBackupsByDevice } from "@/server/config-vault";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ deviceId?: string }>;
}) {
  const session = await requireOrgSession("config_vault:read");
  const params = await searchParams;

  const devices = await listDevices();
  const selectedDeviceId = params.deviceId ?? devices[0]?.device.id;
  const backups = selectedDeviceId ? await listConfigurationBackupsByDevice(selectedDeviceId) : [];
  const canWrite = hasPermission(session.role, "config_vault:write");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">ConfigVault</h1>
        <p className="text-sm text-muted-foreground">{devices.length} naprav</p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Naprava</label>
        <select
          name="deviceId"
          className="rounded-md border bg-background px-2 py-1 text-sm"
          defaultValue={selectedDeviceId ?? ""}
        >
          {devices.map((d) => (
            <option key={d.device.id} value={d.device.id}>
              {d.device.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border bg-background px-3 py-1 text-sm">
          Izberi
        </button>
      </form>

      {selectedDeviceId ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Zapis konfiguracij</h2>
            {canWrite ? <ConfigBackupForm deviceId={selectedDeviceId} /> : <p className="text-sm text-muted-foreground">Nimate pravic za shranjevanje verzij.</p>}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Verzije</h2>
            <ConfigBackupsViewer backups={backups} canWrite={canWrite} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Najprej izberite napravo.</p>
      )}
    </div>
  );
}
