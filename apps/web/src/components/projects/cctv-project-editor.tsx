"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from "@securitydesk/ui";
import {
  calculateCctvProject,
  createDefaultCameraGroup,
  createDefaultGlobals,
  type CameraGroupInput,
  type CctvProjectInput,
} from "@securitydesk/shared/cctv-calculator";
import { createCctvProject, updateCctvProject } from "@/server/projects";
import { CctvResultsPanel } from "@/components/projects/cctv-results";
import { buildProjectExportCsv, buildSuggestedEquipment, buildSuggestedVlans } from "@/lib/cctv-export";

type Option = { id: string; name: string };

type Props = {
  mode: "create" | "edit";
  projectId?: string;
  customers: Option[];
  sites: Option[];
  initial?: CctvProjectInput;
  orgName?: string;
};

function newId() {
  return globalThis.crypto.randomUUID();
}

export function CctvProjectEditor({ mode, projectId, customers, sites, initial, orgName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CctvProjectInput>(
    initial ?? {
      name: "Nov CCTV projekt",
      description: "",
      customerId: "",
      siteId: "",
      status: "draft",
      globals: createDefaultGlobals(),
      groups: [createDefaultCameraGroup(newId())],
    },
  );

  const liveResult = useMemo(() => {
    try {
      return calculateCctvProject(form.globals, form.groups);
    } catch {
      return null;
    }
  }, [form]);

  function updateGroup(id: string, patch: Partial<CameraGroupInput>) {
    setForm((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create" ? await createCctvProject(form) : await updateCctvProject(projectId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const id = mode === "create" && result.data ? result.data.id : projectId!;
      router.push(`/projects/${id}`);
      router.refresh();
    });
  }

  async function exportCsv() {
    if (!liveResult) return;
    const csv = buildProjectExportCsv(form.name, form, liveResult);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!liveResult) return;
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF();
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "SecurityDesk";
    doc.setFontSize(16);
    doc.text(`${appName} – CCTV projekt`, 14, 18);
    doc.setFontSize(11);
    doc.text(form.name, 14, 26);
    if (orgName) doc.text(`Organizacija: ${orgName}`, 14, 32);
    doc.text(`Kamere: ${liveResult.totalCameras}  |  Hramba: ${liveResult.totalRequiredTb} TB`, 14, 40);

    // jspdf-autotable attaches autoTable onto jsPDF prototype
    (
      doc as unknown as {
        autoTable: (opts: Record<string, unknown>) => void;
        lastAutoTable?: { finalY: number };
      }
    ).autoTable({
      startY: 46,
      head: [["Skupina", "Kamere", "Bitrate", "Dnevno GB", "Hramba GB"]],
      body: liveResult.groups.map((g) => [
        g.name,
        String(g.cameraCount),
        String(g.effectiveBitrateMbps),
        String(g.dailyGb),
        String(g.totalRetentionGb),
      ]),
    });

    const y =
      ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60) + 10;
    doc.text("Predlagana oprema:", 14, y);
    buildSuggestedEquipment(liveResult).forEach((line, i) => {
      doc.text(`• ${line}`, 16, y + 8 + i * 6);
    });

    const vlanY = y + 8 + buildSuggestedEquipment(liveResult).length * 6 + 8;
    doc.text("Predlagani VLAN-i:", 14, vlanY);
    buildSuggestedVlans().forEach((v, i) => {
      doc.text(`VLAN ${v.vlan} ${v.name} – ${v.purpose}`, 16, vlanY + 8 + i * 6);
    });

    doc.save(`${form.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Osnovni podatki</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Naziv projekta *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Stranka</Label>
            <Select
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
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
            <Select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>
              <option value="">—</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Opis</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Globalne nastavitve</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["retentionDays", "Dnevi hrambe"],
              ["reservePercent", "Rezerva %"],
              ["raidFactor", "RAID faktor"],
              ["spareCapacityTb", "Rezervna kapaciteta TB"],
              ["growthPercent", "Rast %"],
              ["diskSizeTb", "Velikost diska TB"],
              ["clientsCount", "Odjemalci"],
              ["clientBitrateMbps", "Bitrate odjemalca"],
              ["maxRecorderBandwidthMbps", "Max Mbps snemalnika"],
              ["maxPortsPerRecorder", "Max portov/snemalnik"],
              ["poeBudgetWatts", "PoE budget W"],
              ["wattsPerCamera", "W / kamera"],
              ["upsCapacityWh", "UPS Wh"],
              ["systemLoadWatts", "Obremenitev W"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                step="any"
                value={form.globals[key]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    globals: { ...form.globals, [key]: Number(e.target.value) },
                  })
                }
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label>Enote</Label>
            <Select
              value={form.globals.useBinaryTb ? "binary" : "decimal"}
              onChange={(e) =>
                setForm({
                  ...form,
                  globals: { ...form.globals, useBinaryTb: e.target.value === "binary" },
                })
              }
            >
              <option value="binary">Binarni (TiB)</option>
              <option value="decimal">Decimalni (TB)</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Skupine kamer</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setForm({
                ...form,
                groups: [
                  ...form.groups,
                  { ...createDefaultCameraGroup(newId()), name: `Skupina ${form.groups.length + 1}` },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" />
            Dodaj skupino
          </Button>
        </div>

        {form.groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{group.name}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={form.groups.length === 1}
                onClick={() => setForm({ ...form, groups: form.groups.filter((g) => g.id !== group.id) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Naziv</Label>
                <Input value={group.name} onChange={(e) => updateGroup(group.id, { name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Št. kamer</Label>
                <Input
                  type="number"
                  value={group.cameraCount}
                  onChange={(e) => updateGroup(group.id, { cameraCount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bitrate Mbps</Label>
                <Input
                  type="number"
                  step="any"
                  value={group.bitrateMbps}
                  onChange={(e) => updateGroup(group.id, { bitrateMbps: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ločljivost</Label>
                <Input value={group.resolution} onChange={(e) => updateGroup(group.id, { resolution: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Codec</Label>
                <Input value={group.codec} onChange={(e) => updateGroup(group.id, { codec: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>FPS</Label>
                <Input
                  type="number"
                  value={group.fps}
                  onChange={(e) => updateGroup(group.id, { fps: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Način snemanja</Label>
                <Select
                  value={group.recordingMode}
                  onChange={(e) =>
                    updateGroup(group.id, {
                      recordingMode: e.target.value as CameraGroupInput["recordingMode"],
                    })
                  }
                >
                  <option value="continuous">Kontinuirano</option>
                  <option value="motion">Ob gibanju</option>
                  <option value="schedule">Urnik</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aktivnost %</Label>
                <Input
                  type="number"
                  value={group.activityPercent}
                  onChange={(e) => updateGroup(group.id, { activityPercent: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ure / dan</Label>
                <Input
                  type="number"
                  step="any"
                  value={group.recordingHoursPerDay}
                  onChange={(e) => updateGroup(group.id, { recordingHoursPerDay: Number(e.target.value) })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.audio}
                  onChange={(e) => updateGroup(group.id, { audio: e.target.checked })}
                />
                Zvok
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.secondaryStream}
                  onChange={(e) => updateGroup(group.id, { secondaryStream: e.target.checked })}
                />
                Dodatni tok
              </label>
            </CardContent>
          </Card>
        ))}
      </div>

      {liveResult ? <CctvResultsPanel result={liveResult} /> : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem…" : mode === "create" ? "Ustvari projekt" : "Shrani projekt"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void exportCsv()} disabled={!liveResult}>
          Izvoz Excel/CSV
        </Button>
        <Button type="button" variant="outline" onClick={() => void exportPdf()} disabled={!liveResult}>
          Izvoz PDF
        </Button>
      </div>
    </form>
  );
}
