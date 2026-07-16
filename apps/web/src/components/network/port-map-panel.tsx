"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea, cn } from "@securitydesk/ui";
import {
  POE_STATE_LABELS,
  PORT_ROLE_LABELS,
  PORT_STATUS_LABELS,
  resolvePortVisualState,
  type NetworkPortInput,
  type PortVisualState,
} from "@securitydesk/shared";
import { updateNetworkPort } from "@/server/network";

type PortRow = {
  id: string;
  portNumber: number;
  name: string;
  description: string | null;
  status: NetworkPortInput["status"];
  role: NetworkPortInput["role"];
  speedMbps: number | null;
  duplex: string | null;
  poeState: NetworkPortInput["poeState"];
  poeWatts: number;
  accessVlan: number | null;
  taggedVlans: string | null;
  connectedDeviceId: string | null;
  connectedDeviceLabel: string | null;
};

type DeviceOption = { id: string; name: string };

const VISUAL_STYLES: Record<PortVisualState, string> = {
  free: "bg-muted text-muted-foreground border-border",
  occupied: "bg-sky-600 text-white border-sky-700",
  error: "bg-red-600 text-white border-red-700",
  uplink: "bg-amber-500 text-white border-amber-600",
  trunk: "bg-violet-600 text-white border-violet-700",
  poe_warning: "bg-orange-500 text-white border-orange-600",
};

const VISUAL_LABELS: Record<PortVisualState, string> = {
  free: "Prost",
  occupied: "Zaseden",
  error: "Napaka",
  uplink: "Uplink",
  trunk: "Trunk",
  poe_warning: "PoE opozorilo",
};

type Props = {
  ports: Array<{ port: PortRow; deviceName: string | null }>;
  devices: DeviceOption[];
  canWrite: boolean;
};

