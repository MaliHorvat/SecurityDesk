"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@securitydesk/ui";
import {
  commitDevicesImport,
  exportDevicesCsv,
  previewDevicesImport,
} from "@/server/devices";
import type { DeviceImportPreview } from "@securitydesk/shared";

export function DeviceImportExport() {
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<DeviceImportPreview[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setMessage(null);
    const content = await file.text();
    startTransition(async () => {
      const result = await previewDevicesImport(content);
      if (!result.ok || !result.data) {
        setError(result.ok ? "Napaka pri predogledu." : result.error);
        return;
      }
      setPreview(result.data);
    });
  }

  function onCommit() {
    if (!preview) return;
    startTransition(async () => {
      const result = await commitDevicesImport(preview);
      if (!result.ok || !result.data) {
        setError(result.ok ? "Uvoz ni uspel." : result.error);
        return;
      }
      setMessage(`Uvoženo: ${result.data.imported}, preskočeno: ${result.data.skipped}`);
      setPreview(null);
    });
  }

  function onExport() {
    startTransition(async () => {
      const result = await exportDevicesCsv();
      if (!result.ok || !result.data) {
        setError(result.ok ? "Izvoz ni uspel." : result.error);
        return;
      }
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `naprave-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const errorCount = preview?.filter((r) => r.errors.length > 0).length ?? 0;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={onExport}>
          Izvoz CSV / Excel
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <span className="rounded-md border px-3 py-2 hover:bg-accent">Uvoz CSV / Excel</span>
          <Input
            type="file"
            accept=".csv,.txt,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Pričakovani stolpci: name, customer, site, type, manufacturer, model, serial_number, ip_address, mac_address,
        status, tags (podprti so tudi slovenski nazivi). Excel shranite kot CSV UTF-8.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {preview ? (
        <div className="space-y-3">
          <p className="text-sm">
            Predogled: {preview.length} vrstic, napake: {errorCount}
          </p>
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Ime</th>
                  <th className="p-2">IP</th>
                  <th className="p-2">Napake</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.rowNumber} className="border-t">
                    <td className="p-2">{row.rowNumber}</td>
                    <td className="p-2">{row.data.name || "—"}</td>
                    <td className="p-2">{row.data.ip_address || "—"}</td>
                    <td className="p-2 text-destructive">{row.errors.join("; ") || "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" disabled={pending || preview.every((r) => r.errors.length > 0)} onClick={onCommit}>
            Potrdi uvoz veljavnih vrstic
          </Button>
        </div>
      ) : null}
    </div>
  );
}
