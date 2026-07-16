"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@securitydesk/ui";
import type { ConfigurationBackupListItem } from "@/server/config-vault";
import {
  compareConfigurationBackups,
  deleteConfigurationBackup,
  getConfigurationBackupPlaintext,
} from "@/server/config-vault";

type Props = {
  backups: ConfigurationBackupListItem[];
  canWrite: boolean;
};

export function ConfigBackupsViewer({ backups, canWrite }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const latest = backups[0];
  const defaultLeft = latest?.id ?? "";
  const defaultRight = backups[1]?.id ?? defaultLeft;

  const [viewId, setViewId] = useState<string>(defaultLeft);
  const [viewText, setViewText] = useState<string>("");

  const [leftId, setLeftId] = useState<string>(defaultLeft);
  const [rightId, setRightId] = useState<string>(defaultRight);
  const [compareLeftText, setCompareLeftText] = useState<string>("");
  const [compareRightText, setCompareRightText] = useState<string>("");

  function onView(targetId?: string) {
    const id = targetId ?? viewId;
    if (!id) return;
    setViewId(id);
    setError(null);

    startTransition(async () => {
      const result = await getConfigurationBackupPlaintext(id);
      if (!result.ok || !result.data) {
        setError(result.ok ? "Ni podatkov." : result.error);
        return;
      }
      setViewText(result.data.plaintext);
    });
  }

  function onCompare() {
    if (!leftId || !rightId) return;
    setError(null);

    startTransition(async () => {
      const result = await compareConfigurationBackups(leftId, rightId);
      if (!result.ok || !result.data) {
        setError(result.ok ? "Ni podatkov." : result.error);
        return;
      }
      setCompareLeftText(result.data.left.plaintext);
      setCompareRightText(result.data.right.plaintext);
    });
  }

  async function onDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Izbrišem to verzijo konfiguracije?")) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteConfigurationBackup(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 font-medium">Verzija</th>
              <th className="p-3 font-medium">Vir</th>
              <th className="p-3 font-medium">Oznaka</th>
              <th className="p-3 font-medium">Last checked</th>
              <th className="p-3 font-medium">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>
                  Ni shranjenih konfiguracij.
                </td>
              </tr>
            ) : (
              backups.map((b) => (
                <tr key={b.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <span className="font-mono">{b.version}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{b.source}</td>
                  <td className="p-3">
                    {b.label ? <span className="text-muted-foreground">{b.label}</span> : <span>—</span>}
                  </td>
                  <td className="p-3">{b.isLastChecked ? "Da" : "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => onView(b.id)}
                      >
                        Pogled
                      </Button>
                      {canWrite ? (
                        <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => void onDelete(b.id)}>
                          Izbriši
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {backups.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">View plaintext</h2>
            <div className="flex items-center justify-between gap-3">
              <select
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                value={viewId}
                onChange={(e) => setViewId(e.target.value)}
              >
                {backups.map((b) => (
                  <option key={b.id} value={b.id}>
                    v{b.version} ({b.source})
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" disabled={pending} onClick={() => onView()}>
                Dekripcija
              </Button>
            </div>
            <Textarea readOnly rows={12} value={viewText} className="font-mono text-xs" />
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Compare (side-by-side)</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                value={leftId}
                onChange={(e) => setLeftId(e.target.value)}
              >
                {backups.map((b) => (
                  <option key={b.id} value={b.id}>
                    Levo v{b.version}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                value={rightId}
                onChange={(e) => setRightId(e.target.value)}
              >
                {backups.map((b) => (
                  <option key={b.id} value={b.id}>
                    Desno v{b.version}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" disabled={pending} onClick={() => void onCompare()}>
              Primerjaj
            </Button>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Levo</p>
                <Textarea readOnly rows={10} value={compareLeftText} className="font-mono text-xs" />
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Desno</p>
                <Textarea readOnly rows={10} value={compareRightText} className="font-mono text-xs" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

