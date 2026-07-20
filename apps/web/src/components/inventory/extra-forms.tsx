"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@securitydesk/ui";
import {
  createPurchaseOrderAction,
  createRmaAction,
  createStocktakeAction,
  createSupplierAction,
  completeStocktakeAction,
} from "@/server/inventory";

type Option = { id: string; name: string; sku?: string };

export function SupplierCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSupplierAction({ name, email, phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setEmail("");
      setPhone("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nov dobavitelj</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label>Ime</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>E-pošta</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Shranjujem…" : "Dodaj"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PurchaseOrderCreateForm({
  suppliers,
  items,
}: {
  suppliers: Option[];
  items: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [quantityOrdered, setQuantityOrdered] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPurchaseOrderAction({
        supplierId,
        currency: "EUR",
        notes,
        lines: inventoryItemId
          ? [{ inventoryItemId, quantityOrdered, unitPrice, description: "" }]
          : [],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotes("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Osnutek naročilnice</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label>Dobavitelj</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Artikel (vrstica)</Label>
            <Select value={inventoryItemId} onChange={(e) => setInventoryItemId(e.target.value)}>
              <option value="">Brez vrstice</option>
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
                value={quantityOrdered}
                onChange={(e) => setQuantityOrdered(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Cena / enota</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Opombe</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending || !supplierId}>
            {pending ? "Shranjujem…" : "Ustvari osnutek"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function RmaCreateForm({
  items,
  suppliers,
}: {
  items: Option[];
  suppliers: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inventoryItemId, setInventoryItemId] = useState(items[0]?.id ?? "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createRmaAction({
        inventoryItemId,
        supplierId,
        reason,
        description,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReason("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nov RMA primer</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label>Artikel</Label>
            <Select value={inventoryItemId} onChange={(e) => setInventoryItemId(e.target.value)}>
              <option value="">—</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.sku ? `${i.sku} – ${i.name}` : i.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dobavitelj</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Razlog</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Opis</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Shranjujem…" : "Odpri RMA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function StocktakeCreateForm({ locations }: { locations: Option[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [name, setName] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStocktakeAction({ locationId, name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nova inventura</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-1">
            <Label>Ime</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending || !locationId}>
            {pending ? "Ustvarjam…" : "Začni inventuro"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function StocktakeCompleteForm({
  stocktakeId,
  lines,
}: {
  stocktakeId: string;
  lines: Array<{ id: string; label: string; expectedQuantity: number }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(lines.map((l) => [l.id, l.expectedQuantity])),
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await completeStocktakeAction({
        stocktakeId,
        counts: lines.map((l) => ({
          stocktakeItemId: l.id,
          countedQuantity: counts[l.id] ?? 0,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">Ni postavk za štetje.</p>;
  }

  return (
    <form className="space-y-3 rounded-xl border p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold">Vnesi preštete količine</h3>
      {lines.map((line) => (
        <div key={line.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
          <span>{line.label}</span>
          <span className="text-muted-foreground">pričak. {line.expectedQuantity}</span>
          <Input
            type="number"
            min={0}
            step="any"
            className="w-24"
            value={counts[line.id] ?? 0}
            onChange={(e) =>
              setCounts((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))
            }
          />
        </div>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Zaključujem…" : "Zaključi inventuro"}
      </Button>
    </form>
  );
}
