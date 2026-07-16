import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission, HANDOVER_STATUS_LABELS } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listHandoverPackages } from "@/server/handover";

export const dynamic = "force-dynamic";

export default async function HandoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("handover:read");
  const { q } = await searchParams;
  const packages = await listHandoverPackages(q);
  const canWrite = hasPermission(session.role, "handover:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Predaja</h1>
          <p className="text-sm text-muted-foreground">{packages.length} paketov</p>
        </div>
        {canWrite ? (
          <Link href="/handover/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nov predajni paket
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Išči pakete…" className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {packages.length === 0 ? (
        <EmptyState
          title="Ni predajnih paketov"
          description="Pripravite digitalno predajo sistema naročniku s kontrolnim seznamom in podpisi."
          action={
            canWrite ? (
              <Link href="/handover/new" className={cn(buttonVariants())}>
                Nov paket
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Paket</th>
                <th className="p-3 font-medium">Stranka</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">Različica</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(({ package: pkg, customerName, siteName }) => (
                <tr key={pkg.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/handover/${pkg.id}`} className="font-medium text-primary hover:underline">
                      {pkg.title}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{customerName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{siteName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">v{pkg.version}</td>
                  <td className="p-3">
                    <Badge>{HANDOVER_STATUS_LABELS[pkg.status]}</Badge>
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
