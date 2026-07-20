"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select } from "@securitydesk/ui";
import { createEnrollmentToken } from "@/server/monitoring";

type SiteOption = { id: string; name: string };

export function EnrollmentTokenForm({ sites }: { sites: SiteOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [siteId, setSiteId] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setToken(null);
    startTransition(async () => {
      const result = await createEnrollmentToken({ label, siteId, expiresInHours });
      if (!result.ok || !result.data) {
        setError(result.ok ? "Ni podatkov." : result.error);
        return;
      }
      setToken(result.data.token);
      router.refresh();
    });
  }

  return (
    <form className="space-y-4 rounded-xl border bg-card p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold">Nov enrollment žeton</h2>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Oznaka</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Skladišče A" />
        </div>
        <div className="space-y-1">
          <Label>Objekt</Label>
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">—</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Veljavnost (ure)</Label>
          <Input
            type="number"
            min={1}
            max={168}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Ustvarjam…" : "Ustvari žeton"}
      </Button>
      {token ? (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground">Žeton prikažite samo enkrat. Uporabite:</p>
          <code className="block break-all rounded bg-muted p-2 text-xs">{token}</code>
          <code className="block break-all rounded bg-muted p-2 text-xs">
            pnpm agent:dev enroll {token}
          </code>
        </div>
      ) : null}
    </form>
  );
}
