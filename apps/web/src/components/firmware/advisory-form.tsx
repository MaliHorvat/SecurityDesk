"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import type { FirmwareAdvisoryInput } from "@securitydesk/shared";
import { createFirmwareAdvisory } from "@/server/firmware-guard";

export function FirmwareAdvisoryForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FirmwareAdvisoryInput>({
    title: "",
    vendor: "",
    description: "",
    severity: "normal",
    recommendedAction: "",
    officialUrl: "",
    dueAt: "",
  });

  function set<K extends keyof FirmwareAdvisoryInput>(key: K, value: FirmwareAdvisoryInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createFirmwareAdvisory(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/firmware/${result.data!.id}`);
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
        <Label htmlFor="vendor">Proizvajalec *</Label>
        <Input id="vendor" required value={form.vendor} onChange={(e) => set("vendor", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Resnost</Label>
        <Select value={form.severity} onChange={(e) => set("severity", e.target.value as FirmwareAdvisoryInput["severity"])}>
          <option value="low">Nizka</option>
          <option value="normal">Normalna</option>
          <option value="high">Visoka</option>
          <option value="urgent">Nujna</option>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Opis</Label>
        <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Priporočeno dejanje</Label>
        <Textarea
          rows={3}
          value={form.recommendedAction ?? ""}
          onChange={(e) => set("recommendedAction", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Uradna povezava</Label>
        <Input value={form.officialUrl ?? ""} onChange={(e) => set("officialUrl", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Rok</Label>
        <Input type="date" value={form.dueAt ?? ""} onChange={(e) => set("dueAt", e.target.value)} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Shranjujem…" : "Ustvari advisory"}
        </Button>
      </div>
    </form>
  );
}
