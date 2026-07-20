"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@securitydesk/ui";
import { type InventoryLocationInput, type InventoryLocationType } from "@securitydesk/shared";
import { createInventoryLocationAction } from "@/server/inventory";
import { INVENTORY_LOCATION_TYPE_LABELS, INVENTORY_LOCATION_TYPES } from "./labels";

export function InventoryLocationForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryLocationInput>({
    name: "",
    locationType: "warehouse",
    parentId: "",
    siteId: "",
    assignedUserId: "",
    address: "",
    description: "",
    isActive: true,
  });

  function set<K extends keyof InventoryLocationInput>(key: K, value: InventoryLocationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInventoryLocationAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      set("name", "");
      set("address", "");
      set("description", "");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nova lokacija</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label>Ime</Label>
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tip</Label>
            <Select
              value={form.locationType}
              onChange={(e) => set("locationType", e.target.value as InventoryLocationType)}
            >
              {INVENTORY_LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {INVENTORY_LOCATION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Naslov</Label>
            <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Shranjujem…" : "Dodaj lokacijo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
