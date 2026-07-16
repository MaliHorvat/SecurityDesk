import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@securitydesk/database";

export async function writeAuditLog(input: {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { db, schema } = getDb();
  await db.insert(schema.auditLog).values({
    id: randomUUID(),
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    createdAt: new Date(),
  });
}

export async function refreshDashboardStats(organizationId: string) {
  const { db, schema } = getDb();
  const [[customers], [sites], [devices]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.customer)
      .where(and(eq(schema.customer.organizationId, organizationId), isNull(schema.customer.deletedAt))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.site)
      .where(and(eq(schema.site.organizationId, organizationId), isNull(schema.site.deletedAt))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.device)
      .where(and(eq(schema.device.organizationId, organizationId), isNull(schema.device.deletedAt))),
  ]);

  const customersCount = Number(customers?.count ?? 0);
  const sitesCount = Number(sites?.count ?? 0);
  const devicesCount = Number(devices?.count ?? 0);

  const existing = await db
    .select()
    .from(schema.dashboardStat)
    .where(eq(schema.dashboardStat.organizationId, organizationId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.dashboardStat)
      .set({
        customersCount,
        sitesCount,
        devicesCount,
        updatedAt: new Date(),
      })
      .where(eq(schema.dashboardStat.id, existing[0].id));
  } else {
    await db.insert(schema.dashboardStat).values({
      id: randomUUID(),
      organizationId,
      customersCount,
      sitesCount,
      devicesCount,
      openTicketsCount: 0,
      onlineDevicesCount: 0,
      offlineDevicesCount: 0,
      updatedAt: new Date(),
    });
  }
}

export async function ensureManufacturer(organizationId: string, name: string | null | undefined) {
  if (!name?.trim()) return null;
  const { db, schema } = getDb();
  const trimmed = name.trim();
  const [existing] = await db
    .select()
    .from(schema.manufacturer)
    .where(and(eq(schema.manufacturer.organizationId, organizationId), eq(schema.manufacturer.name, trimmed)))
    .limit(1);
  if (existing) return existing.id;
  const id = randomUUID();
  await db.insert(schema.manufacturer).values({
    id,
    organizationId,
    name: trimmed,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

export async function ensureDeviceType(organizationId: string, name: string | null | undefined) {
  if (!name?.trim()) return null;
  const { db, schema } = getDb();
  const trimmed = name.trim();
  const [existing] = await db
    .select()
    .from(schema.deviceType)
    .where(and(eq(schema.deviceType.organizationId, organizationId), eq(schema.deviceType.name, trimmed)))
    .limit(1);
  if (existing) return existing.id;
  const id = randomUUID();
  await db.insert(schema.deviceType).values({
    id,
    organizationId,
    name: trimmed,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}
