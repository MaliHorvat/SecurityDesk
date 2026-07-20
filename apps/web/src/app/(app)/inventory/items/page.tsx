import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { INVENTORY_ITEM_TYPE_LABELS } from "@/components/inventory/labels";
import { listInventoryItems } from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("inventory:read");
  const { q } = await searchParams;
  const items = await listInventoryItems(q);
  const canWrite = hasPermission(session.role, "inventory:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Artikli</h1>
          <p className="text-sm text-muted-foreground">{items.length} artiklov</p>
        </div>
        {canWrite ? (
          <Link href="/inventory/items/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nov artikel
          </Link>
        ) : null}
      </div>

      <InventoryNav current="/inventory/items" />

      <form className="flex gap-2">
        <Input name="q" placeholder="Išči SKU ali ime…" defaultValue={q ?? ""} className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="Ni artiklov"
          description="Dodajte rezervne dele, kable, licence in potrošni material."
          action={
            canWrite ? (
              <Link href="/inventory/items/new" className={cn(buttonVariants())}>
                Nov artikel
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Ime</th>
                <th className="p-3 font-medium">Tip</th>
                <th className="p-3 font-medium">Enota</th>
                <th className="p-3 font-medium">Min.</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{item.sku}</td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {INVENTORY_ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
                  </td>
                  <td className="p-3 text-muted-foreground">{item.unit}</td>
                  <td className="p-3 text-muted-foreground">{item.minimumStock}</td>
                  <td className="p-3">
                    <Badge>{item.isActive ? "Aktiven" : "Neaktiven"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
