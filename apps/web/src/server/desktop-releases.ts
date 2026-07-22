"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, like, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  desktopArtifactInputSchema,
  desktopReleaseCreateInputSchema,
  DESKTOP_CHANNEL_LABELS,
  emptyToNull,
  type DesktopArchitecture,
  type DesktopChannel,
  type DesktopPlatform,
  type DesktopReleaseCreateInput,
  type DesktopReleaseStatus,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { putObject } from "@/lib/storage";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

export type DesktopReleaseListItem = {
  id: string;
  version: string;
  channel: DesktopChannel;
  title: string;
  status: DesktopReleaseStatus;
  isMandatory: boolean;
  rolloutPercentage: number;
  publishedAt: Date | null;
  createdAt: Date;
  artifactCount: number;
};

export type DesktopArtifactRow = {
  id: string;
  desktopReleaseId: string;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  packageType: string;
  storageKey: string;
  downloadUrlReference: string | null;
  signature: string | null;
  sha256: string | null;
  fileSize: number | null;
  originalFileName: string | null;
  codeSigningStatus: string | null;
  createdAt: Date;
};

export type DesktopReleaseDetail = {
  id: string;
  version: string;
  channel: DesktopChannel;
  title: string;
  releaseNotes: string | null;
  status: DesktopReleaseStatus;
  isMandatory: boolean;
  minimumSupportedVersion: string | null;
  rolloutPercentage: number;
  publishedAt: Date | null;
  availableFrom: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DesktopInstallationFilters = {
  platform?: DesktopPlatform;
  channel?: DesktopChannel;
  search?: string;
};

export type DesktopInstallationRow = {
  id: string;
  installationId: string;
  organizationName: string | null;
  deviceName: string | null;
  platform: DesktopPlatform;
  architecture: DesktopArchitecture;
  osVersion: string | null;
  currentVersion: string | null;
  updateChannel: DesktopChannel;
  updateStatus: string | null;
  lastSeenAt: Date | null;
  lastUpdateCheckAt: Date | null;
};

/** Platform-level feature: only `platform_super_admin` holds any `desktop_releases:*` permission. */
export async function listDesktopReleases(): Promise<DesktopReleaseListItem[]> {
  await requireOrgSession("desktop_releases:read");
  const { db, schema } = getDb();

  const releases = await db
    .select()
    .from(schema.desktopRelease)
    .orderBy(desc(schema.desktopRelease.createdAt));

  const artifacts = await db
    .select({ desktopReleaseId: schema.desktopReleaseArtifact.desktopReleaseId })
    .from(schema.desktopReleaseArtifact);

  const artifactCounts = new Map<string, number>();
  for (const artifact of artifacts as Array<{ desktopReleaseId: string }>) {
    artifactCounts.set(artifact.desktopReleaseId, (artifactCounts.get(artifact.desktopReleaseId) ?? 0) + 1);
  }

  return (releases as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    version: r.version as string,
    channel: r.channel as DesktopChannel,
    title: r.title as string,
    status: r.status as DesktopReleaseStatus,
    isMandatory: Boolean(r.isMandatory),
    rolloutPercentage: r.rolloutPercentage as number,
    publishedAt: r.publishedAt as Date | null,
    createdAt: r.createdAt as Date,
    artifactCount: artifactCounts.get(r.id as string) ?? 0,
  }));
}

export async function getDesktopRelease(
  id: string,
): Promise<{ release: DesktopReleaseDetail; artifacts: DesktopArtifactRow[] } | null> {
  await requireOrgSession("desktop_releases:read");
  const { db, schema } = getDb();

  const [release] = await db
    .select()
    .from(schema.desktopRelease)
    .where(eq(schema.desktopRelease.id, id))
    .limit(1);
  if (!release) return null;

  const artifacts = (await db
    .select()
    .from(schema.desktopReleaseArtifact)
    .where(eq(schema.desktopReleaseArtifact.desktopReleaseId, id))
    .orderBy(desc(schema.desktopReleaseArtifact.createdAt))) as unknown as DesktopArtifactRow[];

  return {
    release: release as unknown as DesktopReleaseDetail,
    artifacts,
  };
}

