import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  assertPermission,
  compareSemVer,
  isInRollout,
  type DesktopArchitecture,
  type DesktopChannel,
  type DesktopPlatform,
  type DesktopRegisterInstallationInput,
  type DesktopUpdateEventInput,
  type PlatformRole,
} from "@securitydesk/shared";
import type { Customer, SiteListItem, DeviceListItem } from "@/server/types";

export async function listCustomersForOrg(organizationId: string, role: PlatformRole): Promise<Customer[]> {
  assertPermission(role, "customers:read");
  const { db, schema } = getDb();
  return (await db
    .select()
    .from(schema.customer)
    .where(and(eq(schema.customer.organizationId, organizationId), isNull(schema.customer.deletedAt)))
    .orderBy(desc(schema.customer.createdAt))) as Customer[];
}

export async function listSitesForOrg(organizationId: string, role: PlatformRole): Promise<SiteListItem[]> {
  assertPermission(role, "sites:read");
  const { db, schema } = getDb();
  return (await db
    .select({ site: schema.site, customerName: schema.customer.name })
    .from(schema.site)
    .leftJoin(schema.customer, eq(schema.site.customerId, schema.customer.id))
    .where(and(eq(schema.site.organizationId, organizationId), isNull(schema.site.deletedAt)))
    .orderBy(desc(schema.site.createdAt))) as SiteListItem[];
}

export async function listDevicesForOrg(organizationId: string, role: PlatformRole): Promise<DeviceListItem[]> {
  assertPermission(role, "devices:read");
  const { db, schema } = getDb();
  return (await db
    .select({
      device: schema.device,
      customerName: schema.customer.name,
      siteName: schema.site.name,
      manufacturerName: schema.manufacturer.name,
      deviceTypeName: schema.deviceType.name,
    })
    .from(schema.device)
    .leftJoin(schema.customer, eq(schema.device.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.device.siteId, schema.site.id))
    .leftJoin(schema.manufacturer, eq(schema.device.manufacturerId, schema.manufacturer.id))
    .leftJoin(schema.deviceType, eq(schema.device.deviceTypeId, schema.deviceType.id))
    .where(and(eq(schema.device.organizationId, organizationId), isNull(schema.device.deletedAt)))
    .orderBy(desc(schema.device.createdAt))) as DeviceListItem[];
}

export type DesktopDashboardStats = {
  customersCount: number;
  sitesCount: number;
  devicesCount: number;
  openTicketsCount: number;
  onlineDevicesCount: number;
  offlineDevicesCount: number;
};

export async function getDashboardStatsForOrg(
  organizationId: string,
  role: PlatformRole,
): Promise<DesktopDashboardStats> {
  assertPermission(role, "customers:read");
  const { db, schema } = getDb();
  const [stats] = await db
    .select()
    .from(schema.dashboardStat)
    .where(eq(schema.dashboardStat.organizationId, organizationId))
    .limit(1);

  return {
    customersCount: stats?.customersCount ?? 0,
    sitesCount: stats?.sitesCount ?? 0,
    devicesCount: stats?.devicesCount ?? 0,
    openTicketsCount: stats?.openTicketsCount ?? 0,
    onlineDevicesCount: stats?.onlineDevicesCount ?? 0,
    offlineDevicesCount: stats?.offlineDevicesCount ?? 0,
  };
}

