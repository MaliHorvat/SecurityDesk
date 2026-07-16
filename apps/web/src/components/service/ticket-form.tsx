"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, Textarea } from "@securitydesk/ui";
import {
  SERVICE_TICKET_CATEGORIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type ServiceTicketInput,
} from "@securitydesk/shared";
import { createServiceTicket, updateServiceTicket } from "@/server/service";

type Option = { id: string; name: string; customerId?: string };

type Props = {
  mode: "create" | "edit";
  ticketId?: string;
  initial?: Partial<ServiceTicketInput>;
  customers: Option[];
  sites: Option[];
  devices: Option[];
};

const CATEGORY_LABELS: Record<(typeof SERVICE_TICKET_CATEGORIES)[number], string> = {
  general: "Splošno",
  cctv: "CCTV",
  alarm: "Alarm",
  access: "Dostop",
  network: "Omrežje",
  ups: "UPS",
  other: "Drugo",
};

export function TicketForm({ mode, ticketId, initial, customers, sites, devices }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceTicketInput>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    customerId: initial?.customerId ?? "",
    siteId: initial?.siteId ?? "",
    deviceId: initial?.deviceId ?? "",
    category: initial?.category ?? "general",
    priority: initial?.priority ?? "normal",
    status: initial?.status ?? "open",
    preferredAt: initial?.preferredAt ?? "",
    attachmentNotes: initial?.attachmentNotes ?? "",
  });

  function set<K extends keyof ServiceTicketInput>(key: K, value: ServiceTicketInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const filteredSites = sites.filter((s) => !form.customerId || s.customerId === form.customerId);
  const filteredDevices = devices.filter(
    (d) => !form.customerId || !d.customerId || d.customerId === form.customerId,
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createServiceTicket(form)
          : await updateServiceTicket(ticketId!, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const id = mode === "create" && result.data ? result.data.id : ticketId!;
      router.push(`/service/${id}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">Naslov *</Label>
        <Input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerId">Stranka *</Label>
        <Select
          id="customerId"
          required
          value={form.customerId}
          onChange={(e) => {
            set("customerId", e.target.value);
            set("siteId", "");
            set("deviceId", "");
          }}
        >
          <option value="">Izberite…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="siteId">Objekt</Label>
        <Select id="siteId" value={form.siteId ?? ""} onChange={(e) => set("siteId", e.target.value)}>
          <option value="">—</option>
          {filteredSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deviceId">Naprava</Label>
        <Select id="deviceId" value={form.deviceId ?? ""} onChange={(e) => set("deviceId", e.target.value)}>
          <option value="">—</option>
          {filteredDevices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Kategorija</Label>
        <Select
          id="category"
          value={form.category}
          onChange={(e) => set("category", e.target.value as ServiceTicketInput["category"])}
        >
          {SERVICE_TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="priority">Prioriteta</Label>
        <Select
          id="priority"
          value={form.priority}
          onChange={(e) => set("priority", e.target.value as ServiceTicketInput["priority"])}
        >
          {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          id="status"
          value={form.status}
          onChange={(e) => set("status", e.target.value as ServiceTicketInput["status"])}
        >
          {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="preferredAt">Želeni termin</Label>
        <Input
          id="preferredAt"
          type="datetime-local"
          value={form.preferredAt ?? ""}
          onChange={(e) => set("preferredAt", e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Opis napake</Label>
        <Textarea
          id="description"
          rows={4}
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="attachmentNotes">Priloge / opombe</Label>
        <Textarea
          id="attachmentNotes"
          rows={2}
          value={form.attachmentNotes ?? ""}
          onChange={(e) => set("attachmentNotes", e.target.value)}
          placeholder="Povezave do fotografij, videa ali drugih prilog"
        />
      </div>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : mode === "create" ? "Ustvari zahtevek" : "Shrani"}
        </Button>
      </div>
    </form>
  );
}
