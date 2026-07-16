import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import { getCustomer } from "@/server/customers";
import { requireOrgSession } from "@/lib/org-context";
import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrgSession("customers:write");
  const { id } = await params;
  const data = await getCustomer(id);
  if (!data) notFound();
  const c = data.customer;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Uredi: {c.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Podatki stranke</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            mode="edit"
            customerId={c.id}
            initial={{
              name: c.name,
              taxId: c.taxId ?? "",
              addressLine1: c.addressLine1 ?? "",
              addressLine2: c.addressLine2 ?? "",
              city: c.city ?? "",
              postalCode: c.postalCode ?? "",
              country: c.country ?? "SI",
              email: c.email ?? "",
              phone: c.phone ?? "",
              notes: c.notes ?? "",
              serviceContract: c.serviceContract ?? "",
              status: c.status,
              collaborationStartedAt: c.collaborationStartedAt
                ? new Date(c.collaborationStartedAt).toISOString().slice(0, 10)
                : "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
