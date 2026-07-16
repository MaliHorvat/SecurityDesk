"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import type { FirmwareAffectedModelInput, RemediationCampaignInput } from "@securitydesk/shared";
import {
  addFirmwareAffectedModel,
  createRemediationCampaign,
  runFirmwareMatches,
} from "@/server/firmware-guard";

type Props = {
  advisoryId: string;
  canWrite: boolean;
};

export function FirmwareAdvisoryActions({ advisoryId, canWrite }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [model, setModel] = useState<FirmwareAffectedModelInput>({
    manufacturerName: "",
    deviceTypeName: "",
    versionPattern: "",
    matchStrategy: "equals",
    notes: "",
  });

  const [campaign, setCampaign] = useState<RemediationCampaignInput>({
    title: "",
    dueAt: "",
    notes: "",
  });

  function onAddModel(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await addFirmwareAffectedModel(advisoryId, model);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setModel({
        manufacturerName: "",
        deviceTypeName: "",
        versionPattern: "",
        matchStrategy: "equals",
        notes: "",
      });
      router.refresh();
    });
  }

  function onRunMatch() {
    if (!canWrite) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await runFirmwareMatches(advisoryId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo(`Najdenih ujemanj: ${result.data?.inserted ?? 0}`);
      router.refresh();
    });
  }

  function onCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await createRemediationCampaign(advisoryId, campaign);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo("Kampanja ustvarjena.");
      setCampaign({ title: "", dueAt: "", notes: "" });
      router.refresh();
    });
  }

  if (!canWrite) {
    return <p className="text-sm text-muted-foreground">Nimate pravic za urejanje FirmwareGuard.</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-600">{info}</p> : null}

      <form className="grid gap-3 rounded-xl border p-4" onSubmit={onAddModel}>
        <h3 className="text-sm font-semibold">Dodaj prizadet model</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Proizvajalec</Label>
            <Input
              required
              value={model.manufacturerName}
              onChange={(e) => setModel((p) => ({ ...p, manufacturerName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Tip naprave</Label>
            <Input
              required
              value={model.deviceTypeName}
              onChange={(e) => setModel((p) => ({ ...p, deviceTypeName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Firmware pattern</Label>
            <Input
              required
              value={model.versionPattern}
              onChange={(e) => setModel((p) => ({ ...p, versionPattern: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Strategija</Label>
            <Select
              value={model.matchStrategy}
              onChange={(e) =>
                setModel((p) => ({
                  ...p,
                  matchStrategy: e.target.value as FirmwareAffectedModelInput["matchStrategy"],
                }))
              }
            >
              <option value="equals">equals</option>
              <option value="starts_with">starts_with</option>
            </Select>
          </div>
        </div>
        <Textarea
          rows={2}
          placeholder="Opombe"
          value={model.notes ?? ""}
          onChange={(e) => setModel((p) => ({ ...p, notes: e.target.value }))}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            Dodaj model
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={onRunMatch}>
          Zaženi ujemanje naprav
        </Button>
      </div>

      <form className="grid gap-3 rounded-xl border p-4" onSubmit={onCreateCampaign}>
        <h3 className="text-sm font-semibold">Remediation kampanja</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Naslov</Label>
            <Input
              required
              value={campaign.title}
              onChange={(e) => setCampaign((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Rok</Label>
            <Input
              type="date"
              value={campaign.dueAt ?? ""}
              onChange={(e) => setCampaign((p) => ({ ...p, dueAt: e.target.value }))}
            />
          </div>
        </div>
        <Textarea
          rows={2}
          placeholder="Opombe"
          value={campaign.notes ?? ""}
          onChange={(e) => setCampaign((p) => ({ ...p, notes: e.target.value }))}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            Ustvari kampanjo
          </Button>
        </div>
      </form>
    </div>
  );
}
