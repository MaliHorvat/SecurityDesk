"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select } from "@securitydesk/ui";
import {
  MONITORING_CHECK_TYPE_LABELS,
  MONITORING_CHECK_TYPES,
  type MonitoringCheckInput,
} from "@securitydesk/shared";
import { createMonitoringCheck } from "@/server/monitoring";

type Option = { id: string; name: string; ipAddress?: string | null };

export function MonitoringCheckForm({
  devices,
  agents,
}: {
  devices: Option[];
  agents: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MonitoringCheckInput>({
    deviceId: devices[0]?.id ?? "",
    agentId: "",
    name: "",
    checkType: "ping",
    targetHost: devices[0]?.ipAddress ?? "",
    targetPort: null,
    targetPath: "",
    intervalSeconds: 60,
    timeoutMs: 5000,
    enabled: true,
  });

  function set<K extends keyof MonitoringCheckInput>(key: K, value: MonitoringCheckInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onDeviceChange(deviceId: string) {
    const device = devices.find((d) => d.id === deviceId);
    setForm((prev) => ({
      ...prev,
      deviceId,
      targetHost: device?.ipAddress || prev.targetHost,
      name: prev.name || (device ? `Ping – ${device.name}` : prev.name),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createMonitoringCheck(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      set("name", "");
      router.refresh();
    });
  }

  return (
    <form className="space-y-4 rounded-xl border bg-card p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold">Novo preverjanje</h2>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Naprava</Label>
          <Select value={form.deviceId} onChange={(e) => onDeviceChange(e.target.value)} required>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Agent (opcijsko)</Label>
          <Select value={form.agentId ?? ""} onChange={(e) => set("agentId", e.target.value)}>
            <option value="">Vsi agenti v org</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Ime</Label>
          <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Tip</Label>
          <Select
            value={form.checkType}
            onChange={(e) => set("checkType", e.target.value as MonitoringCheckInput["checkType"])}
          >
            {MONITORING_CHECK_TYPES.map((t) => (
              <option key={t} value={t}>
                {MONITORING_CHECK_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Gostitelj / IP</Label>
          <Input required value={form.targetHost} onChange={(e) => set("targetHost", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Vrata</Label>
          <Input
            type="number"
            min={1}
            max={65535}
            value={form.targetPort ?? ""}
            onChange={(e) => set("targetPort", e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending || !form.deviceId}>
        {pending ? "Shranjujem…" : "Dodaj preverjanje"}
      </Button>
    </form>
  );
}
