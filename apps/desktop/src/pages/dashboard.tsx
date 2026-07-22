import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@securitydesk/ui";
import type { DesktopDashboardStats } from "@securitydesk/api-client";
import { getApiClient } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export function DashboardPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState<DesktopDashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getApiClient()
      .dashboardStats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nadzorna plošča</h1>
        <p className="text-sm text-muted-foreground">
          Dobrodošli{session?.user.name ? `, ${session.user.name}` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Stranke" value={stats?.customersCount ?? null} />
        <SummaryCard label="Objekti" value={stats?.sitesCount ?? null} />
        <SummaryCard label="Naprave" value={stats?.devicesCount ?? null} />
        <SummaryCard label="Odprti zahtevki" value={stats?.openTicketsCount ?? null} />
        <SummaryCard label="Online naprave" value={stats?.onlineDevicesCount ?? null} />
        <SummaryCard label="Offline naprave" value={stats?.offlineDevicesCount ?? null} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value ?? "—"}</p>
      </CardContent>
    </Card>
  );
}
