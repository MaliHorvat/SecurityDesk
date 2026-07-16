import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { getSite } from "@/server/sites";
import { listCustomers } from "@/server/customers";
import { requireOrgSession } from "@/lib/org-context";
import { SiteForm } from "@/components/sites/site-form";

export const dynamic = "force-dynamic";

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrgSession("sites:write");
  const { id } = await params;
  const [data, customers] = await Promise.all([getSite(id), listCustomers()]);
  if (!data) notFound();
  const s = data.site;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uredi: {s.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Podatki objekta</CardTitle>
        </CardHeader>
        <CardContent>
          <SiteForm
            mode="edit"
            siteId={s.id}
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            initial={{
              customerId: s.customerId,
              name: s.name,
              addressLine1: s.addressLine1 ?? "",
              city: s.city ?? "",
              postalCode: s.postalCode ?? "",
              country: s.country ?? "SI",
              latitude: s.latitude,
              longitude: s.longitude,
              timezone: s.timezone,
              contactName: s.contactName ?? "",
              contactPhone: s.contactPhone ?? "",
              accessInstructions: s.accessInstructions ?? "",
              workingHours: s.workingHours ?? "",
              securityNotes: s.securityNotes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