export async function createDesktopRelease(
  raw: DesktopReleaseCreateInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("desktop_releases:write");
  const parsed = desktopReleaseCreateInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();

  const [existing] = await db
    .select({ id: schema.desktopRelease.id })
    .from(schema.desktopRelease)
    .where(
      and(
        eq(schema.desktopRelease.version, parsed.data.version.trim()),
        eq(schema.desktopRelease.channel, parsed.data.channel),
      ),
    )
    .limit(1);
  if (existing) {
    return {
      ok: false,
      error: `Različica ${parsed.data.version} za kanal ${DESKTOP_CHANNEL_LABELS[parsed.data.channel]} že obstaja.`,
    };
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(schema.desktopRelease).values({
    id,
    version: parsed.data.version.trim(),
    channel: parsed.data.channel,
    title: parsed.data.title.trim(),
    releaseNotes: emptyToNull(parsed.data.releaseNotes ?? ""),
    status: parsed.data.status,
    isMandatory: parsed.data.isMandatory,
    minimumSupportedVersion: emptyToNull(parsed.data.minimumSupportedVersion ?? ""),
    rolloutPercentage: parsed.data.rolloutPercentage,
    availableFrom: parsed.data.availableFrom ?? null,
    expiresAt: parsed.data.expiresAt ?? null,
    createdById: session.user.id,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "desktop_release.create",
    entityType: "desktop_release",
    entityId: id,
    metadata: { version: parsed.data.version, channel: parsed.data.channel },
  });

  revalidatePath("/settings/desktop");
  return { ok: true, data: { id } };
}

export async function publishDesktopRelease(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("desktop_releases:publish");
  const { db, schema } = getDb();

  const [release] = await db
    .select()
    .from(schema.desktopRelease)
    .where(eq(schema.desktopRelease.id, id))
    .limit(1);
  if (!release) return { ok: false, error: "Izdaja ni najdena." };
  if (release.status === "archived" || release.status === "withdrawn") {
    return { ok: false, error: "Umaknjene ali arhivirane izdaje ni mogoče objaviti." };
  }

  const [artifact] = await db
    .select({ id: schema.desktopReleaseArtifact.id })
    .from(schema.desktopReleaseArtifact)
    .where(eq(schema.desktopReleaseArtifact.desktopReleaseId, id))
    .limit(1);
  if (!artifact) {
    return { ok: false, error: "Pred objavo naložite vsaj eno namestitveno datoteko." };
  }

  const now = new Date();
  await db
    .update(schema.desktopRelease)
    .set({
      status: "published",
      publishedAt: release.publishedAt ?? now,
      publishedById: session.user.id,
      updatedAt: now,
    })
    .where(eq(schema.desktopRelease.id, id));

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "desktop_release.publish",
    entityType: "desktop_release",
    entityId: id,
    metadata: { version: release.version, channel: release.channel },
  });

  revalidatePath(`/settings/desktop/${id}`);
  revalidatePath("/settings/desktop");
  return { ok: true };
}

export async function pauseDesktopRelease(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("desktop_releases:manage");
  const { db, schema } = getDb();

  const [release] = await db
    .select()
    .from(schema.desktopRelease)
    .where(eq(schema.desktopRelease.id, id))
    .limit(1);
  if (!release) return { ok: false, error: "Izdaja ni najdena." };
  if (release.status !== "published") {
    return { ok: false, error: "Začasno ustaviti je mogoče samo objavljeno izdajo." };
  }

  await db
    .update(schema.desktopRelease)
    .set({ status: "paused", updatedAt: new Date() })
    .where(eq(schema.desktopRelease.id, id));

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "desktop_release.pause",
    entityType: "desktop_release",
    entityId: id,
    metadata: { version: release.version, channel: release.channel },
  });

  revalidatePath(`/settings/desktop/${id}`);
  revalidatePath("/settings/desktop");
  return { ok: true };
}

export async function withdrawDesktopRelease(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("desktop_releases:manage");
  const { db, schema } = getDb();

  const [release] = await db
    .select()
    .from(schema.desktopRelease)
    .where(eq(schema.desktopRelease.id, id))
    .limit(1);
  if (!release) return { ok: false, error: "Izdaja ni najdena." };
  if (release.status === "withdrawn" || release.status === "archived") {
    return { ok: false, error: "Izdaja je že umaknjena." };
  }

  await db
    .update(schema.desktopRelease)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(schema.desktopRelease.id, id));

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "desktop_release.withdraw",
    entityType: "desktop_release",
    entityId: id,
    metadata: { version: release.version, channel: release.channel },
  });

  revalidatePath(`/settings/desktop/${id}`);
  revalidatePath("/settings/desktop");
  return { ok: true };
}