export function PortMapPanel({ ports, devices, canWrite }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(ports[0]?.port.id ?? null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selected = ports.find((p) => p.port.id === selectedId);

  const [form, setForm] = useState<Omit<NetworkPortInput, "switchId"> | null>(null);

  function selectPort(port: PortRow) {
    setSelectedId(port.id);
    setForm({
      portNumber: port.portNumber,
      name: port.name,
      description: port.description ?? "",
      status: port.status,
      role: port.role,
      speedMbps: port.speedMbps,
      duplex: port.duplex ?? "",
      poeState: port.poeState,
      poeWatts: port.poeWatts,
      accessVlan: port.accessVlan,
      taggedVlans: port.taggedVlans ?? "",
      connectedDeviceId: port.connectedDeviceId ?? "",
      connectedDeviceLabel: port.connectedDeviceLabel ?? "",
    });
    setError(null);
  }

  // Keep form in sync when selection changes from parent refresh
  const activeForm =
    form && selected && form.portNumber === selected.port.portNumber
      ? form
      : selected
        ? {
            portNumber: selected.port.portNumber,
            name: selected.port.name,
            description: selected.port.description ?? "",
            status: selected.port.status,
            role: selected.port.role,
            speedMbps: selected.port.speedMbps,
            duplex: selected.port.duplex ?? "",
            poeState: selected.port.poeState,
            poeWatts: selected.port.poeWatts,
            accessVlan: selected.port.accessVlan,
            taggedVlans: selected.port.taggedVlans ?? "",
            connectedDeviceId: selected.port.connectedDeviceId ?? "",
            connectedDeviceLabel: selected.port.connectedDeviceLabel ?? "",
          }
        : null;

  function save() {
    if (!selected || !activeForm || !canWrite) return;
    setError(null);
    startTransition(async () => {
      const r = await updateNetworkPort(selected.port.id, activeForm);
      if (!r.ok) setError(r.error);
      else {
        setForm(activeForm);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sprednja stran stikala</h2>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(Object.keys(VISUAL_LABELS) as PortVisualState[]).map((k) => (
            <span
              key={k}
              className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-0.5", VISUAL_STYLES[k])}
            >
              {VISUAL_LABELS[k]}
            </span>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-12">
            {ports.map(({ port, deviceName }) => {
              const visual = resolvePortVisualState(port);
              return (
                <button
                  key={port.id}
                  type="button"
                  title={`${port.name}${deviceName || port.connectedDeviceLabel ? ` · ${deviceName || port.connectedDeviceLabel}` : ""}`}
                  onClick={() => selectPort(port)}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center rounded-md border text-[10px] font-medium transition",
                    VISUAL_STYLES[visual],
                    selectedId === port.id && "ring-2 ring-offset-2 ring-primary",
                  )}
                >
                  <span>{port.portNumber}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selected && activeForm ? (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 font-semibold">
            Port {selected.port.name}
            {selected.deviceName ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {selected.deviceName}
              </span>
            ) : null}
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Ime</Label>
              <Input
                disabled={!canWrite}
                value={activeForm.name}
                onChange={(e) => setForm({ ...activeForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                disabled={!canWrite}
                value={activeForm.status}
                onChange={(e) =>
                  setForm({ ...activeForm, status: e.target.value as NetworkPortInput["status"] })
                }
              >
                {Object.entries(PORT_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vloga</Label>
              <Select
                disabled={!canWrite}
                value={activeForm.role}
                onChange={(e) =>
                  setForm({ ...activeForm, role: e.target.value as NetworkPortInput["role"] })
                }
              >
                {Object.entries(PORT_ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Access VLAN</Label>
              <Input
                disabled={!canWrite}
                type="number"
                value={activeForm.accessVlan ?? ""}
                onChange={(e) =>
                  setForm({
                    ...activeForm,
                    accessVlan: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tagged VLAN-i</Label>
              <Input
                disabled={!canWrite}
                value={activeForm.taggedVlans ?? ""}
                onChange={(e) => setForm({ ...activeForm, taggedVlans: e.target.value })}
                placeholder="10,20,30"
              />
            </div>
            <div className="space-y-2">
              <Label>Hitrost (Mbps)</Label>
              <Input
                disabled={!canWrite}
                type="number"
                value={activeForm.speedMbps ?? ""}
                onChange={(e) =>
                  setForm({
                    ...activeForm,
                    speedMbps: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>PoE</Label>
              <Select
                disabled={!canWrite}
                value={activeForm.poeState}
                onChange={(e) =>
                  setForm({
                    ...activeForm,
                    poeState: e.target.value as NetworkPortInput["poeState"],
                  })
                }
              >
                {Object.entries(POE_STATE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>PoE (W)</Label>
              <Input
                disabled={!canWrite}
                type="number"
                step={0.1}
                min={0}
                value={activeForm.poeWatts}
                onChange={(e) => setForm({ ...activeForm, poeWatts: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Povezana naprava</Label>
              <Select
                disabled={!canWrite}
                value={activeForm.connectedDeviceId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = devices.find((d) => d.id === id)?.name ?? "";
                  setForm({
                    ...activeForm,
                    connectedDeviceId: id,
                    connectedDeviceLabel: name || activeForm.connectedDeviceLabel,
                  });
                }}
              >
                <option value="">—</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Oznaka / opis naprave</Label>
              <Input
                disabled={!canWrite}
                value={activeForm.connectedDeviceLabel ?? ""}
                onChange={(e) => setForm({ ...activeForm, connectedDeviceLabel: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Opis</Label>
              <Textarea
                disabled={!canWrite}
                rows={2}
                value={activeForm.description ?? ""}
                onChange={(e) => setForm({ ...activeForm, description: e.target.value })}
              />
            </div>
          </div>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          {canWrite ? (
            <Button className="mt-4" type="button" disabled={pending} onClick={save}>
              {pending ? "…" : "Shrani port"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-2 font-medium">Port</th>
              <th className="p-2 font-medium">Naprava</th>
              <th className="p-2 font-medium">VLAN</th>
              <th className="p-2 font-medium">PoE</th>
              <th className="p-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ports.map(({ port, deviceName }) => (
              <tr
                key={port.id}
                className={cn(
                  "cursor-pointer border-t hover:bg-muted/30",
                  selectedId === port.id && "bg-muted/40",
                )}
                onClick={() => selectPort(port)}
              >
                <td className="p-2 font-medium">{port.name}</td>
                <td className="p-2 text-muted-foreground">
                  {deviceName || port.connectedDeviceLabel || "—"}
                </td>
                <td className="p-2 text-muted-foreground">{port.accessVlan ?? "—"}</td>
                <td className="p-2 text-muted-foreground">
                  {port.poeState === "on" ? `${port.poeWatts} W` : "—"}
                </td>
                <td className="p-2">{PORT_STATUS_LABELS[port.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
