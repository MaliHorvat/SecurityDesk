import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@securitydesk/ui";
import { getInstallationId } from "@/lib/api";
import { checkForUpdates } from "@/lib/updates";
import { detectPlatformLabel } from "@/lib/platform";
import { t } from "@/lib/i18n";

export function SettingsDesktopPage() {
  const [installationId, setInstallationId] = useState<string>("…");
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void getInstallationId().then(setInstallationId);
  }, []);

  async function onCheckUpdates() {
    setChecking(true);
    setUpdateStatus(t.update.checking);
    try {
      const result = await checkForUpdates();
      setUpdateStatus(result.available ? `${t.update.description} (v${result.version})` : t.update.upToDate);
    } catch {
      setUpdateStatus(t.update.checkFailed);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">{t.settings.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.title}</CardTitle>
          <CardDescription>Informacije o namizni aplikaciji SecurityDesk.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label={t.settings.version} value={__APP_VERSION__} />
          <InfoRow label={t.settings.platform} value={detectPlatformLabel()} />
          <InfoRow label={t.settings.installationId} value={installationId} mono />

          <div className="pt-2">
            <Button onClick={() => void onCheckUpdates()} disabled={checking}>
              {t.settings.checkUpdates}
            </Button>
            {updateStatus ? <p className="mt-2 text-sm text-muted-foreground">{updateStatus}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-none last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm"}>{value}</span>
    </div>
  );
}
