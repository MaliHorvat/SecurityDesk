"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from "@securitydesk/ui";
import type { MaterialItem, ServicePhoto, WorkOrderInput } from "@securitydesk/shared";
import { createWorkOrder, updateWorkOrder } from "@/server/service";

type Props = {
  ticketId: string;
  workOrderId?: string;
  initial?: Partial<WorkOrderInput>;
  defaultTechnician?: string;
};

function toLocalInput(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WorkOrderForm({ ticketId, workOrderId, initial, defaultTechnician }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!workOrderId);
  const [form, setForm] = useState({
    assignedToName: initial?.assignedToName ?? defaultTechnician ?? "",
    status: initial?.status ?? ("planned" as WorkOrderInput["status"]),
    scheduledAt: initial?.scheduledAt ?? "",
    arrivedAt: initial?.arrivedAt ?? "",
    departedAt: initial?.departedAt ?? "",
    travelCost: initial?.travelCost ?? 0,
    workDone: initial?.workDone ?? "",
    measurements: initial?.measurements ?? "",
    findings: initial?.findings ?? "",
    recommendations: initial?.recommendations ?? "",
    materials: (initial?.materials ?? []) as MaterialItem[],
    photos: (initial?.photos ?? []) as ServicePhoto[],
    technicianSignatureName: initial?.technicianSignatureName ?? "",
    customerSignatureName: initial?.customerSignatureName ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addMaterial() {
    set("materials", [...form.materials, { name: "", quantity: 1, unit: "kos", notes: "" }]);
  }

  function addPhoto() {
    set("photos", [...form.photos, { kind: "other", caption: "", url: "" }]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        ticketId,
        technicianSignatureData: "",
        customerSignatureData: "",
      };
      const result = workOrderId
        ? await updateWorkOrder(workOrderId, payload)
        : await createWorkOrder(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open && workOrderId) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Uredi nalog
      </Button>
    );
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Nov delovni nalog
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{workOrderId ? "Uredi delovni nalog" : "Nov delovni nalog"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Tehnik</Label>
            <Input
              value={form.assignedToName}
              onChange={(e) => set("assignedToName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value as WorkOrderInput["status"])}
            >
              <option value="planned">Načrtovan</option>
              <option value="in_progress">V teku</option>
              <option value="completed">Zaključen</option>
              <option value="cancelled">Preklican</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Termin</Label>
            <Input
              type="datetime-local"
              value={form.scheduledAt || toLocalInput(initial?.scheduledAt)}
              onChange={(e) => set("scheduledAt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Potni stroški (€)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.travelCost}
              onChange={(e) => set("travelCost", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Prihod</Label>
            <Input type="datetime-local" value={form.arrivedAt} onChange={(e) => set("arrivedAt", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Odhod</Label>
            <Input type="datetime-local" value={form.departedAt} onChange={(e) => set("departedAt", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Opravljeno delo</Label>
            <Textarea rows={3} value={form.workDone} onChange={(e) => set("workDone", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Meritve</Label>
            <Textarea rows={2} value={form.measurements} onChange={(e) => set("measurements", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Ugotovitve</Label>
            <Textarea rows={2} value={form.findings} onChange={(e) => set("findings", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Priporočila</Label>
            <Textarea
              rows={2}
              value={form.recommendations}
              onChange={(e) => set("recommendations", e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Material</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                Dodaj
              </Button>
            </div>
            {form.materials.map((m, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-4">
                <Input
                  placeholder="Naziv"
                  value={m.name}
                  onChange={(e) => {
                    const next = [...form.materials];
                    next[i] = { ...m, name: e.target.value };
                    set("materials", next);
                  }}
                />
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={m.quantity}
                  onChange={(e) => {
                    const next = [...form.materials];
                    next[i] = { ...m, quantity: Number(e.target.value) };
                    set("materials", next);
                  }}
                />
                <Input
                  placeholder="Enota"
                  value={m.unit}
                  onChange={(e) => {
                    const next = [...form.materials];
                    next[i] = { ...m, unit: e.target.value };
                    set("materials", next);
                  }}
                />
                <Input
                  placeholder="Opomba"
                  value={m.notes ?? ""}
                  onChange={(e) => {
                    const next = [...form.materials];
                    next[i] = { ...m, notes: e.target.value };
                    set("materials", next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Fotografije (URL)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPhoto}>
                Dodaj
              </Button>
            </div>
            {form.photos.map((p, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-3">
                <Select
                  value={p.kind}
                  onChange={(e) => {
                    const next = [...form.photos];
                    next[i] = { ...p, kind: e.target.value as ServicePhoto["kind"] };
                    set("photos", next);
                  }}
                >
                  <option value="before">Pred</option>
                  <option value="after">Po</option>
                  <option value="other">Drugo</option>
                </Select>
                <Input
                  placeholder="Napis"
                  value={p.caption ?? ""}
                  onChange={(e) => {
                    const next = [...form.photos];
                    next[i] = { ...p, caption: e.target.value };
                    set("photos", next);
                  }}
                />
                <Input
                  placeholder="https://…"
                  value={p.url ?? ""}
                  onChange={(e) => {
                    const next = [...form.photos];
                    next[i] = { ...p, url: e.target.value };
                    set("photos", next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Podpis tehnika (ime)</Label>
            <Input
              value={form.technicianSignatureName}
              onChange={(e) => set("technicianSignatureName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Podpis stranke (ime)</Label>
            <Input
              value={form.customerSignatureName}
              onChange={(e) => set("customerSignatureName", e.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "…" : "Shrani nalog"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Prekliči
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
