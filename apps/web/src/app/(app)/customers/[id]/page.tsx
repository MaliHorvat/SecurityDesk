import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardContent, CardHeader, CardTitle, buttonVariants, cn } from "@securitydesk/ui";
import { getCustomer } from "@/server/customers";
import { requireOrgSession } from "@/lib/org-context";
import { hasPermission } from "@securitydesk/shared";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOrgSession("customers:read");
  const { id } = await params;
  const data = await getCustomer(id);
  if (!data) notFound();
  const { customer, contacts, sites } = data;
  const canWrite = hasPermission(session.role, "customers:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{customer.taxId ?? "Brez davčne številke"}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{customer.status}</Badge>
          {canWrite ? (
            <Link href={`/customers/${customer.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>
              Uredi
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kontakt in naslov</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{customer.email ?? "—"}</p>
            <p>{customer.phone ?? "—"}</p>
            <p>
              {[customer.addressLine1, customer.postalCode, customer.city, customer.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kontakti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {contacts.length === 0 ? (
              <p className="text-muted-foreground">Ni kontaktov.</p>
            ) : (
              contacts.map((c) => (
                <div key={c.id}>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-muted-foreground">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Objekti</CardTitle>
          {hasPermission(session.role, "sites:write") ? (
            <Link href="/sites/new" className={cn(buttonVariants({ size: "sm" }))}>
              Nov objekt
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ni objektov.</p>
          ) : (
            <ul className="space-y-2">
              {sites.map((s) => (
                <li key={s.id}>
                  <Link href={`/sites/${s.id}`} className="text-primary hover:underline">
                    {s.name}
                  </Link>
                  <span className="text-sm text-muted-foreground"> · {s.city ?? s.addressLine1 ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {customer.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Opombe</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{customer.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
