import { useEffect, useState } from "react";
import { Badge, Card, CardContent, EmptyState, Skeleton } from "@securitydesk/ui";
import type { Customer } from "@securitydesk/api-client";
import { getApiClient } from "@/lib/api";

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getApiClient()
      .listCustomers()
      .then((result) => {
        if (!cancelled) setCustomers(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Napaka pri nalaganju strank.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Stranke</h1>

      {error ? (
        <EmptyState title="Napaka pri nalaganju" description={error} />
      ) : customers === null ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : customers.length === 0 ? (
        <EmptyState title="Ni strank" description="Ko boste dodali stranke v SecurityDesk, se bodo prikazale tukaj." />
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[customer.city, customer.country].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
                <Badge>{customer.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
