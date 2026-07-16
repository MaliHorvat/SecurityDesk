import Link from "next/link";
import { eq } from "drizzle-orm";
import { Building2, HardDrive, MapPin, Wrench, Wifi, WifiOff } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@securitydesk/ui";
import { getDb } from "@securitydesk/database";
import { getAppSession } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  const t = getDictionary("sl");

  if (!session.organization) {
    return (
      <EmptyState
        title={t.dashboard.noOrg}
        description={t.dashboard.noOrgHint}
        action={
          <Link href="/onboarding">
            <Button type="button">{t.auth.createOrg}</Button>
          </Link>
        }
      />
    );
  }

  const { db, schema } = getDb();
  const [stats] = await db
    .select()
    .from(schema.dashboardStat)
    .where(eq(schema.dashboardStat.organizationId, session.organization.id))
    .limit(1);

  const cards = [
    { label: t.dashboard.customers, value: stats?.customersCount ?? 0, icon: Building2 },
    { label: t.dashboard.sites, value: stats?.sitesCount ?? 0, icon: MapPin },
    { label: t.dashboard.devices, value: stats?.devicesCount ?? 0, icon: HardDrive },
    { label: t.dashboard.openTickets, value: stats?.openTicketsCount ?? 0, icon: Wrench },
    { label: t.dashboard.online, value: stats?.onlineDevicesCount ?? 0, icon: Wifi },
    { label: t.dashboard.offline, value: stats?.offlineDevicesCount ?? 0, icon: WifiOff },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">
          {t.dashboard.welcome}, {session.user.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{session.organization.name}</CardTitle>
          <CardDescription>
            Paket: {session.organization.planId} · Vloga: {session.role ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.dashboard.phaseNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
