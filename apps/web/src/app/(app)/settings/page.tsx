import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@securitydesk/ui";
import { getAppSession } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { PLANS } from "@securitydesk/shared";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  const t = getDictionary("sl");
  const plan = session.organization ? PLANS[session.organization.planId] : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.organization}</CardTitle>
            <CardDescription>{session.organization?.name ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Slug: {session.organization?.slug ?? "—"}</p>
            <p>Vloga: {session.role ?? "—"}</p>
            <p>Časovni pas: Europe/Ljubljana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.billing}</CardTitle>
            <CardDescription>{plan?.name.sl ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Stranke: {plan?.limits.maxCustomers ?? "∞"}</p>
            <p>Naprave: {plan?.limits.maxDevices ?? "∞"}</p>
            <p>Moduli: {plan?.limits.modules.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.users}</CardTitle>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Upravljanje uporabnikov in povabil bo razširjeno v naslednjih fazah. Osnovna organizacijska članstva delujejo prek Better Auth.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.security}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gesla so varno zgoščena. 2FA in SSO sta predvidena v fazi komercializacije.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
