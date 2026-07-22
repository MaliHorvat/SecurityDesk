import type { AppModule } from "@securitydesk/config";
import type { Permission } from "./permissions";
import { hasPermission } from "./permissions";
import type { PlatformRole } from "./roles";
import { isModuleEnabled, type PlanId } from "./plans";

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  icon: string;
  permission?: Permission;
  module?: AppModule;
};

export const MAIN_NAV: NavItem[] = [
  { id: "dashboard", href: "/dashboard", labelKey: "nav.dashboard", icon: "LayoutDashboard" },
  {
    id: "customers",
    href: "/customers",
    labelKey: "nav.customers",
    icon: "Building2",
    permission: "customers:read",
    module: "securitydesk",
  },
  {
    id: "sites",
    href: "/sites",
    labelKey: "nav.sites",
    icon: "MapPin",
    permission: "sites:read",
    module: "securitydesk",
  },
  {
    id: "devices",
    href: "/devices",
    labelKey: "nav.devices",
    icon: "HardDrive",
    permission: "devices:read",
    module: "securitydesk",
  },
  {
    id: "projects",
    href: "/projects",
    labelKey: "nav.projects",
    icon: "Calculator",
    permission: "projects:read",
    module: "cctv_designer",
  },
  {
    id: "camera-deploy",
    href: "/camera-deploy",
    labelKey: "nav.cameraDeploy",
    icon: "Camera",
    permission: "camera_deploy:read",
    module: "camera_deploy",
  },
  {
    id: "floorplans",
    href: "/floorplans",
    labelKey: "nav.floorplans",
    icon: "Map",
    permission: "floorplan:read",
    // Shown by permission during rollout; plan catalog still lists the module for billing.
  },
  {
    id: "inventory",
    href: "/inventory",
    labelKey: "nav.inventory",
    icon: "Package",
    permission: "inventory:read",
  },
  {
    id: "network",
    href: "/network",
    labelKey: "nav.network",
    icon: "Network",
    permission: "network:read",
    module: "portmap",
  },
  {
    id: "config-vault",
    href: "/config-vault",
    labelKey: "nav.configVault",
    icon: "Lock",
    permission: "config_vault:read",
    module: "config_vault",
  },
  {
    id: "firmware",
    href: "/firmware",
    labelKey: "nav.firmware",
    icon: "ShieldAlert",
    permission: "firmware:read",
    module: "firmware_guard",
  },
  {
    id: "service",
    href: "/service",
    labelKey: "nav.service",
    icon: "Wrench",
    permission: "service:read",
    module: "service_report",
  },
  {
    id: "handover",
    href: "/handover",
    labelKey: "nav.handover",
    icon: "Handshake",
    permission: "handover:read",
    module: "handover_hub",
  },
  {
    id: "monitoring",
    href: "/monitoring",
    labelKey: "nav.monitoring",
    icon: "Activity",
    permission: "monitoring:read",
    module: "multivms",
  },
  {
    id: "ai",
    href: "/ai",
    labelKey: "nav.ai",
    icon: "Bot",
    permission: "ai:use",
    module: "ai_troubleshooter",
  },
  {
    id: "reports",
    href: "/reports",
    labelKey: "nav.reports",
    icon: "FileBarChart",
    permission: "reports:export",
  },
  {
    id: "settings",
    href: "/settings",
    labelKey: "nav.settings",
    icon: "Settings",
    permission: "settings:read",
  },
  {
    id: "desktop-releases",
    href: "/settings/desktop",
    labelKey: "nav.desktopReleases",
    icon: "Rocket",
    // Platform-level feature: only platform_super_admin holds this permission,
    // so gating on it alone is sufficient to hide the item from everyone else.
    permission: "desktop_releases:read",
  },
];

export function getVisibleNav(
  role: PlatformRole,
  planId: PlanId,
): NavItem[] {
  return MAIN_NAV.filter((item) => {
    if (item.permission && !hasPermission(role, item.permission)) {
      return false;
    }
    if (item.module && !isModuleEnabled(planId, item.module)) {
      return false;
    }
    return true;
  });
}
