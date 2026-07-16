import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, buttonVariants, cn } from "@securitydesk/ui";
import { getSite } from "@/server/sites";
import { requireOrgSession } from "@/lib/org-context";
import { hasPermission } from "@securitydesk/shared";
import { QrPanel } from "@/components/qr-panel";
import { HierarchyForms } from "@/components/sites/hierarchy-forms";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession("sites:read");
  const { id } = await params;
  const data = await getSite(id);
  if (!data) notFound();
  const canWrite = hasPermission(session.role, "sites:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{data.site.name}</h1>
          <p className="text-sm text-muted-foreground">{data.customerName ?? "—"}</p>
        </div>
        {canWrite ? (
          <Link href={`/sites/${data.site.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
            Uredi
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Podrobnosti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>{[data.site.addressLine1, data.site.postalCode, data.site.city].filter(Boolean).join(", ") || "—"}</p>
              <p>Časovni pas: {data.site.timezone}</p>
              <p>Kontakt: {data.site.contactName ?? "—"} {data.site.contactPhone ? `· ${data.site.contactPhone}` : ""}</p>
              {data.site.accessInstructions ? <p className="whitespace-pre-wrap">Dostop: {data.site.accessInstructions}</p> : null}
              {data.site.securityNotes ? <p className="whitespace-pre-wrap">Varnost: {data.site.securityNotes}</p> : null}
            </CardContent>
          </Card>

          {canWrite ? <HierarchyForms siteId={data.site.id} buildings={data.buildings} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Naprave na objektu ({data.devices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {data.devices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ni naprav.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.devices.map((d) => (
                    <li key={d.id}>
                      <Link href={`/devices/${d.id}`} className="text-primary hover:underline">
                        {d.name}
                      </Link>
                      <span className="text-muted-foreground"> · {d.ipAddress ?? "brez IP"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <QrPanel token={data.site.qrToken} label="QR objekta" />
      </div>
    </div>
  );
}
