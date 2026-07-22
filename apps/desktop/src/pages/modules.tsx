import { ModulePlaceholderPage } from "@/components/module-placeholder";
import { t } from "@/lib/i18n";

export function ProjectsPage() {
  return <ModulePlaceholderPage title={t.nav.projects} webPath="/projects" />;
}

export function CameraDeployPage() {
  return <ModulePlaceholderPage title={t.nav.cameraDeploy} webPath="/camera-deploy" />;
}

export function FloorplansPage() {
  return <ModulePlaceholderPage title={t.nav.floorplans} webPath="/floorplans" />;
}

export function InventoryPage() {
  return <ModulePlaceholderPage title={t.nav.inventory} webPath="/inventory" />;
}

export function NetworkPage() {
  return <ModulePlaceholderPage title={t.nav.network} webPath="/network" />;
}

export function ConfigVaultPage() {
  return <ModulePlaceholderPage title={t.nav.configVault} webPath="/config-vault" />;
}

export function FirmwarePage() {
  return <ModulePlaceholderPage title={t.nav.firmware} webPath="/firmware" />;
}

export function ServicePage() {
  return <ModulePlaceholderPage title={t.nav.service} webPath="/service" />;
}

export function HandoverPage() {
  return <ModulePlaceholderPage title={t.nav.handover} webPath="/handover" />;
}

export function MonitoringPage() {
  return <ModulePlaceholderPage title={t.nav.monitoring} webPath="/monitoring" />;
}

export function AiPage() {
  return <ModulePlaceholderPage title={t.nav.ai} webPath="/ai" />;
}

export function ReportsPage() {
  return <ModulePlaceholderPage title={t.nav.reports} webPath="/reports" />;
}
