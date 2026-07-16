"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import { createDevice, updateDevice } from "@/server/devices";
import type { DeviceInput } from "@securitydesk/shared";

type Option = { id: string; name: string; customerId?: string };

type Props = {
  mode: "create" | "edit";
  deviceId?: string;
  customers: Option[];
  sites: Option[];
  initial?: Partial<DeviceInput>;
};

export function DeviceForm({ mode, deviceId, customers, sites, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DeviceInput>({
    name: initial?.name ?? "",
    customerId: initial?.customerId ?? "",
    siteId: initial?.siteId ?? "",
    buildingId: initial?.buildingId ?? "",
    floorId: initial?.floorId ?? "",
    roomId: initial?.roomId ?? "",
    deviceTypeName: initial?.deviceTypeName ?? "",
    manufacturerName: initial?.manufacturerName ?? "",
    model: initial?.model ?? "",
    serialNumber: initial?.serialNumber ?? "",
    inventoryNumber: initial?.inventoryNumber ?? "",
    macAddress: initial?.macAddress ?? "",
    ipAddress: initial?.ipAddress ?? "",
    subnetMask: initial?.subnetMask ?? "",
    gateway: initial?.gateway ?? "",
    dns: initial?.dns ?? "",
    vlan: initial?.vlan ?? null,
    switchPort: initial?.switchPort ?? "",
    username: initial?.username ?? "",
    password: "",
    firmware: initial?.firmware ?? "",
    supplier: initial?.supplier ?? "",
    status: initial?.status ?? "active",
    tags: initial?.tags ?? "",
    notes: initial?.notes ?? "",
  });

  const filteredSites = form.customerId
    ? sites.filter((s) => !s.customerId || s.customerId === form.customerId)
    : sites;

  function set<K extends keyof DeviceInput>(key: K, value: DeviceInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = mode === "create" ? await createDevice(form) : await updateDevice(deviceId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(mode === "create" && result.data ? `/devices/${result.data.id}` : `/devices/${deviceId}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Ime naprave *</Label>
        <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerId">Stranka</Label>
        <Select
          id="customerId"
          value={form.customerId}
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
        <Label htmlFor="siteId">Objekt</Label>
        <Select id="siteId" value={form.siteId} onChange={(e) => set("siteId", e.target.value)}>
          <option value="">—</option>
          {filteredSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deviceTypeName">Vrsta</Label>
        <Input id="deviceTypeName" value={form.deviceTypeName} onChange={(e) => set("deviceTypeName", e.target.value)} placeholder="npr. IP kamera" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="manufacturerName">Proizvajalec</Label>
        <Input id="manufacturerName" value={form.manufacturerName} onChange={(e) => set("manufacturerName", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Input id="model" value={form.model} onChange={(e) => set("model", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" value={form.status} onChange={(e) => set("status", e.target.value as DeviceInput["status"])}>
          <option value="active">Aktivna</option>
          <option value="inactive">Neaktivna</option>
          <option value="maintenance">Vzdrževanje</option>
          <option value="decommissioned">Odpisana</option>
          <option value="unknown">Neznano</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="serialNumber">Serijska št.</Label>
        <Input id="serialNumber" value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="inventoryNumber">Inventarna št.</Label>
        <Input id="inventoryNumber" value={form.inventoryNumber} onChange={(e) => set("inventoryNumber", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ipAddress">IP naslov</Label>
        <Input id="ipAddress" value={form.ipAddress} onChange={(e) => set("ipAddress", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="macAddress">MAC</Label>
        <Input id="macAddress" value={form.macAddress} onChange={(e) => set("macAddress", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subnetMask">Maska</Label>
        <Input id="subnetMask" value={form.subnetMask} onChange={(e) => set("subnetMask", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gateway">Gateway</Label>
        <Input id="gateway" value={form.gateway} onChange={(e) => set("gateway", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dns">DNS</Label>
        <Input id="dns" value={form.dns} onChange={(e) => set("dns", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vlan">VLAN</Label>
        <Input
          id="vlan"
          type="number"
          value={form.vlan ?? ""}
          onChange={(e) => set("vlan", e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="switchPort">Port stikala</Label>
        <Input id="switchPort" value={form.switchPort} onChange={(e) => set("switchPort", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="firmware">Firmware</Label>
        <Input id="firmware" value={form.firmware} onChange={(e) => set("firmware", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Uporabniško ime</Label>
        <Input id="username" value={form.username} onChange={(e) => set("username", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Geslo (šifrirano)</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder={mode === "edit" ? "Pustite prazno, če ne spreminjate" : ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="supplier">Dobavitelj</Label>
        <Input id="supplier" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Oznake</Label>
        <Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="kamera, zunanja" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Opombe</Label>
        <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem…" : mode === "create" ? "Dodaj napravo" : "Shrani spremembe"}
        </Button>
      </div>
    </form>
  );
}
