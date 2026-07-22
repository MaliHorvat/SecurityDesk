"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@securitydesk/ui";
import type { DesktopReleaseStatus } from "@securitydesk/shared";
import { pauseDesktopRelease, publishDesktopRelease, withdrawDesktopRelease } from "@/server/desktop-releases";

export function DesktopReleaseActions({ releaseId, status }: { releaseId: string; status: DesktopReleaseStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canPublish = status === "draft" || status === "testing" || status === "paused";
  const canPause = status === "published";
  const canWithdraw = status !== "withdrawn" && status !== "archived";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Dejanje ni uspelo.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Upravljanje izdaje</h3>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {canPublish ? (
          <Button type="button" disabled={pending} onClick={() => run(() => publishDesktopRelease(releaseId))}>
            Objavi
          </Button>
        ) : null}
        {canPause ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => pauseDesktopRelease(releaseId))}
          >
            Začasno ustavi
          </Button>
        ) : null}
        {canWithdraw ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Ali res želite umakniti to izdajo?")) return;
              run(() => withdrawDesktopRelease(releaseId));
            }}
          >
            Umakni
          </Button>
        ) : null}
      </div>
    </div>
  );
}
