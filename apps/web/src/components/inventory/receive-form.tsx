"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@securitydesk/ui";
import { receiveInventoryAction } from "@/server/inventory";

type Option = { id: string; name: string; sku?: string };

export function InventoryReceiveForm({
  items,
  locations,
}: {
  items: Option[];
  locations: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [serialNumbers, setSerialNumbers] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const serials = serialNumbers
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const result = await receiveInventoryAction({
        locationId,
        notes,
        lines: [
          {
            inventoryItemId,
            quantity,
            unitCost: unitCost === "" ? null : Number(unitCost),
            serialNumbers: serials.length > 0 ? serials : undefined,
          },
        ],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuantity(1);
      setUnitCost("");
      setNotes("");
      setSerialNumbers("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prejem na zalogo</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label>Lokacija</Label>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Artikel</Label>
            <Select value={inventoryItemId} onChange={(e) => setInventoryItemId(e.target.value)} required>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku ? `${i.sku} – ${i.name}` : i.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Količina</Label>
              <Input
                type="number"
                min={0.0001}
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Cena / enota</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Serijske številke (za serializirane artikle, ločene z vejico ali novo vrstico)</Label>
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={serialNumbers}
              onChange={(e) => setSerialNumbers(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Opombe</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending || !locationId || !inventoryItemId}>
            {pending ? "Prejemam…" : "Prejmi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
