"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import { createSite, updateSite } from "@/server/sites";
import type { SiteInput } from "@securitydesk/shared";

type CustomerOption = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  siteId?: string;
  customers: CustomerOption[];
  initial?: Partial<SiteInput>;
};

export function SiteForm({ mode, siteId, customers, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SiteInput>({
    customerId: initial?.customerId ?? customers[0]?.id ?? "",
    name: initial?.name ?? "",
    addressLine1: initial?.addressLine1 ?? "",
    city: initial?.city ?? "",
    postalCode: initial?.postalCode ?? "",
    country: initial?.country ?? "SI",
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
    timezone: initial?.timezone ?? "Europe/Ljubljana",
    contactName: initial?.contactName ?? "",
    contactPhone: initial?.contactPhone ?? "",
    accessInstructions: initial?.accessInstructions ?? "",
    workingHours: initial?.workingHours ?? "",
    securityNotes: initial?.securityNotes ?? "",
  });

  function set<K extends keyof SiteInput>(key: K, value: SiteInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = mode === "create" ? await createSite(form) : await updateSite(siteId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(mode === "create" && result.data ? `/sites/${result.data.id}` : `/sites/${siteId}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="customerId">Stranka *</Label>
        <Select
          id="customerId"
          required
          value={form.customerId}
          onChange={(e) => set("customerId", e.target.value)}
        >
          <option value="">— izberi —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Naziv objekta *</Label>
        <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="addressLine1">Naslov</Label>
        <Input id="addressLine1" value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">Kraj</Label>
        <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="postalCode">Poštna številka</Label>
        <Input id="postalCode" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="timezone">Časovni pas</Label>
        <Input id="timezone" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactName">Kontakt</Label>
        <Input id="contactName" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Telefon</Label>
        <Input id="contactPhone" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="accessInstructions">Navodila za dostop</Label>
        <Textarea
          id="accessInstructions"
          value={form.accessInstructions}
          onChange={(e) => set("accessInstructions", e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="workingHours">Delovni čas</Label>
        <Textarea id="workingHours" value={form.workingHours} onChange={(e) => set("workingHours", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="securityNotes">Varnostna opozorila</Label>
        <Textarea id="securityNotes" value={form.securityNotes} onChange={(e) => set("securityNotes", e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem…" : mode === "create" ? "Ustvari objekt" : "Shrani spremembe"}
        </Button>
      </div>
    </form>
  );
}
