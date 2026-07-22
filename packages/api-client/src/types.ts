/**
 * Lightweight response types shared by API consumers (web, desktop).
 * These intentionally mirror the subset of `@securitydesk/database` schema
 * fields that are safe to expose to clients — keep in sync manually, do not
 * import drizzle schemas here (this package must stay dependency-free so it
 * can be bundled into the desktop app and other non-Node runtimes).
 */

export type CustomerStatus = "active" | "inactive" | "prospect";

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  taxId: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  organizationId: string;
  customerId: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DeviceStatus = "active" | "inactive" | "maintenance" | "decommissioned" | "unknown";

export interface Device {
  id: string;
  organizationId: string;
  customerId: string | null;
  siteId: string | null;
  name: string;
  model: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  status: DeviceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface SessionOrganization {
  id: string;
  name: string;
  planId: string;
}

export interface AuthSession {
  user: SessionUser;
  organization: SessionOrganization | null;
  role: string | null;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export interface DesktopLoginResponse {
  token: string;
  expiresAt: string;
  user: SessionUser & { image: string | null };
  organization: SessionOrganization | null;
  role: string | null;
}

export interface DesktopMeResponse {
  user: SessionUser & { image?: string | null };
  organization: SessionOrganization | null;
  role: string | null;
  permissions: string[];
}

export interface DesktopDashboardStats {
  customersCount: number;
  sitesCount: number;
  devicesCount: number;
  openTicketsCount: number;
  onlineDevicesCount: number;
  offlineDevicesCount: number;
}

/** Tauri updater manifest — `null` when the client is already on the latest version. */
export interface DesktopUpdateCheckResult {
  version: string;
  pub_date: string;
  url: string;
  signature: string;
  notes: string;
}
