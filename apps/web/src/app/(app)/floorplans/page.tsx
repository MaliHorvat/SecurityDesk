import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { FLOOR_PLAN_STATUS_LABELS, hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listFloorPlans } from "@/server/floorplan";

export const dynamic = "force-dynamic";

export default async function FloorPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("floorplan:read");
  const { q } = await searchParams;
  const plans = await listFloorPlans(q);
  const canWrite = hasPermission(session.role, "floorplan:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Digitalni tlorisi</h1>
          <p className="text-sm text-muted-foreground">
            Vizualni prikaz naprav in povezav na tlorisu objekta.
          </p>
        </div>
        {canWrite ? (
          <Link href="/floorplans/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nov tloris
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" placeholder="Išči tlorise…" defaultValue={q ?? ""} className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {plans.length === 0 ? (
        <EmptyState
          title="Ni tlorisov"
          description="Ustvarite tloris, naložite sliko in postavite naprave."
          action={
            canWrite ? (
              <Link href="/floorplans/new" className={cn(buttonVariants())}>
                Nov tloris
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium">Ime</th>
                <th className="p-3 font-medium">Stranka</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Verzija</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/floorplans/${plan.id}`} className="font-medium text-primary hover:underline">
                      {plan.name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{plan.customerName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{plan.siteName ?? "—"}</td>
                  <td className="p-3">
                    <Badge>{FLOOR_PLAN_STATUS_LABELS[plan.status]}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">v{plan.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
