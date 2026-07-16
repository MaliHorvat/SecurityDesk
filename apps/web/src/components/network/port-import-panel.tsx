"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea, Label } from "@securitydesk/ui";
import { commitPortImport, exportPortsCsv, previewPortImport } from "@/server/network";

type PreviewRow = {
  name: string;
  portNumber: number | null;
  description: string;
  accessVlan: number | null;
  poeWatts: number;
  connectedDeviceLabel: string;
};

export function PortImportPanel({ switchId }: { switchId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Uvoz portov</h2>
      <p className="text-sm text-muted-foreground">
        Vnesite CSV ali vrstice v obliki{" "}
        <code className="text-xs">Gi1/0/1 – Kamera – VLAN 101 – PoE 8,4 W</code>. Pred shranjevanjem
        potrdite predogled.
      </p>
      <div className="space-y-2">
        <Label>Vsebina</Label>
        <Textarea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Gi1/0/1 – Kamera skladišče – VLAN 101 – PoE 8,4 W\nGi1/0/2 – Kamera rampa – VLAN 101 – PoE 10,1 W"}
        />
      </div>
      {preview ? (
        <div className="overflow-auto rounded border text-sm">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2 text-left">Port</th>
                <th className="p-2 text-left">Naprava</th>
                <th className="p-2 text-left">VLAN</th>
                <th className="p-2 text-left">PoE</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.connectedDeviceLabel || r.description}</td>
                  <td className="p-2">{r.accessVlan ?? "—"}</td>
                  <td className="p-2">{r.poeWatts || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || !text.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setMessage(null);
              const r = await previewPortImport(switchId, text);
              if (!r.ok || !r.data) {
                setPreview(null);
                setError(r.ok ? "Ni podatkov." : r.error);
              } else {
                setPreview(r.data.rows);
              }
            })
          }
        >
          Predogled
        </Button>
        <Button
          type="button"
          disabled={pending || !preview?.length}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const r = await commitPortImport(switchId, text);
              if (!r.ok || !r.data) setError(r.ok ? "Ni podatkov." : r.error);
              else {
                setMessage(`Posodobljenih portov: ${r.data.updated}`);
                setPreview(null);
                router.refresh();
              }
            })
          }
        >
          Potrdi uvoz
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await exportPortsCsv(switchId);
              if (!r.ok || !r.data) {
                setError(r.ok ? "Ni podatkov." : r.error);
                return;
              }
              const blob = new Blob([r.data.csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `ports-${switchId}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            })
          }
        >
          Izvoz CSV
        </Button>
      </div>
    </div>
  );
}
