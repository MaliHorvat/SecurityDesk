import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import {
  inventoryDashboardStats,
  listInventoryStock,
  listMovements,
  listReservations,
} from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryReportsPage() {
  const session = await requireOrgSession("inventory:read");
  const [stats, stock, movements, reservations] = await Promise.all([
    inventoryDashboardStats(),
    listInventoryStock(),
    listMovements(20),
    listReservations(),
  ]);
  const canFinancials = hasPermission(session.role, "inventory:financials");
  const belowMin = stock.filter((s) => s.belowMinimum);
  const activeReservations = reservations.filter((r) => r.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Poročila</h1>
        <p className="text-sm text-muted-foreground">Povzetek zaloge, opozoril in aktivnosti.</p>
      </div>

      <InventoryNav current="/inventory/reports" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Artikli</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.items}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pod minimumom</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {stats.belowMinimum}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aktivne rezervacije</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{activeReservations.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vrednost zaloge</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {canFinancials
              ? `${stats.totalStockValue.toLocaleString("sl-SI", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €`
              : "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pod minimalno zalogo</CardTitle>
          </CardHeader>
          <CardContent>
            {belowMin.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ni opozoril.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {belowMin.slice(0, 15).map((row) => (
                  <li key={row.id} className="flex justify-between gap-2">
                    <span>
                      <span className="font-mono text-xs">{row.itemSku}</span> {row.itemName}
                      <span className="text-muted-foreground"> @ {row.locationName}</span>
                    </span>
                    <span className="text-destructive">
                      {row.available}/{row.minimumStock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/inventory/stock" className="mt-3 inline-block text-sm text-primary hover:underline">
              Odpri zalogo →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zadnji premiki</CardTitle>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ni premikov.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {movements.slice(0, 10).map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <span>
                      {m.itemSku} · {m.movementType} · {m.quantity}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {m.createdAt.toLocaleDateString("sl-SI")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/inventory/movements"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Vsi premiki →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
