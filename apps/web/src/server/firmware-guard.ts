"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  firmwareAdvisoryInputSchema,
  firmwareAffectedModelInputSchema,
  remediationCampaignInputSchema,
  type FirmwareAdvisoryInput,
  type FirmwareAffectedModelInput,
  type RemediationCampaignInput,
  parseOptionalDate,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { ensureDeviceType, ensureManufacturer, writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

export type FirmwareAdvisoryRow = {
  id: string;
  title: string;
  vendor: string;
  severity: string;
  description: string | null;
  recommendedAction: string | null;
  officialUrl: string | null;
  status: string;
  dueAt: Date | null;
  lastCheckedAt: Date | null;
};

export type FirmwareAffectedModelRow = {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  deviceTypeId: string;
  deviceTypeName: string;
  versionPattern: string;
  matchStrategy: string;
};

export type FirmwareMatchRow = {
  matchId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string | null;
  customerName: string | null;
  siteName: string | null;
  firmwareVersion: string | null;
  matchStatus: string;
};

export async function listFirmwareAdvisories(search?: string): Promise<FirmwareAdvisoryRow[]> {
  const session = await requireOrgSession("firmware:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const conditions = [
    eq(schema.firmwareAdvisory.organizationId, orgId),
    isNull(schema.firmwareAdvisory.deletedAt),
  ];

  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        like(schema.firmwareAdvisory.title, q),
        like(schema.firmwareAdvisory.vendor, q),
        like(schema.firmwareAdvisory.description, q),
      )!,
    );
  }

  return (await db
    .select()
    .from(schema.firmwareAdvisory)
    .where(and(...conditions))
    .orderBy(desc(schema.firmwareAdvisory.createdAt))) as unknown as FirmwareAdvisoryRow[];
}

export async function getFirmwareAdvisory(id: string): Promise<{
  advisory: FirmwareAdvisoryRow;
  affectedModels: FirmwareAffectedModelRow[];
  matches: FirmwareMatchRow[];
} | null> {
  const session = await requireOrgSession("firmware:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [advisory] = (await db
    .select()
    .from(schema.firmwareAdvisory)
    .where(
      and(
        eq(schema.firmwareAdvisory.id, id),
        eq(schema.firmwareAdvisory.organizationId, orgId),
        isNull(schema.firmwareAdvisory.deletedAt),
      ),
    )
    .limit(1)) as unknown as FirmwareAdvisoryRow[];

  if (!advisory) return null;

  const affectedModels = (await db
    .select({
      id: schema.firmwareAffectedModel.id,
      manufacturerId: schema.firmwareAffectedModel.manufacturerId,
      manufacturerName: schema.manufacturer.name,
      deviceTypeId: schema.firmwareAffectedModel.deviceTypeId,
      deviceTypeName: schema.deviceType.name,
      versionPattern: schema.firmwareAffectedModel.versionPattern,
      matchStrategy: schema.firmwareAffectedModel.matchStrategy,
    })
    .from(schema.firmwareAffectedModel)
    .leftJoin(schema.manufacturer, eq(schema.firmwareAffectedModel.manufacturerId, schema.manufacturer.id))
    .leftJoin(schema.deviceType, eq(schema.firmwareAffectedModel.deviceTypeId, schema.deviceType.id))
    .where(
      and(
        eq(schema.firmwareAffectedModel.organizationId, orgId),
        eq(schema.firmwareAffectedModel.advisoryId, id),
        isNull(schema.firmwareAffectedModel.deletedAt),
      ),
    )) as unknown as FirmwareAffectedModelRow[];

  const matches = await listFirmwareMatches(id);
  return { advisory, affectedModels, matches };
}

