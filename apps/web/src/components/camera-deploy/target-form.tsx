"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label } from "@securitydesk/ui";
import type { CameraDeployTargetInput } from "@securitydesk/shared";
import { addCameraDeployTarget } from "@/server/camera-deploy";

type Props = {
  sessionId: string;
};

export function CameraDeployTargetForm({ sessionId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CameraDeployTargetInput>({
    sessionId,
    name: "",
    locationLabel: "",
    manufacturer: "",
    model: "",
    macAddress: "",
    serialNumber: "",
    currentIp: "",
    targetIp: "",
    username: "",
    password: "",
    channelNumber: null,
    deviceId: "",
  });

  function set<K extends keyof CameraDeployTargetInput>(key: K, value: CameraDeployTargetInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCameraDeployTarget(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setForm({
        sessionId,
        name: "",
        locationLabel: "",
        manufacturer: "",
        model: "",
        macAddress: "",
        serialNumber: "",
        currentIp: "",
        targetIp: "",
        username: "",
        password: "",
        channelNumber: null,
        deviceId: "",
      });
    });
  }

  return (
    <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
      {error ? <p className="text-sm text-destructive md:col-span-3">{error}</p> : null}
      <div className="space-y-2">
        <Label>Ime kamere *</Label>
        <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Lokacija</Label>
        <Input value={form.locationLabel ?? ""} onChange={(e) => set("locationLabel", e.target.value)} />
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
        <Label>MAC</Label>
        <Input value={form.macAddress ?? ""} onChange={(e) => set("macAddress", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Serijska št.</Label>
        <Input value={form.serialNumber ?? ""} onChange={(e) => set("serialNumber", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Trenutni IP</Label>
        <Input value={form.currentIp ?? ""} onChange={(e) => set("currentIp", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Ciljni IP</Label>
        <Input value={form.targetIp ?? ""} onChange={(e) => set("targetIp", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Kanal NVR</Label>
        <Input
          type="number"
          min={1}
          max={256}
          value={form.channelNumber ?? ""}
          onChange={(e) => set("channelNumber", e.target.value ? Number(e.target.value) : null)}
        />
      </div>
      <div className="md:col-span-3">
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? "Dodajam…" : "Dodaj kamero"}
        </Button>
      </div>
    </form>
  );
}
