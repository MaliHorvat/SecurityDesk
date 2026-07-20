import { Badge, EmptyState } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import {
  InventoryReservationForm,
  ReleaseReservationButton,
} from "@/components/inventory/reservation-form";
import {
  listInventoryItems,
  listInventoryLocations,
  listReservations,
} from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryReservationsPage() {
  const session = await requireOrgSession("inventory:read");
  const [reservations, items, locations] = await Promise.all([
    listReservations(),
    listInventoryItems(),
    listInventoryLocations(),
  ]);
  const canReserve = hasPermission(session.role, "inventory:reserve");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rezervacije</h1>
        <p className="text-sm text-muted-foreground">Blokada zaloge za projekte in servis.</p>
      </div>

      <InventoryNav current="/inventory/reservations" />

      {canReserve && items.length > 0 && locations.length > 0 ? (
        <div className="max-w-md">
          <InventoryReservationForm
            items={items.map((i) => ({ id: i.id, name: i.name, sku: i.sku }))}
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          />
        </div>
      ) : null}

      {reservations.length === 0 ? (
        <EmptyState title="Ni rezervacij" description="Rezervirajte materiale za delovne naloge." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Artikel</th>
                <th className="p-3 font-medium">Lokacija</th>
                <th className="p-3 font-medium">Količina</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Ustvarjeno</th>
                <th className="p-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <span className="font-mono text-xs">{r.itemSku}</span> {r.itemName}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.locationName}</td>
                  <td className="p-3">{r.quantity}</td>
                  <td className="p-3">
                    <Badge>{r.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {r.createdAt.toLocaleString("sl-SI")}
                  </td>
                  <td className="p-3 text-right">
                    {canReserve && (r.status === "active" || r.status === "partiallyIssued") ? (
                      <ReleaseReservationButton id={r.id} />
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
