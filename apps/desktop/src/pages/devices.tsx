import { useEffect, useState } from "react";
import { Badge, Card, CardContent, EmptyState, Skeleton } from "@securitydesk/ui";
import type { Device } from "@securitydesk/api-client";
import { getApiClient } from "@/lib/api";

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getApiClient()
      .listDevices()
      .then((result) => {
        if (!cancelled) setDevices(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Napaka pri nalaganju naprav.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Naprave</h1>

      {error ? (
        <EmptyState title="Napaka pri nalaganju" description={error} />
      ) : devices === null ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : devices.length === 0 ? (
        <EmptyState title="Ni naprav" description="Ko boste dodali naprave v SecurityDesk, se bodo prikazale tukaj." />
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <Card key={device.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{device.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[device.model, device.ipAddress].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Badge>{device.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
