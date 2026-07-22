"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Lock,
  Map,
  MapPin,
  Network,
  Package,
  Rocket,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { NavItem } from "@securitydesk/shared";
import { cn } from "@securitydesk/ui";
import type { Dictionary } from "@/lib/i18n";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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
  Rocket,
  Settings,
};

export function AppSidebar({
  items,
  labels,
  appName,
}: {
  items: NavItem[];
  labels: Dictionary["nav"];
  appName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card/80 backdrop-blur md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-primary">
          {appName}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const label = labels[item.labelKey.replace("nav.", "") as keyof Dictionary["nav"]] ?? item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
