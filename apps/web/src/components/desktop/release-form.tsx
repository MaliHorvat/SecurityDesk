"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from "@securitydesk/ui";
import {
  DESKTOP_CHANNELS,
  DESKTOP_CHANNEL_LABELS,
  type DesktopChannel,
  type DesktopReleaseCreateInput,
} from "@securitydesk/shared";
import { createDesktopRelease } from "@/server/desktop-releases";

export function DesktopReleaseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DesktopReleaseCreateInput>({
    version: "",
    channel: "internal",
    title: "",
    releaseNotes: "",
    status: "draft",
    isMandatory: false,
    minimumSupportedVersion: "",
    rolloutPercentage: 100,
    availableFrom: null,
    expiresAt: null,
  });

  function set<K extends keyof DesktopReleaseCreateInput>(key: K, value: DesktopReleaseCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDesktopRelease(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/settings/desktop/${result.data!.id}`);
      router.refresh();
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nova izdaja namizne aplikacije</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="version">Različica *</Label>
            <Input
              id="version"
              required
              placeholder="npr. 1.2.3"
              value={form.version}
              onChange={(e) => set("version", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Kanal</Label>
            <Select
              id="channel"
              value={form.channel}
              onChange={(e) => set("channel", e.target.value as DesktopChannel)}
            >
              {DESKTOP_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {DESKTOP_CHANNEL_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Naslov *</Label>
            <Input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="releaseNotes">Opis sprememb</Label>
            <Textarea
              id="releaseNotes"
              rows={5}
              value={form.releaseNotes ?? ""}
              onChange={(e) => set("releaseNotes", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimumSupportedVersion">Minimalna podprta različica</Label>
            <Input
              id="minimumSupportedVersion"
              placeholder="npr. 1.0.0"
              value={form.minimumSupportedVersion ?? ""}
              onChange={(e) => set("minimumSupportedVersion", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rolloutPercentage">Delež uvajanja (%)</Label>
            <Input
              id="rolloutPercentage"
              type="number"
              min={0}
              max={100}
              value={form.rolloutPercentage}
              onChange={(e) => set("rolloutPercentage", Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availableFrom">Na voljo od</Label>
            <Input
              id="availableFrom"
              type="date"
              value={form.availableFrom ? new Date(form.availableFrom).toISOString().slice(0, 10) : ""}
              onChange={(e) => set("availableFrom", e.target.value ? new Date(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Poteče</Label>
            <Input
              id="expiresAt"
              type="date"
              value={form.expiresAt ? new Date(form.expiresAt).toISOString().slice(0, 10) : ""}
              onChange={(e) => set("expiresAt", e.target.value ? new Date(e.target.value) : null)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={form.isMandatory}
              onChange={(e) => set("isMandatory", e.target.checked)}
            />
            Obvezna posodobitev (uporabniki je ne morejo preskočiti)
          </label>

          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Shranjujem…" : "Ustvari izdajo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
