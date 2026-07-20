import { Badge, EmptyState } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import {
  PurchaseOrderCreateForm,
  SupplierCreateForm,
} from "@/components/inventory/extra-forms";
import {
  listInventoryItems,
  listPurchaseOrders,
  listSuppliers,
} from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const session = await requireOrgSession("inventory:purchase_orders");
  const [orders, suppliers, items] = await Promise.all([
    listPurchaseOrders(),
    listSuppliers(),
    listInventoryItems(),
  ]);
  const canWrite = hasPermission(session.role, "inventory:purchase_orders");
  const canCreateSupplier = hasPermission(session.role, "inventory:write");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Naročilnice</h1>
        <p className="text-sm text-muted-foreground">Osnutki nabavnih naročil in dobavitelji.</p>
      </div>

      <InventoryNav current="/inventory/purchase-orders" />

      {(canWrite || canCreateSupplier) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {canCreateSupplier ? <SupplierCreateForm /> : null}
          {canWrite && suppliers.length > 0 ? (
            <PurchaseOrderCreateForm
              suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
              items={items.map((i) => ({ id: i.id, name: i.name, sku: i.sku }))}
            />
          ) : null}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState
          title="Ni naročilnic"
          description="Najprej dodajte dobavitelja, nato ustvarite osnutek."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Številka</th>
                <th className="p-3 font-medium">Dobavitelj</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Skupaj</th>
                <th className="p-3 font-medium">Ustvarjeno</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3 font-medium">{o.orderNumber}</td>
                  <td className="p-3 text-muted-foreground">{o.supplierName}</td>
                  <td className="p-3">
                    <Badge>{o.status}</Badge>
                  </td>
                  <td className="p-3">
                    {o.total.toLocaleString("sl-SI", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {o.currency}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {o.createdAt.toLocaleString("sl-SI")}
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
