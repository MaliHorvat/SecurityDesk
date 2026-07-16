import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listFirmwareAdvisories } from "@/server/firmware-guard";

export const dynamic = "force-dynamic";

export default async function FirmwarePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("firmware:read");
  const { q } = await searchParams;
  const advisories = await listFirmwareAdvisories(q);
  const canWrite = hasPermission(session.role, "firmware:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">FirmwareGuard</h1>
          <p className="text-sm text-muted-foreground">{advisories.length} advisoryjev</p>
        </div>
        {canWrite ? (
          <Link href="/firmware/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nov advisory
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" placeholder="Išči po naslovu / vendorju…" defaultValue={q ?? ""} className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {advisories.length === 0 ? (
        <EmptyState
          title="Ni advisoryjev"
          description="Dodajte firmware advisory in zaženite ujemanje naprav."
          action={
            canWrite ? (
              <Link href="/firmware/new" className={cn(buttonVariants())}>
                Nov advisory
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Naslov</th>
                <th className="p-3 font-medium">Vendor</th>
                <th className="p-3 font-medium">Resnost</th>
                <th className="p-3 font-medium">Zadnji check</th>
              </tr>
            </thead>
            <tbody>
              {advisories.map((a) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/firmware/${a.id}`} className="font-medium text-primary hover:underline">
                      {a.title}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{a.vendor}</td>
                  <td className="p-3">
                    <Badge>{a.severity}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {a.lastCheckedAt ? new Date(a.lastCheckedAt).toLocaleString("sl-SI") : "—"}
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