export async function uploadDesktopArtifact(releaseId: string, formData: FormData): Promise<ActionResult> {
  const session = await requireOrgSession("desktop_releases:upload");
  const { db, schema } = getDb();

  const [release] = await db
    .select({ id: schema.desktopRelease.id })
    .from(schema.desktopRelease)
    .where(eq(schema.desktopRelease.id, releaseId))
    .limit(1);
  if (!release) return { ok: false, error: "Izdaja ni najdena." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Izberite namestitveno datoteko." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";
  const stored = await putObject({
    organizationId: session.organization.id,
    folder: `desktop-releases/${releaseId}`,
    fileName: file.name,
    contentType,
    body: buf,
  });

  const raw = {
    desktopReleaseId: releaseId,
    platform: formData.get("platform"),
    architecture: formData.get("architecture"),
    packageType: formData.get("packageType"),
    storageKey: stored.key,
    downloadUrlReference: stored.url,
    signature: formData.get("signature") ?? "",
    sha256: String(formData.get("sha256") ?? "")
      .trim()
      .toLowerCase(),
    fileSize: buf.byteLength,
    originalFileName: file.name,
    codeSigningStatus: formData.get("codeSigningStatus") ?? "",
  };

  const parsed = desktopArtifactInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const id = randomUUID();
  await db.insert(schema.desktopReleaseArtifact).values({
    id,
    desktopReleaseId: releaseId,
    platform: parsed.data.platform,
    architecture: parsed.data.architecture,
    packageType: parsed.data.packageType.trim(),
    storageKey: parsed.data.storageKey,
    downloadUrlReference: emptyToNull(parsed.data.downloadUrlReference ?? ""),
    signature: emptyToNull(parsed.data.signature ?? ""),
    sha256: emptyToNull(parsed.data.sha256 ?? ""),
    fileSize: parsed.data.fileSize ?? null,
    originalFileName: emptyToNull(parsed.data.originalFileName ?? ""),
    codeSigningStatus: emptyToNull(parsed.data.codeSigningStatus ?? ""),
    createdAt: new Date(),
  });

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "desktop_release.artifact.upload",
    entityType: "desktop_release_artifact",
    entityId: id,
    metadata: {
      desktopReleaseId: releaseId,
      platform: parsed.data.platform,
      architecture: parsed.data.architecture,
      originalFileName: file.name,
    },
  });

  revalidatePath(`/settings/desktop/${releaseId}`);
  return { ok: true };
}

export async function listDesktopInstallations(
  filters?: DesktopInstallationFilters,
): Promise<DesktopInstallationRow[]> {
  await requireOrgSession("desktop_releases:read");
  const { db, schema } = getDb();

  const conditions = [];
  if (filters?.platform) {
    conditions.push(eq(schema.desktopInstallation.platform, filters.platform));
  }
  if (filters?.channel) {
    conditions.push(eq(schema.desktopInstallation.updateChannel, filters.channel));
  }
  if (filters?.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(schema.desktopInstallation.installationId, q),
        like(schema.desktopInstallation.deviceName, q),
      )!,
    );
  }

  const rows = await db
    .select({
      id: schema.desktopInstallation.id,
      installationId: schema.desktopInstallation.installationId,
      organizationName: schema.organization.name,
      deviceName: schema.desktopInstallation.deviceName,
      platform: schema.desktopInstallation.platform,
      architecture: schema.desktopInstallation.architecture,
      osVersion: schema.desktopInstallation.osVersion,
      currentVersion: schema.desktopInstallation.currentVersion,
      updateChannel: schema.desktopInstallation.updateChannel,
      updateStatus: schema.desktopInstallation.updateStatus,
      lastSeenAt: schema.desktopInstallation.lastSeenAt,
      lastUpdateCheckAt: schema.desktopInstallation.lastUpdateCheckAt,
    })
    .from(schema.desktopInstallation)
    .leftJoin(schema.organization, eq(schema.desktopInstallation.organizationId, schema.organization.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.desktopInstallation.lastSeenAt));

  return rows as unknown as DesktopInstallationRow[];
}
