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
  Settings,
  ShieldAlert,
  WifiOff,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { MAIN_NAV } from "@securitydesk/shared";
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
};

/** Nav items with a real page implemented in the desktop shell (see src/pages). */
const DESKTOP_NAV_IDS = new Set(["dashboard", "customers", "sites", "devices", "settings"]);

const NAV_LABELS: Record<string, string> = {
  dashboard: t.nav.dashboard,
  customers: t.nav.customers,
  sites: t.nav.sites,
  devices: t.nav.devices,
  settings: t.nav.settings,
};

export function Shell() {
  const { session, logout } = useAuth();
  const { isOnline, isServerReachable } = useOffline();
  const items = MAIN_NAV.filter((item) => DESKTOP_NAV_IDS.has(item.id));
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
            return (
              <NavLink
                key={item.id}
                to={item.href}
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
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t.auth.logout}</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
          <span className="text-sm text-muted-foreground">{session?.organization?.name ?? session?.user.email ?? ""}</span>
          {showOfflineBanner ? (
            <span className="flex items-center gap-2 rounded-md bg-destructive/15 px-3 py-1 text-xs font-medium text-destructive">
              <WifiOff className="h-3.5 w-3.5" />
              {t.auth.offlineHint}
            </span>
          ) : null}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
