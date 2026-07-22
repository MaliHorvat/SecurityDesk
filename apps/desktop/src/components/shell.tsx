import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  Bot,
  Building2,
  Calculator,
  Camera,
  FileBarChart,
  HardDrive,
  Handshake,
  LayoutDashboard,
  LogOut,
  Lock,
  Map,
  MapPin,
  Network,
  Package,
  Rocket,
  Settings,
  ShieldAlert,
  WifiOff,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getVisibleNav, type PlanId, type PlatformRole } from "@securitydesk/shared";
import { cn } from "@securitydesk/ui";
import { t } from "@/lib/i18n";
import { useAuth } from "@/providers/auth-provider";
import { useOffline } from "@/providers/offline-provider";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  MapPin,
  HardDrive,
  Calculator,
  Camera,
  Map,
  Package,
  Network,
  Lock,
  ShieldAlert,
  Wrench,
  Handshake,
  Activity,
  Bot,
  FileBarChart,
  Settings,
  Rocket,
};

const NAV_LABELS: Record<string, string> = {
  dashboard: t.nav.dashboard,
  customers: t.nav.customers,
  sites: t.nav.sites,
  devices: t.nav.devices,
  projects: t.nav.projects,
  "camera-deploy": t.nav.cameraDeploy,
  floorplans: t.nav.floorplans,
  inventory: t.nav.inventory,
  network: t.nav.network,
  "config-vault": t.nav.configVault,
  firmware: t.nav.firmware,
  service: t.nav.service,
  handover: t.nav.handover,
  monitoring: t.nav.monitoring,
  ai: t.nav.ai,
  reports: t.nav.reports,
  settings: t.nav.settings,
  "desktop-releases": t.nav.desktopReleases,
};

export function Shell() {
  const { session, logout } = useAuth();
  const { isOnline, isServerReachable } = useOffline();
  const role = (session?.role ?? "viewer") as PlatformRole;
  const planId = (session?.organization?.planId ?? "integrator") as PlanId;
  const items = getVisibleNav(role, planId).filter((item) => item.id !== "desktop-releases");
  const showOfflineBanner = !isOnline || isServerReachable === false;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex h-14 items-center border-b border-border px-5">
          <span className="text-base font-semibold tracking-tight text-primary">{t.appName}</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const label = NAV_LABELS[item.id] ?? item.id;
            const to = item.href.replace(/^\//, "");
            return (
              <NavLink
                key={item.id}
                to={to || "dashboard"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          {showOfflineBanner ? (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-600">
              <WifiOff className="h-3.5 w-3.5" />
              Offline
            </div>
          ) : null}
          <div className="truncate px-2 text-xs text-muted-foreground">
            {session?.organization?.name ?? "—"}
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t.auth.logout}
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
