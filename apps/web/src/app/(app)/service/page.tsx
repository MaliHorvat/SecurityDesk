import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, buttonVariants, cn } from "@securitydesk/ui";
import { hasPermission, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { listServiceTickets } from "@/server/service";

export const dynamic = "force-dynamic";

export default async function ServicePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireOrgSession("service:read");
  const { q } = await searchParams;
  const tickets = await listServiceTickets(q);
  const canWrite = hasPermission(session.role, "service:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Servis</h1>
          <p className="text-sm text-muted-foreground">{tickets.length} zahtevkov</p>
        </div>
        {canWrite ? (
          <Link href="/service/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4" />
            Nov zahtevek
          </Link>
        ) : null}
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Išči zahtevke…" className="max-w-md" />
        <Button type="submit" variant="outline">
          Išči
        </Button>
      </form>

      {tickets.length === 0 ? (
        <EmptyState
          title="Ni servisnih zahtevkov"
          description="Prijavite napako, dodelite delovni nalog in ustvarite zapisnik."
          action={
            canWrite ? (
              <Link href="/service/new" className={cn(buttonVariants())}>
                Nov zahtevek
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-medium">Zahtevek</th>
                <th className="p-3 font-medium">Stranka</th>
                <th className="p-3 font-medium">Objekt</th>
                <th className="p-3 font-medium">Prioriteta</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(({ ticket, customerName, siteName }) => (
                <tr key={ticket.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/service/${ticket.id}`} className="font-medium text-primary hover:underline">
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{customerName ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{siteName ?? "—"}</td>
                  <td className="p-3">
                    <Badge>{TICKET_PRIORITY_LABELS[ticket.priority]}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
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
