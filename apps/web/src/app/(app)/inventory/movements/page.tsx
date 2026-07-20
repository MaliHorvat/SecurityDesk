import { EmptyState } from "@securitydesk/ui";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { INVENTORY_MOVEMENT_TYPE_LABELS } from "@/components/inventory/labels";
import { listMovements } from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryMovementsPage() {
  await requireOrgSession("inventory:read");
  const movements = await listMovements(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Premiki</h1>
        <p className="text-sm text-muted-foreground">Zgodovina prejemov, prenosov in popravkov.</p>
      </div>

      <InventoryNav current="/inventory/movements" />

      {movements.length === 0 ? (
        <EmptyState title="Ni premikov" description="Premiki se ustvarijo ob prejemu, prenosu ali inventuri." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Čas</th>
                <th className="p-3 font-medium">Tip</th>
                <th className="p-3 font-medium">Artikel</th>
                <th className="p-3 font-medium">Količina</th>
                <th className="p-3 font-medium">Izvor</th>
                <th className="p-3 font-medium">Cilj</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {m.createdAt.toLocaleString("sl-SI")}
                  </td>
                  <td className="p-3">
                    {INVENTORY_MOVEMENT_TYPE_LABELS[m.movementType] ?? m.movementType}
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-xs">{m.itemSku}</span>{" "}
                    <span className="text-muted-foreground">{m.itemName}</span>
                  </td>
                  <td className="p-3">{m.quantity}</td>
                  <td className="p-3 text-muted-foreground">{m.sourceLocationName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{m.destinationLocationName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
