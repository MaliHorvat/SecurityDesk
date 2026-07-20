"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@securitydesk/ui";
import { type InventoryItemInput, type InventoryItemType } from "@securitydesk/shared";
import { createInventoryItemAction } from "@/server/inventory";
import { INVENTORY_ITEM_TYPE_LABELS, INVENTORY_ITEM_TYPES, INVENTORY_UNITS } from "./labels";

export function InventoryItemForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryItemInput>({
    sku: "",
    barcode: "",
    name: "",
    description: "",
    categoryId: "",
    manufacturerId: "",
    unit: "kos",
    itemType: "sparePart",
    isSerialized: false,
    isLotTracked: false,
    minimumStock: 0,
    recommendedStock: 0,
    purchasePrice: null,
    sellingPrice: null,
    taxRate: null,
    currency: "EUR",
    warrantyMonths: null,
    isActive: true,
  });

  function set<K extends keyof InventoryItemInput>(key: K, value: InventoryItemInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createInventoryItemAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/inventory/items");
      router.refresh();
    });
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Nov artikel</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" required value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="barcode">Črtna koda</Label>
              <Input
                id="barcode"
                value={form.barcode ?? ""}
                onChange={(e) => set("barcode", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Ime</Label>
            <Input id="name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Opis</Label>
            <Input
              id="description"
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tip</Label>
              <Select
                value={form.itemType}
                onChange={(e) => set("itemType", e.target.value as InventoryItemType)}
              >
                {INVENTORY_ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INVENTORY_ITEM_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Enota</Label>
              <Select
                value={form.unit}
                onChange={(e) => set("unit", e.target.value as InventoryItemInput["unit"])}
              >
                {INVENTORY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Minimalna zaloga</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={form.minimumStock}
                onChange={(e) => set("minimumStock", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Priporočena zaloga</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={form.recommendedStock}
                onChange={(e) => set("recommendedStock", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nabavna cena</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.purchasePrice ?? ""}
                onChange={(e) =>
                  set("purchasePrice", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Prodajna cena</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.sellingPrice ?? ""}
                onChange={(e) =>
                  set("sellingPrice", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isSerialized}
              onChange={(e) => set("isSerialized", e.target.checked)}
            />
            Serializiran artikel
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Shranjujem…" : "Ustvari artikel"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
