"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import { createConfigurationBackup } from "@/server/config-vault";

type Props = {
  deviceId: string;
};

const SOURCE_OPTIONS: Array<{ value: "manual" | "agent" | "vendor_api"; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "agent", label: "Agent" },
  { value: "vendor_api", label: "Vendor API" },
];

export function ConfigBackupForm({ deviceId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<"manual" | "agent" | "vendor_api">("manual");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [configurationText, setConfigurationText] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createConfigurationBackup({
        deviceId,
        source,
        label,
        note,
        configurationText,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setLabel("");
      setNote("");
      setConfigurationText("");
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Vir</Label>
          <Select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Oznaka</Label>
          <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Opombe</Label>
        <Textarea rows={3} id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="config">Konfiguracija (šifrirano v DB)</Label>
        <Textarea
          rows={8}
          id="config"
          required
          value={configurationText}
          onChange={(e) => setConfigurationText(e.target.value)}
          placeholder="Paste here…"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button disabled={pending || !configurationText.trim()} type="submit">
          {pending ? "Shranjujem…" : "Shrani verzijo"}
        </Button>
      </div>
    </form>
  );
}

