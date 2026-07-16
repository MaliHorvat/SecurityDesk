/**
 * Schema selector based on DB_PROVIDER.
 * Canonical TypeScript types come from MySQL schema (default provider).
 * PostgreSQL mirrors the same models/relations for dual-DB support.
 */
export type { DbProvider } from "./provider";
export { getProviderFromEnv, getSchema } from "./provider";

export * as mysql from "./mysql";
export * as postgresql from "./postgresql";

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
