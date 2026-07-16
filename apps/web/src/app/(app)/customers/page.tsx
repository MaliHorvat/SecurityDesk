import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { listCustomers } from "@/server/customers";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("customers:read");
  const { q } = await searchParams;
  const customers = await listCustomers(q);
  const canWrite = hasPermission(session.role, "customers:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stranke</h1>
          <p className="text-sm text-muted-foreground">{customers.length} zapisov</p>
        </div>
        {canWrite ? (
          <Link href="/customers/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nova stranka
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" placeholder="Išči po nazivu, davčni, e-pošti…" defaultValue={q ?? ""} className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="Ni strank"
          description="Dodajte prvo stranko, da začnete upravljati objekte in naprave."
          action={
            canWrite ? (
              <Link href="/customers/new" className={cn(buttonVariants())}>
                Nova stranka
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Naziv</th>
                <th className="p-3 font-medium">Davčna</th>
                <th className="p-3 font-medium">Kraj</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Kontakt</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.taxId ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.city ?? "—"}</td>
                  <td className="p-3">
                    <Badge>{c.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.email ?? c.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