export async function upsertDesktopInstallation(
  input: DesktopRegisterInstallationInput & { organizationId?: string | null; userId?: string | null },
): Promise<{ id: string }> {
  const { db, schema } = getDb();
  const now = new Date();

  const [existing] = await db
    .select({ id: schema.desktopInstallation.id })
    .from(schema.desktopInstallation)
    .where(eq(schema.desktopInstallation.installationId, input.installationId))
    .limit(1);

  if (existing) {
    await db
      .update(schema.desktopInstallation)
      .set({
        organizationId: input.organizationId ?? undefined,
        userId: input.userId ?? undefined,
        deviceName: input.deviceName?.trim() || null,
        platform: input.platform,
        architecture: input.architecture,
        osVersion: input.osVersion?.trim() || null,
        currentVersion: input.currentVersion?.trim() || null,
        updateChannel: input.channel ?? undefined,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(schema.desktopInstallation.id, existing.id));
    return { id: existing.id };
  }

  const id = randomUUID();
  await db.insert(schema.desktopInstallation).values({
    id,
    installationId: input.installationId,
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    deviceName: input.deviceName?.trim() || null,
    platform: input.platform,
    architecture: input.architecture,
    osVersion: input.osVersion?.trim() || null,
    currentVersion: input.currentVersion?.trim() || null,
    updateChannel: input.channel ?? "stable",
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

export type DesktopUpdateMatch = {
  releaseId: string;
  version: string;
  notes: string | null;
  publishedAt: Date | null;
  artifact: {
    signature: string | null;
    downloadUrlReference: string;
  };
};

/** Latest published release with an artifact for this platform/arch, honoring channel + rollout. */
export async function findDesktopUpdate(input: {
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  channel: DesktopChannel;
  currentVersion: string;
  installationId: string;
}): Promise<DesktopUpdateMatch | null> {
  const { db, schema } = getDb();

  const releases = await db
    .select({
      id: schema.desktopRelease.id,
      version: schema.desktopRelease.version,
      releaseNotes: schema.desktopRelease.releaseNotes,
      rolloutPercentage: schema.desktopRelease.rolloutPercentage,
      publishedAt: schema.desktopRelease.publishedAt,
      artifactSignature: schema.desktopReleaseArtifact.signature,
      artifactDownloadRef: schema.desktopReleaseArtifact.downloadUrlReference,
      artifactStorageKey: schema.desktopReleaseArtifact.storageKey,
    })
    .from(schema.desktopRelease)
    .innerJoin(
      schema.desktopReleaseArtifact,
      eq(schema.desktopReleaseArtifact.desktopReleaseId, schema.desktopRelease.id),
    )
    .where(
      and(
        eq(schema.desktopRelease.status, "published"),
        or(eq(schema.desktopRelease.channel, input.channel), eq(schema.desktopRelease.channel, "internal")),
        eq(schema.desktopReleaseArtifact.platform, input.platform),
        eq(schema.desktopReleaseArtifact.architecture, input.architecture),
      ),
    )
    .orderBy(desc(schema.desktopRelease.publishedAt));

  for (const release of releases) {
    if (compareSemVer(release.version, input.currentVersion) <= 0) continue;
    if (!isInRollout(release.id, input.installationId, release.rolloutPercentage)) continue;

    return {
      releaseId: release.id,
      version: release.version,
      notes: release.releaseNotes,
      publishedAt: release.publishedAt,
      artifact: {
        signature: release.artifactSignature,
        downloadUrlReference: release.artifactDownloadRef || release.artifactStorageKey,
      },
    };
  }

  return null;
}

export async function markInstallationUpdateCheck(installationId: string, offeredVersion?: string | null) {
  const { db, schema } = getDb();
  await db
    .update(schema.desktopInstallation)
    .set({ lastUpdateCheckAt: new Date(), lastOfferedVersion: offeredVersion ?? undefined, updatedAt: new Date() })
    .where(eq(schema.desktopInstallation.installationId, installationId));
}

export async function recordDesktopUpdateEvent(input: DesktopUpdateEventInput): Promise<{ ok: boolean }> {
  const { db, schema } = getDb();
  const [installation] = await db
    .select({ id: schema.desktopInstallation.id })
    .from(schema.desktopInstallation)
    .where(eq(schema.desktopInstallation.installationId, input.installationId))
    .limit(1);
  if (!installation) return { ok: false };

  let releaseId: string | null = null;
  if (input.toVersion?.trim()) {
    const [release] = await db
      .select({ id: schema.desktopRelease.id })
      .from(schema.desktopRelease)
      .where(eq(schema.desktopRelease.version, input.toVersion.trim()))
      .limit(1);
    releaseId = release?.id ?? null;
  }

  await db.insert(schema.desktopUpdateEvent).values({
    id: randomUUID(),
    desktopInstallationId: installation.id,
    desktopReleaseId: releaseId,
    eventType: input.eventType,
    fromVersion: input.fromVersion?.trim() || null,
    toVersion: input.toVersion?.trim() || null,
    errorCode: input.errorCode?.trim() || null,
    errorMessage: input.errorMessage?.trim() || null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: new Date(),
  });

  if (input.eventType === "install" && input.toVersion?.trim()) {
    await db
      .update(schema.desktopInstallation)
      .set({
        lastInstalledVersion: input.toVersion.trim(),
        currentVersion: input.toVersion.trim(),
        updateStatus: "installed",
        updatedAt: new Date(),
      })
      .where(eq(schema.desktopInstallation.id, installation.id));
  } else if (input.eventType === "error") {
    await db
      .update(schema.desktopInstallation)
      .set({ updateStatus: "error", updatedAt: new Date() })
      .where(eq(schema.desktopInstallation.id, installation.id));
  }

  return { ok: true };
}
