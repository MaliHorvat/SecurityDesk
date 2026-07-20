"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@securitydesk/ui";
import { releaseReservationAction, reserveInventoryAction } from "@/server/inventory";

type Option = { id: string; name: string; sku?: string };

export function InventoryReservationForm({
  items,
  locations,
}: {
  items: Option[];
  locations: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await reserveInventoryAction({
        inventoryItemId,
        locationId,
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
        <CardTitle className="text-base">Nova rezervacija</CardTitle>
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
          <Button type="submit" disabled={pending || !inventoryItemId || !locationId}>
            {pending ? "Rezerviram…" : "Rezerviraj"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ReleaseReservationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await releaseReservationAction(id);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "…" : "Sprosti"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
