/**
 * Schema selector based on DB_PROVIDER.
 * Canonical TypeScript types come from MySQL schema (default provider).
 * PostgreSQL mirrors the same models/relations for dual-DB support.
 */
export type { DbProvider } from "./provider";
export { getProviderFromEnv, getSchema } from "./provider";

export * as mysql from "./mysql";
export * as postgresql from "./postgresql";
export * as securitydeskMysql from "./securitydesk-mysql";
export * as securitydeskPostgresql from "./securitydesk-postgresql";
export * as cctvMysql from "./cctv-mysql";
export * as cctvPostgresql from "./cctv-postgresql";
export * as serviceMysql from "./service-mysql";
export * as servicePostgresql from "./service-postgresql";
export * as networkMysql from "./network-mysql";
export * as networkPostgresql from "./network-postgresql";
export * as configVaultMysql from "./config-vault-mysql";
export * as configVaultPostgresql from "./config-vault-postgresql";
export * as firmwareGuardMysql from "./firmware-guard-mysql";
export * as firmwareGuardPostgresql from "./firmware-guard-postgresql";
export * as monitoringMysql from "./monitoring-mysql";
export * as monitoringPostgresql from "./monitoring-postgresql";
export * as cameraDeployMysql from "./camera-deploy-mysql";
export * as cameraDeployPostgresql from "./camera-deploy-postgresql";
export * as floorplanMysql from "./floorplan-mysql";
export * as floorplanPostgresql from "./floorplan-postgresql";
export * as inventoryMysql from "./inventory-mysql";
export * as inventoryPostgresql from "./inventory-postgresql";
export * as desktopMysql from "./desktop-mysql";
export * as desktopPostgresql from "./desktop-postgresql";

// Default table exports (MySQL) — used for Better Auth adapter typing & app imports.
export {
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  subscription,
  moduleEntitlement,
  auditLog,
  organizationSettings,
  dashboardStat,
} from "./mysql";

export {
  customer,
  customerContact,
  site,
  building,
  floor,
  room,
  manufacturer,
  deviceType,
  device,
  deviceCredential,
  siteDocument,
  deviceDocument,
} from "./securitydesk-mysql";

export { cctvProject, cctvScenario } from "./cctv-mysql";

export {
  serviceTicket,
  workOrder,
  serviceReport,
  handoverPackage,
  handoverChecklistItem,
  handoverDocument,
  handoverSignature,
} from "./service-mysql";

export {
  networkSwitch,
  networkVlan,
  networkPort,
  networkIpAssignment,
} from "./network-mysql";

export { configurationBackup } from "./config-vault-mysql";

export {
  firmwareAdvisory,
  firmwareAffectedModel,
  firmwareMatch,
  remediationCampaign,
} from "./firmware-guard-mysql";

export {
  monitoringAgent,
  agentEnrollmentToken,
  monitoringCheck,
  monitoringCheckResult,
} from "./monitoring-mysql";

export { cameraDeploySession, cameraDeployTarget } from "./camera-deploy-mysql";

export {
  floorPlan,
  floorPlanLayer,
  floorPlanElement,
  floorPlanConnection,
  floorPlanZone,
  floorPlanVersion,
} from "./floorplan-mysql";

export {
  inventoryCategory,
  inventoryItem,
  inventoryLocation,
  inventoryStock,
  inventorySerial,
  inventoryMovement,
  inventoryReservation,
  supplier,
  purchaseOrder,
  purchaseOrderItem,
  rmaCase,
  stocktake,
  stocktakeItem,
} from "./inventory-mysql";

export {
  desktopRelease,
  desktopReleaseArtifact,
  desktopInstallation,
  desktopUpdateEvent,
  desktopApiToken,
} from "./desktop-mysql";
