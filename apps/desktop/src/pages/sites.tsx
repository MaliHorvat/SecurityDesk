import { useEffect, useState } from "react";
import { Card, CardContent, EmptyState, Skeleton } from "@securitydesk/ui";
import type { Site } from "@securitydesk/api-client";
import { getApiClient } from "@/lib/api";

export function SitesPage() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getApiClient()
      .listSites()
      .then((result) => {
        if (!cancelled) setSites(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Napaka pri nalaganju objektov.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Objekti</h1>

      {error ? (
        <EmptyState title="Napaka pri nalaganju" description={error} />
      ) : sites === null ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : sites.length === 0 ? (
        <EmptyState title="Ni objektov" description="Ko boste dodali objekte v SecurityDesk, se bodo prikazali tukaj." />
      ) : (
        <div className="space-y-2">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardContent className="p-4">
                <p className="font-medium">{site.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[site.addressLine1, site.city, site.country].filter(Boolean).join(", ") || "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
