import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { requireOrgSession } from "@/lib/org-context";
import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  await requireOrgSession("customers:write");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nova stranka</h1>
      <Card>
        <CardHeader>
          <CardTitle>Podatki stranke</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
