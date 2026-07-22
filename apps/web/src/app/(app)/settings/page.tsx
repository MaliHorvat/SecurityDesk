import Link from "next/link";
import { Rocket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, buttonVariants, cn } from "@securitydesk/ui";
import { getAppSession } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { hasPermission, PLANS } from "@securitydesk/shared";
import { getDb } from "@securitydesk/database";
import { eq } from "drizzle-orm";
import { BrandingForm } from "@/components/settings/branding-form";
import { SubscriptionPlanForm } from "@/components/settings/subscription-plan-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session) redirect("/login");
  const { db, schema } = getDb();
  const orgId = session.organization?.id ?? null;

  const [orgSettings] = orgId
    ? await db
        .select()
        .from(schema.organizationSettings)
        .where(eq(schema.organizationSettings.organizationId, orgId))
        .limit(1)
    : ([] as Array<{ locale: string; brandPrimaryColor: string }>);

  const locale = orgSettings?.locale === "en" ? "en" : "sl";
  const t = getDictionary(locale);

  const plan = session.organization ? PLANS[session.organization.planId] : null;
  const subscription = orgId
    ? (
        await db
          .select()
          .from(schema.subscription)
          .where(eq(schema.subscription.organizationId, orgId))
          .limit(1)
      )[0]
    : null;

  const canBilling = Boolean(session.role && hasPermission(session.role, "organization:billing"));
  const hasOrg = Boolean(session.organization && orgId);
  const canDesktopReleases = Boolean(session.role && hasPermission(session.role, "desktop_releases:read"));

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

            <div className="pt-3">
              {hasOrg && session.organization ? (
                <>
                  <SubscriptionPlanForm currentPlanId={session.organization.planId} canEdit={canBilling} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Naročnina je v tej fazi simulirana (Stripe še ni vklopljen).
                  </p>
                  {subscription ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Status: {subscription.status} · Konec obdobja:{" "}
                      {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString("sl-SI") : "—"}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Še ni aktivne organizacije.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>White-label</CardTitle>
            <CardDescription>Barva, ki se uporablja v aplikaciji</CardDescription>
          </CardHeader>
          <CardContent>
            {hasOrg ? (
              <BrandingForm
                brandPrimaryColor={orgSettings?.brandPrimaryColor ?? "#1d4ed8"}
                canEdit={canBilling}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Še ni aktivne organizacije.</p>
            )}
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

        {canDesktopReleases ? (
          <Card>
            <CardHeader>
              <CardTitle>Izdaje namizne aplikacije</CardTitle>
              <CardDescription>Upravljanje različic, kanalov in namestitev</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Objavljajte nove izdaje, nalagajte podpisane namestitvene datoteke in spremljajte nameščene kopije.</p>
              <Link href="/settings/desktop" className={cn(buttonVariants({ variant: "outline" }))}>
                <Rocket className="h-4 w-4" />
                Odpri upravljanje izdaj
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
