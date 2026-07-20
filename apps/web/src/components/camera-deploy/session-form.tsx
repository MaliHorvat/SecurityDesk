"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import type { CameraDeploySessionInput } from "@securitydesk/shared";
import { createCameraDeploySession, updateCameraDeploySession } from "@/server/camera-deploy";

type Option = { id: string; name: string };

type Props = {
  customers: Option[];
  sites: Array<{ id: string; name: string; customerId: string | null }>;
  initial?: CameraDeploySessionInput & { id?: string };
};

export function CameraDeploySessionForm({ customers, sites, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CameraDeploySessionInput>({
    title: initial?.title ?? "",
    customerId: initial?.customerId ?? "",
    siteId: initial?.siteId ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "draft",
    ipRangeStart: initial?.ipRangeStart ?? "",
    ipRangeEnd: initial?.ipRangeEnd ?? "",
    subnetMask: initial?.subnetMask ?? "255.255.255.0",
    gateway: initial?.gateway ?? "",
    dnsServers: initial?.dnsServers ?? "",
    defaultUsername: initial?.defaultUsername ?? "admin",
    defaultPassword: "",
    vlanId: initial?.vlanId ?? null,
  });

  const filteredSites = form.customerId
    ? sites.filter((s) => s.customerId === form.customerId)
    : sites;

  function set<K extends keyof CameraDeploySessionInput>(key: K, value: CameraDeploySessionInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = initial?.id
        ? await updateCameraDeploySession(initial.id, form)
        : await createCameraDeploySession(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(initial?.id ? `/camera-deploy/${initial.id}` : `/camera-deploy/${result.data!.id}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">Naslov *</Label>
        <Input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Stranka</Label>
        <Select
          value={form.customerId ?? ""}
          onChange={(e) => {
            set("customerId", e.target.value);
            set("siteId", "");
          }}
        >
          <option value="">—</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Objekt *</Label>
        <Select required value={form.siteId} onChange={(e) => set("siteId", e.target.value)}>
          <option value="">Izberite objekt</option>
          {filteredSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={form.status} onChange={(e) => set("status", e.target.value as CameraDeploySessionInput["status"])}>
          <option value="draft">Osnutek</option>
          <option value="planned">Načrtovano</option>
          <option value="deploying">V teku</option>
          <option value="completed">Končano</option>
          <option value="cancelled">Preklicano</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>VLAN ID</Label>
        <Input
          type="number"
          min={1}
          max={4094}
          value={form.vlanId ?? ""}
          onChange={(e) => set("vlanId", e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Opis</Label>
        <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>IP od</Label>
        <Input value={form.ipRangeStart ?? ""} onChange={(e) => set("ipRangeStart", e.target.value)} placeholder="192.168.10.100" />
      </div>
      <div className="space-y-2">
        <Label>IP do</Label>
        <Input value={form.ipRangeEnd ?? ""} onChange={(e) => set("ipRangeEnd", e.target.value)} placeholder="192.168.10.150" />
      </div>
      <div className="space-y-2">
        <Label>Maska</Label>
        <Input value={form.subnetMask ?? ""} onChange={(e) => set("subnetMask", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Gateway</Label>
        <Input value={form.gateway ?? ""} onChange={(e) => set("gateway", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>DNS strežniki</Label>
        <Input value={form.dnsServers ?? ""} onChange={(e) => set("dnsServers", e.target.value)} placeholder="8.8.8.8, 1.1.1.1" />
      </div>
      <div className="space-y-2">
        <Label>Privzeti uporabnik</Label>
        <Input value={form.defaultUsername ?? ""} onChange={(e) => set("defaultUsername", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Privzeto geslo {initial?.id ? "(pustite prazno za ohranitev)" : ""}</Label>
        <Input type="password" value={form.defaultPassword ?? ""} onChange={(e) => set("defaultPassword", e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem…" : initial?.id ? "Posodobi sejo" : "Ustvari sejo"}
        </Button>
      </div>
    </form>
  );
}
