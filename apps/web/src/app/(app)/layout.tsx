import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { resolveNav } from "@/lib/nav";
import { getDictionary } from "@/lib/i18n";
import { getPublicAppName } from "@/lib/app";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  if (!session) {
    redirect("/login");
  }

  const t = getDictionary("sl");
  const nav = resolveNav(session.role, session.organization?.planId ?? null);

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
    <div className="flex min-h-screen">
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
