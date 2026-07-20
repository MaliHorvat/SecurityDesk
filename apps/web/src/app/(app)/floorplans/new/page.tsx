import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { listSites } from "@/server/sites";
import { FloorPlanCreateForm } from "@/components/floorplan/create-form";

export const dynamic = "force-dynamic";

export default async function NewFloorPlanPage() {
  await requireOrgSession("floorplan:write");
  const [customers, sites] = await Promise.all([listCustomers(), listSites()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nov tloris</h1>
        <p className="text-sm text-muted-foreground">Izberite objekt in naložite podlago.</p>
      </div>
      <FloorPlanCreateForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        sites={sites.map((s) => ({
          id: s.site.id,
          name: s.site.name,
          customerId: s.site.customerId,
        }))}
      />
    </div>
  );
}
