"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import type { NetworkSwitchInput } from "@securitydesk/shared";
import { createNetworkSwitch, updateNetworkSwitch } from "@/server/network";

type Option = { id: string; name: string; customerId?: string };

type Props = {
  mode: "create" | "edit";
  switchId?: string;
  initial?: Partial<NetworkSwitchInput>;
  customers: Option[];
  sites: Option[];
};

export function SwitchForm({ mode, switchId, initial, customers, sites }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<NetworkSwitchInput>({
    name: initial?.name ?? "",
    customerId: initial?.customerId ?? "",
    siteId: initial?.siteId ?? "",
    deviceId: initial?.deviceId ?? "",
    manufacturer: initial?.manufacturer ?? "",
    model: initial?.model ?? "",
    ipAddress: initial?.ipAddress ?? "",
    macAddress: initial?.macAddress ?? "",
    serialNumber: initial?.serialNumber ?? "",
    portCount: initial?.portCount ?? 24,
    poeBudgetWatts: initial?.poeBudgetWatts ?? 370,
    location: initial?.location ?? "",
    rack: initial?.rack ?? "",
    uPosition: initial?.uPosition ?? "",
    firmware: initial?.firmware ?? "",
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof NetworkSwitchInput>(key: K, value: NetworkSwitchInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const filteredSites = sites.filter((s) => !form.customerId || s.customerId === form.customerId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createNetworkSwitch(form)
          : await updateNetworkSwitch(switchId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const id = mode === "create" && result.data ? result.data.id : switchId!;
      router.push(`/network/${id}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Ime stikala *</Label>
        <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
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
        <Label>Objekt</Label>
        <Select value={form.siteId ?? ""} onChange={(e) => set("siteId", e.target.value)}>
          <option value="">—</option>
          {filteredSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Proizvajalec</Label>
        <Input value={form.manufacturer ?? ""} onChange={(e) => set("manufacturer", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Model</Label>
        <Input value={form.model ?? ""} onChange={(e) => set("model", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>IP</Label>
        <Input value={form.ipAddress ?? ""} onChange={(e) => set("ipAddress", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>MAC</Label>
        <Input value={form.macAddress ?? ""} onChange={(e) => set("macAddress", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Serijska št.</Label>
        <Input value={form.serialNumber ?? ""} onChange={(e) => set("serialNumber", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Firmware</Label>
        <Input value={form.firmware ?? ""} onChange={(e) => set("firmware", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Število portov</Label>
        <Input
          type="number"
          min={1}
          max={128}
          value={form.portCount}
          onChange={(e) => set("portCount", Number(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label>PoE budget (W)</Label>
        <Input
          type="number"
          min={0}
          step={1}
          value={form.poeBudgetWatts}
          onChange={(e) => set("poeBudgetWatts", Number(e.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label>Lokacija</Label>
        <Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Omara</Label>
        <Input value={form.rack ?? ""} onChange={(e) => set("rack", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>U-pozicija</Label>
        <Input value={form.uPosition ?? ""} onChange={(e) => set("uPosition", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Opombe</Label>
        <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : mode === "create" ? "Ustvari stikalo" : "Shrani"}
        </Button>
      </div>
    </form>
  );
}
