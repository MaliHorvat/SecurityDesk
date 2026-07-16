"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import { createCustomer, updateCustomer } from "@/server/customers";
import type { CustomerInput } from "@securitydesk/shared";

type Props = {
  mode: "create" | "edit";
  customerId?: string;
  initial?: Partial<CustomerInput>;
};

export function CustomerForm({ mode, customerId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerInput>({
    name: initial?.name ?? "",
    taxId: initial?.taxId ?? "",
    addressLine1: initial?.addressLine1 ?? "",
    addressLine2: initial?.addressLine2 ?? "",
    city: initial?.city ?? "",
    postalCode: initial?.postalCode ?? "",
    country: initial?.country ?? "SI",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
    serviceContract: initial?.serviceContract ?? "",
    status: initial?.status ?? "active",
    collaborationStartedAt: initial?.collaborationStartedAt ?? "",
    primaryContactName: initial?.primaryContactName ?? "",
    primaryContactEmail: initial?.primaryContactEmail ?? "",
    primaryContactPhone: initial?.primaryContactPhone ?? "",
  });

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCustomer(form)
          : await updateCustomer(customerId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(mode === "create" && result.data ? `/customers/${result.data.id}` : `/customers/${customerId}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Naziv *</Label>
        <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="taxId">Davčna številka</Label>
        <Input id="taxId" value={form.taxId} onChange={(e) => set("taxId", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" value={form.status} onChange={(e) => set("status", e.target.value as CustomerInput["status"])}>
          <option value="active">Aktivna</option>
          <option value="inactive">Neaktivna</option>
          <option value="prospect">Potencialna</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-pošta</Label>
        <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
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
        <Label htmlFor="country">Država</Label>
        <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="collaborationStartedAt">Začetek sodelovanja</Label>
        <Input
          id="collaborationStartedAt"
          type="date"
          value={form.collaborationStartedAt}
          onChange={(e) => set("collaborationStartedAt", e.target.value)}
        />
      </div>
      {mode === "create" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="primaryContactName">Kontaktna oseba</Label>
            <Input
              id="primaryContactName"
              value={form.primaryContactName}
              onChange={(e) => set("primaryContactName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryContactEmail">Kontakt e-pošta</Label>
            <Input
              id="primaryContactEmail"
              type="email"
              value={form.primaryContactEmail}
              onChange={(e) => set("primaryContactEmail", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryContactPhone">Kontakt telefon</Label>
            <Input
              id="primaryContactPhone"
              value={form.primaryContactPhone}
              onChange={(e) => set("primaryContactPhone", e.target.value)}
            />
          </div>
        </>
      ) : null}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="serviceContract">Servisna pogodba</Label>
        <Textarea id="serviceContract" value={form.serviceContract} onChange={(e) => set("serviceContract", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Opombe</Label>
        <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem…" : mode === "create" ? "Ustvari stranko" : "Shrani spremembe"}
        </Button>
      </div>
    </form>
  );
}
