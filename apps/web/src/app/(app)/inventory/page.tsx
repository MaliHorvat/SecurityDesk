import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { inventoryDashboardStats } from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryDashboardPage() {
  const session = await requireOrgSession("inventory:read");
  const stats = await inventoryDashboardStats();
  const canSeeFinancials = hasPermission(session.role, "inventory:financials");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deli in inventar</h1>
        <p className="text-sm text-muted-foreground">
          Skladišče, rezervacije, naročilnice, RMA in inventura.
        </p>
      </div>

      <InventoryNav current="/inventory" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Artikli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.items}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pod minimumom</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-destructive">{stats.belowMinimum}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Odprte rezervacije</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.openReservations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vrednost zaloge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {canSeeFinancials
                ? `${stats.totalStockValue.toLocaleString("sl-SI", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €`
                : "—"}
            </div>
            {!canSeeFinancials ? (
              <p className="mt-1 text-xs text-muted-foreground">Zahteva dovoljenje inventory:financials</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hitre povezave</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Link href="/inventory/items" className="text-primary hover:underline">
              Artikli
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/inventory/stock" className="text-primary hover:underline">
              Zaloga
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/inventory/movements" className="text-primary hover:underline">
              Premiki
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/inventory/purchase-orders" className="text-primary hover:underline">
              Naročilnice
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Material za servis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Rezervirajte dele za servisne zahtevke in jih izdajte tehnikom. Materialne postavke
              povežete v modulu Servis.
            </p>
            <Link href="/service" className="font-medium text-primary hover:underline">
              Odpri servis →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
