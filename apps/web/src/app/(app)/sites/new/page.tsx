import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { requireOrgSession } from "@/lib/org-context";
import { listCustomers } from "@/server/customers";
import { SiteForm } from "@/components/sites/site-form";

export const dynamic = "force-dynamic";

export default async function NewSitePage() {
  await requireOrgSession("sites:write");
  const customers = await listCustomers();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nov objekt</h1>
      <Card>
        <CardHeader>
          <CardTitle>Podatki objekta</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Najprej ustvarite stranko.</p>
          ) : (
            <SiteForm mode="create" customers={customers.map((c) => ({ id: c.id, name: c.name }))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
