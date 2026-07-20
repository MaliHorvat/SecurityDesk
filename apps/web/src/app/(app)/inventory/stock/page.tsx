import { Badge, EmptyState } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { InventoryReceiveForm } from "@/components/inventory/receive-form";
import { InventoryTransferForm } from "@/components/inventory/transfer-form";
import {
  listInventoryItems,
  listInventoryLocations,
  listInventoryStock,
} from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryStockPage() {
  const session = await requireOrgSession("inventory:read");
  const [stock, items, locations] = await Promise.all([
    listInventoryStock(),
    listInventoryItems(),
    listInventoryLocations(),
  ]);
  const canReceive = hasPermission(session.role, "inventory:receive");
  const canTransfer = hasPermission(session.role, "inventory:transfer");
  const canFinancials = hasPermission(session.role, "inventory:financials");

  const itemOptions = items.map((i) => ({ id: i.id, name: i.name, sku: i.sku }));
  const locationOptions = locations.map((l) => ({ id: l.id, name: l.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Zaloga</h1>
        <p className="text-sm text-muted-foreground">Stanje po lokacijah, prejem in prenosi.</p>
      </div>

      <InventoryNav current="/inventory/stock" />

      {(canReceive || canTransfer) && itemOptions.length > 0 && locationOptions.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {canReceive ? (
            <InventoryReceiveForm items={itemOptions} locations={locationOptions} />
          ) : null}
          {canTransfer ? (
            <InventoryTransferForm items={itemOptions} locations={locationOptions} />
          ) : null}
        </div>
      ) : null}

      {stock.length === 0 ? (
        <EmptyState
          title="Ni zaloge"
          description="Najprej ustvarite artikel in lokacijo, nato prejmite blago."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">SKU</th>
                <th className="p-3 font-medium">Artikel</th>
                <th className="p-3 font-medium">Lokacija</th>
                <th className="p-3 font-medium">Količina</th>
                <th className="p-3 font-medium">Rezervirano</th>
                <th className="p-3 font-medium">Na voljo</th>
                {canFinancials ? <th className="p-3 font-medium">Povp. cena</th> : null}
                <th className="p-3 font-medium">Opozorilo</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{row.itemSku}</td>
                  <td className="p-3 font-medium">{row.itemName}</td>
                  <td className="p-3 text-muted-foreground">{row.locationName}</td>
                  <td className="p-3">
                    {row.quantity} {row.unit}
                  </td>
                  <td className="p-3 text-muted-foreground">{row.reservedQuantity}</td>
                  <td className="p-3">{row.available}</td>
                  {canFinancials ? (
                    <td className="p-3 text-muted-foreground">
                      {row.averageCost.toLocaleString("sl-SI", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </td>
                  ) : null}
                  <td className="p-3">
                    {row.belowMinimum ? (
                      <Badge className="border-destructive text-destructive">Pod min.</Badge>
                    ) : null}
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
