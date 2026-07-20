import { EmptyState } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { InventoryLocationForm } from "@/components/inventory/location-form";
import { INVENTORY_LOCATION_TYPE_LABELS } from "@/components/inventory/labels";
import { listInventoryLocations } from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryLocationsPage() {
  const session = await requireOrgSession("inventory:read");
  const locations = await listInventoryLocations();
  const canWrite = hasPermission(session.role, "inventory:write");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lokacije</h1>
        <p className="text-sm text-muted-foreground">Skladišča, police, vozila in tehniki.</p>
      </div>

      <InventoryNav current="/inventory/locations" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {locations.length === 0 ? (
            <EmptyState title="Ni lokacij" description="Dodajte skladišče ali vozilo." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Ime</th>
                    <th className="p-3 font-medium">Tip</th>
                    <th className="p-3 font-medium">Naslov</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id} className="border-t">
                      <td className="p-3 font-medium">{loc.name}</td>
                      <td className="p-3 text-muted-foreground">
                        {INVENTORY_LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType}
                      </td>
                      <td className="p-3 text-muted-foreground">{loc.address ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {canWrite ? <InventoryLocationForm /> : null}
      </div>
    </div>
  );
}
