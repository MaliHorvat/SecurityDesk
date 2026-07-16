import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { listSites } from "@/server/sites";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("sites:read");
  const { q } = await searchParams;
  const sites = await listSites(q);
  const canWrite = hasPermission(session.role, "sites:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Objekti</h1>
          <p className="text-sm text-muted-foreground">{sites.length} zapisov</p>
        </div>
        {canWrite ? (
          <Link href="/sites/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nov objekt
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" placeholder="Išči objekte…" defaultValue={q ?? ""} className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {sites.length === 0 ? (
        <EmptyState
          title="Ni objektov"
          description="Najprej dodajte stranko, nato objekt."
          action={
            canWrite ? (
              <Link href="/sites/new" className={cn(buttonVariants())}>
                Nov objekt
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">Stranka</th>
                <th className="p-3 font-medium">Naslov</th>
                <th className="p-3 font-medium">Časovni pas</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(({ site, customerName }) => (
                <tr key={site.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/sites/${site.id}`} className="font-medium text-primary hover:underline">
                      {site.name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{customerName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">
                    {[site.addressLine1, site.city].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{site.timezone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
