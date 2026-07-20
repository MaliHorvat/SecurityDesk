import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { resolveNav } from "@/lib/nav";
import { getDictionary } from "@/lib/i18n";
import { getPublicAppName } from "@/lib/app";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { getDb } from "@securitydesk/database";
import { eq } from "drizzle-orm";
import { brandHexToCssVars } from "@/lib/color";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) {
    redirect("/login");
  }

  const orgId = session.organization?.id ?? null;
  const { db, schema } = getDb();

  const [orgSettings] = orgId
    ? await db
        .select()
        .from(schema.organizationSettings)
        .where(eq(schema.organizationSettings.organizationId, orgId))
        .limit(1)
    : ([] as Array<{ locale: string; brandPrimaryColor: string }>);

  const locale = orgSettings?.locale === "en" ? "en" : "sl";
  const t = getDictionary(locale);
  const nav = resolveNav(session.role, session.organization?.planId ?? null);
  const brandVars = orgSettings?.brandPrimaryColor ? brandHexToCssVars(orgSettings.brandPrimaryColor) : null;
  const brandStyle: CSSProperties | undefined = brandVars
    ? ({ ["--primary" as string]: brandVars.primary, ["--ring" as string]: brandVars.ring } as unknown as CSSProperties)
    : undefined;

  // Always show dashboard + settings even before org/role is fully set
  const items =
    nav.length > 0
      ? nav
      : [
          {
            id: "dashboard",
            href: "/dashboard",
            labelKey: "nav.dashboard",
            icon: "LayoutDashboard",
          },
          {
            id: "settings",
            href: "/settings",
            labelKey: "nav.settings",
            icon: "Settings",
          },
        ];

  return (
    <div
      className="flex min-h-screen"
      style={brandStyle}
    >
      <AppSidebar items={items} labels={t.nav} appName={getPublicAppName()} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          userName={session.user.name}
          orgName={session.organization?.name}
          logoutLabel={t.auth.logout}
        />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
