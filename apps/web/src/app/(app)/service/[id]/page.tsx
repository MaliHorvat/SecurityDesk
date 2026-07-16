import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, buttonVariants, cn, Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import {
  hasPermission,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { getServiceTicket } from "@/server/service";
import { WorkOrderForm } from "@/components/service/work-order-form";
import { ServiceReportPanel } from "@/components/service/service-report-panel";

export const dynamic = "force-dynamic";

function toLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ServiceTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrgSession("service:read");
  const { id } = await params;
  const data = await getServiceTicket(id);
  if (!data) notFound();

  const canWrite = hasPermission(session.role, "service:write");
  const { ticket, customerName, siteName, deviceName, workOrders, reports } = data;
  const latestWo = workOrders[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <Link href="/service" className="hover:underline">
              Servis
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{ticket.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
            <Badge>{TICKET_PRIORITY_LABELS[ticket.priority]}</Badge>
          </div>
        </div>
        {canWrite ? (
          <Link href={`/service/${ticket.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
            Uredi
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Podrobnosti</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Stranka:</span> {customerName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Objekt:</span> {siteName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Naprava:</span> {deviceName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Kategorija:</span> {ticket.category}
          </p>
          <div className="md:col-span-2">
            <p className="text-muted-foreground">Opis</p>
            <p className="whitespace-pre-wrap">{ticket.description || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Delovni nalogi</h2>
          {canWrite ? (
            <WorkOrderForm ticketId={ticket.id} defaultTechnician={session.user.name} />
          ) : null}
        </div>
        {workOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Še ni delovnih nalogov.</p>
        ) : (
          <div className="space-y-3">
            {workOrders.map((wo) => (
              <Card key={wo.id}>
                <CardContent className="space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{wo.assignedToName ?? "Tehnik"}</p>
                      <p className="text-xs text-muted-foreground">
                        {wo.status} · potni {wo.travelCost} €
                      </p>
                    </div>
                    {canWrite ? (
                      <WorkOrderForm
                        ticketId={ticket.id}
                        workOrderId={wo.id}
                        initial={{
                          assignedToName: wo.assignedToName ?? "",
                          status: wo.status,
                          scheduledAt: toLocal(wo.scheduledAt),
                          arrivedAt: toLocal(wo.arrivedAt),
                          departedAt: toLocal(wo.departedAt),
                          travelCost: wo.travelCost,
                          workDone: wo.workDone ?? "",
                          measurements: wo.measurements ?? "",
                          findings: wo.findings ?? "",
                          recommendations: wo.recommendations ?? "",
                          materials: wo.materials,
                          photos: wo.photos,
                          technicianSignatureName: wo.technicianSignatureName ?? "",
                          customerSignatureName: wo.customerSignatureName ?? "",
                        }}
                      />
                    ) : null}
                  </div>
                  {wo.workDone ? (
                    <p className="whitespace-pre-wrap text-muted-foreground">{wo.workDone}</p>
                  ) : null}
                  {(wo.technicianSignatureName || wo.customerSignatureName) && (
                    <p className="text-xs text-muted-foreground">
                      Podpisi: {wo.technicianSignatureName ?? "—"} / {wo.customerSignatureName ?? "—"}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <ServiceReportPanel
        ticketId={ticket.id}
        ticketTitle={ticket.title}
        ticketDescription={ticket.description}
        workOrderId={latestWo?.id}
        workDone={latestWo?.workDone}
        findings={latestWo?.findings}
        recommendations={latestWo?.recommendations}
        materials={latestWo?.materials}
        reports={reports}
        orgName={session.organization.name}
        customerName={customerName}
        siteName={siteName}
        technicianDefault={session.user.name}
        canWrite={canWrite}
      />
    </div>
  );
}
