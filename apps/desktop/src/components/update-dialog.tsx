import { useEffect, useState } from "react";
import { Button } from "@securitydesk/ui";
import { checkForUpdates, installUpdateAndRelaunch, type UpdateInfo } from "@/lib/updates";
import { t } from "@/lib/i18n";

/**
 * Silently checks for updates once on mount and renders a blocking dialog
 * if one is available. Renders nothing while there is no pending update.
 */
export function UpdateDialog() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void checkForUpdates().then((info) => {
      if (!cancelled && info.available) setUpdate(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update || dismissed) return null;

  async function onInstall() {
    setInstalling(true);
    try {
      await installUpdateAndRelaunch((event) => {
        if (event.event === "progress") {
          setProgress((prev) => Math.min(99, prev + Math.max(1, Math.round(event.chunkLength / 1024))));
        } else if (event.event === "finished") {
          setProgress(100);
        }
      });
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground shadow-xl">
        <h2 className="text-lg font-semibold">{t.update.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.update.description}
          {update.version ? ` (v${update.version})` : ""}
        </p>
        {update.body ? (
          <p className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            {update.body}
          </p>
        ) : null}
        {installing ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t.update.installing} {progress}%
          </p>
        ) : (
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDismissed(true)}>
              {t.update.later}
            </Button>
            <Button onClick={() => void onInstall()}>{t.update.install}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
