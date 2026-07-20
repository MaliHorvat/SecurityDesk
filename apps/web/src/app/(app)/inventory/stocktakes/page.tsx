import { Badge, EmptyState } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { StocktakeCompleteForm, StocktakeCreateForm } from "@/components/inventory/extra-forms";
import {
  listInventoryLocations,
  listStocktakeItems,
  listStocktakes,
} from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryStocktakesPage() {
  const session = await requireOrgSession("inventory:stocktake");
  const [stocktakes, locations] = await Promise.all([listStocktakes(), listInventoryLocations()]);
  const canWrite = hasPermission(session.role, "inventory:stocktake");

  const open = stocktakes.find((s) => s.status === "inProgress" || s.status === "draft");
  const openItems = open ? await listStocktakeItems(open.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventura</h1>
        <p className="text-sm text-muted-foreground">
          Štetje zaloge in samodejni popravki (stocktakeCorrection).
        </p>
      </div>

      <InventoryNav current="/inventory/stocktakes" />

      {canWrite && locations.length > 0 ? (
        <div className="max-w-md">
          <StocktakeCreateForm locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
        </div>
      ) : null}

      {open && canWrite ? (
        <StocktakeCompleteForm
          stocktakeId={open.id}
          lines={openItems.map((i) => ({
            id: i.id,
            label: `${i.itemSku} – ${i.itemName}`,
            expectedQuantity: i.expectedQuantity,
          }))}
        />
      ) : null}

      {stocktakes.length === 0 ? (
        <EmptyState title="Ni inventur" description="Začnite inventuro na izbrani lokaciji." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Ime</th>
                <th className="p-3 font-medium">Lokacija</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Začetek</th>
                <th className="p-3 font-medium">Zaključek</th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-muted-foreground">{s.locationName}</td>
                  <td className="p-3">
                    <Badge>{s.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {s.startedAt?.toLocaleString("sl-SI") ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {s.completedAt?.toLocaleString("sl-SI") ?? "—"}
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
