import { Badge, EmptyState } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { InventoryNav } from "@/components/inventory/inventory-nav";
import { RmaCreateForm } from "@/components/inventory/extra-forms";
import { listInventoryItems, listRmaCases, listSuppliers } from "@/server/inventory";

export const dynamic = "force-dynamic";

export default async function InventoryRmaPage() {
  const session = await requireOrgSession("inventory:rma");
  const [cases, items, suppliers] = await Promise.all([
    listRmaCases(),
    listInventoryItems(),
    listSuppliers(),
  ]);
  const canWrite = hasPermission(session.role, "inventory:rma");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">RMA</h1>
        <p className="text-sm text-muted-foreground">Reklamacije in vračila dobaviteljem.</p>
      </div>

      <InventoryNav current="/inventory/rma" />

      {canWrite ? (
        <div className="max-w-md">
          <RmaCreateForm
            items={items.map((i) => ({ id: i.id, name: i.name, sku: i.sku }))}
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      ) : null}

      {cases.length === 0 ? (
        <EmptyState title="Ni RMA primerov" description="Odprite primer za poškodovan ali pokvarjen artikel." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Številka</th>
                <th className="p-3 font-medium">Artikel</th>
                <th className="p-3 font-medium">Dobavitelj</th>
                <th className="p-3 font-medium">Razlog</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Odprto</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.caseNumber}</td>
                  <td className="p-3 text-muted-foreground">{c.itemName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.supplierName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.reason ?? "—"}</td>
                  <td className="p-3">
                    <Badge>{c.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {c.createdAt.toLocaleString("sl-SI")}
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
