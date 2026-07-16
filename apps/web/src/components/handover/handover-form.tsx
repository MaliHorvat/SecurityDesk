"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import { HANDOVER_STATUS_LABELS, type HandoverPackageInput } from "@securitydesk/shared";
import { createHandoverPackage, updateHandoverPackage } from "@/server/handover";

type Option = { id: string; name: string; customerId?: string };

type Props = {
  mode: "create" | "edit";
  packageId?: string;
  initial?: Partial<HandoverPackageInput>;
  customers: Option[];
  sites: Option[];
  locked?: boolean;
};

export function HandoverForm({ mode, packageId, initial, customers, sites, locked }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<HandoverPackageInput>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    customerId: initial?.customerId ?? "",
    siteId: initial?.siteId ?? "",
    status: initial?.status ?? "draft",
    retentionNotes: initial?.retentionNotes ?? "",
    serviceContacts: initial?.serviceContacts ?? "",
    deviceSummary: initial?.deviceSummary ?? "",
    ipTable: initial?.ipTable ?? "",
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof HandoverPackageInput>(key: K, value: HandoverPackageInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const filteredSites = sites.filter((s) => !form.customerId || s.customerId === form.customerId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createHandoverPackage(form)
          : await updateHandoverPackage(packageId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const id = mode === "create" && result.data ? result.data.id : packageId!;
      router.push(`/handover/${id}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">Naslov *</Label>
        <Input
          id="title"
          required
          disabled={locked}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerId">Stranka *</Label>
        <Select
          id="customerId"
          required
          disabled={locked}
          value={form.customerId}
          onChange={(e) => {
            set("customerId", e.target.value);
            set("siteId", "");
          }}
        >
          <option value="">Izberite…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="siteId">Objekt</Label>
        <Select
          id="siteId"
          disabled={locked}
          value={form.siteId ?? ""}
          onChange={(e) => set("siteId", e.target.value)}
        >
          <option value="">—</option>
          {filteredSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          disabled={locked}
          value={form.status}
          onChange={(e) => set("status", e.target.value as HandoverPackageInput["status"])}
        >
          {Object.entries(HANDOVER_STATUS_LABELS)
            .filter(([v]) => v !== "superseded" && v !== "accepted")
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          disabled={locked}
          rows={2}
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="deviceSummary">Seznam naprav</Label>
        <Textarea
          id="deviceSummary"
          disabled={locked}
          rows={4}
          value={form.deviceSummary ?? ""}
          onChange={(e) => set("deviceSummary", e.target.value)}
          placeholder="Ena naprava na vrstico"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="ipTable">IP tabela</Label>
        <Textarea
          id="ipTable"
          disabled={locked}
          rows={4}
          value={form.ipTable ?? ""}
          onChange={(e) => set("ipTable", e.target.value)}
          placeholder="IP · naprava · VLAN · opombe"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="retentionNotes">Obdobje hrambe</Label>
        <Textarea
          id="retentionNotes"
          disabled={locked}
          rows={2}
          value={form.retentionNotes ?? ""}
          onChange={(e) => set("retentionNotes", e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="serviceContacts">Servisni kontakti</Label>
        <Textarea
          id="serviceContacts"
          disabled={locked}
          rows={2}
          value={form.serviceContacts ?? ""}
          onChange={(e) => set("serviceContacts", e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Opombe / izjave</Label>
        <Textarea
          id="notes"
          disabled={locked}
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      {!locked ? (
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "…" : mode === "create" ? "Ustvari paket" : "Shrani"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