export async function createFirmwareAdvisory(raw: FirmwareAdvisoryInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("firmware:write");
  const parsed = firmwareAdvisoryInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const id = randomUUID();

  await db.insert(schema.firmwareAdvisory).values({
    id,
    organizationId: orgId,
    title: parsed.data.title.trim(),
    vendor: parsed.data.vendor.trim(),
    description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
    severity: parsed.data.severity,
    recommendedAction: parsed.data.recommendedAction?.trim() ? parsed.data.recommendedAction.trim() : null,
    officialUrl: parsed.data.officialUrl?.trim() ? parsed.data.officialUrl.trim() : null,
    dueAt: parseOptionalDate(parsed.data.dueAt),
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "firmware_guard.advisory.create",
    entityType: "firmware_advisory",
    entityId: id,
  });

  revalidatePath("/firmware");
  return { ok: true, data: { id } };
}

export async function addFirmwareAffectedModel(
  advisoryId: string,
  raw: FirmwareAffectedModelInput,
): Promise<ActionResult> {
  const session = await requireOrgSession("firmware:write");
  const parsed = firmwareAffectedModelInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [advisory] = await db
    .select({ id: schema.firmwareAdvisory.id })
    .from(schema.firmwareAdvisory)
    .where(
      and(
        eq(schema.firmwareAdvisory.id, advisoryId),
        eq(schema.firmwareAdvisory.organizationId, orgId),
        isNull(schema.firmwareAdvisory.deletedAt),
      ),
    )
    .limit(1);
  if (!advisory) return { ok: false, error: "Advisory ni najden." };

  const manufacturerId = await ensureManufacturer(orgId, parsed.data.manufacturerName);
  const deviceTypeId = await ensureDeviceType(orgId, parsed.data.deviceTypeName);
  if (!manufacturerId || !deviceTypeId) return { ok: false, error: "Ni bilo mogoče ustvariti/poiskati modelov." };

  const id = randomUUID();
  await db.insert(schema.firmwareAffectedModel).values({
    id,
    organizationId: orgId,
    advisoryId,
    manufacturerId,
    deviceTypeId,
    versionPattern: parsed.data.versionPattern.trim(),
    matchStrategy: parsed.data.matchStrategy,
    notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath(`/firmware/${advisoryId}`);
  return { ok: true };
}

export async function runFirmwareMatches(advisoryId: string): Promise<ActionResult<{ inserted: number }>> {
  const session = await requireOrgSession("firmware:write");
  if (!advisoryId?.trim()) return { ok: false, error: "Neveljaven ID." };

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = new Date();

  const [advisory] = await db
    .select({ id: schema.firmwareAdvisory.id })
    .from(schema.firmwareAdvisory)
    .where(
      and(
        eq(schema.firmwareAdvisory.id, advisoryId),
        eq(schema.firmwareAdvisory.organizationId, orgId),
        isNull(schema.firmwareAdvisory.deletedAt),
      ),
    )
    .limit(1);
  if (!advisory) return { ok: false, error: "Advisory ni najden." };

  const affectedModels = await db
    .select()
    .from(schema.firmwareAffectedModel)
    .where(
      and(
        eq(schema.firmwareAffectedModel.advisoryId, advisoryId),
        eq(schema.firmwareAffectedModel.organizationId, orgId),
        isNull(schema.firmwareAffectedModel.deletedAt),
      ),
    );

  await db
    .delete(schema.firmwareMatch)
    .where(and(eq(schema.firmwareMatch.advisoryId, advisoryId), eq(schema.firmwareMatch.organizationId, orgId)));

  const devices = await db
    .select({
      id: schema.device.id,
      firmware: schema.device.firmware,
      manufacturerId: schema.device.manufacturerId,
      deviceTypeId: schema.device.deviceTypeId,
    })
    .from(schema.device)
    .where(
      and(
        eq(schema.device.organizationId, orgId),
        isNull(schema.device.deletedAt),
        sql`${schema.device.firmware} IS NOT NULL`,
      ),
    );

  const toInsert: Array<{
    id: string;
    organizationId: string;
    advisoryId: string;
    deviceId: string;
    matchedFirmware: string;
    matchStrategy: string;
    status: string;
    campaignId: string | null;
    checkedAt: Date;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (const d of devices) {
    const firmware = d.firmware;
    if (!firmware) continue;

    const match = affectedModels.find((m: { manufacturerId: string; deviceTypeId: string; matchStrategy: string; versionPattern: string }) => {
      if (m.manufacturerId !== d.manufacturerId) return false;
      if (m.deviceTypeId !== d.deviceTypeId) return false;
      if (m.matchStrategy === "equals") return firmware === m.versionPattern;
      if (m.matchStrategy === "starts_with") return firmware.startsWith(m.versionPattern);
      return false;
    });

    if (!match) continue;

    toInsert.push({
      id: randomUUID(),
      organizationId: orgId,
      advisoryId,
      deviceId: d.id,
      matchedFirmware: firmware,
      matchStrategy: match.matchStrategy,
      status: "open",
      campaignId: null,
      checkedAt: now,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (toInsert.length > 0) {
    // Dual-dialect insert — keep loose typing at boundary.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(schema.firmwareMatch).values(toInsert as any);
  }

  await db
    .update(schema.firmwareAdvisory)
    .set({ lastCheckedAt: now })
    .where(eq(schema.firmwareAdvisory.id, advisoryId));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "firmware_guard.advisory.check",
    entityType: "firmware_advisory",
    entityId: advisoryId,
    metadata: { matches: toInsert.length },
  });

  revalidatePath(`/firmware/${advisoryId}`);
  return { ok: true, data: { inserted: toInsert.length } };
}

export async function listFirmwareMatches(advisoryId: string): Promise<FirmwareMatchRow[]> {
  const session = await requireOrgSession("firmware:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      matchId: schema.firmwareMatch.id,
      deviceId: schema.device.id,
      deviceName: schema.device.name,
      ipAddress: schema.device.ipAddress,
      customerName: schema.customer.name,
      siteName: schema.site.name,
      firmwareVersion: schema.firmwareMatch.matchedFirmware,
      matchStatus: schema.firmwareMatch.status,
    })
    .from(schema.firmwareMatch)
    .leftJoin(schema.device, eq(schema.firmwareMatch.deviceId, schema.device.id))
    .leftJoin(schema.customer, eq(schema.device.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.device.siteId, schema.site.id))
    .where(
      and(
        eq(schema.firmwareMatch.organizationId, orgId),
        eq(schema.firmwareMatch.advisoryId, advisoryId),
        isNull(schema.device.deletedAt),
      ),
    )
    .orderBy(desc(schema.firmwareMatch.checkedAt));

  return rows as unknown as FirmwareMatchRow[];
}

export async function createRemediationCampaign(
  advisoryId: string,
  raw: RemediationCampaignInput,
): Promise<ActionResult<{ campaignId: string }>> {
  const session = await requireOrgSession("firmware:write");
  const parsed = remediationCampaignInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = new Date();

  const campaignId = randomUUID();
  await db.insert(schema.remediationCampaign).values({
    id: campaignId,
    organizationId: orgId,
    advisoryId,
    title: parsed.data.title.trim(),
    status: "active",
    dueAt: parseOptionalDate(parsed.data.dueAt),
    notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    createdByUserId: session.user.id,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(schema.firmwareMatch)
    .set({ status: "in_campaign", campaignId })
    .where(
      and(
        eq(schema.firmwareMatch.organizationId, orgId),
        eq(schema.firmwareMatch.advisoryId, advisoryId),
        eq(schema.firmwareMatch.status, "open"),
      ),
    );

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "firmware_guard.campaign.create",
    entityType: "remediation_campaign",
    entityId: campaignId,
    metadata: { advisoryId },
  });

  revalidatePath(`/firmware/${advisoryId}`);
  return { ok: true, data: { campaignId } };
}
