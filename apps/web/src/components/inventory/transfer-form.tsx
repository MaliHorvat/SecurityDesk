"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@securitydesk/ui";
import { transferInventoryAction } from "@/server/inventory";

type Option = { id: string; name: string; sku?: string };

export function InventoryTransferForm({
  items,
  locations,
}: {
  items: Option[];
  locations: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sourceLocationId, setSourceLocationId] = useState(locations[0]?.id ?? "");
  const [destinationLocationId, setDestinationLocationId] = useState(locations[1]?.id ?? locations[0]?.id ?? "");
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await transferInventoryAction({
        sourceLocationId,
        destinationLocationId,
        inventoryItemId,
        quantity,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQuantity(1);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prenos med lokacijami</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
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
              <Label>Izvor</Label>
              <Select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cilj</Label>
              <Select
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
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
            <Label>Opombe</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending || !inventoryItemId}>
            {pending ? "Prenašam…" : "Prenesi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
