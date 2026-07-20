import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { InventoryItemForm } from "@/components/inventory/item-form";

export const dynamic = "force-dynamic";

export default async function NewInventoryItemPage() {
  await requireOrgSession("inventory:write");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nov artikel</h1>
        <p className="text-sm text-muted-foreground">Vnesite SKU, tip in minimalno zalogo.</p>
      </div>
      <InventoryNav current="/inventory/items" />
      <InventoryItemForm />
    </div>
  );
}
