"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  buildingInputSchema,
  createQrToken,
  emptyToNull,
  floorInputSchema,
  roomInputSchema,
  siteInputSchema,
  type SiteInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { refreshDashboardStats, writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";
import type { BuildingTree, Device, Site, SiteListItem } from "@/server/types";

function normalizeSite(input: SiteInput) {
  return {
    customerId: input.customerId,
    name: input.name.trim(),
    addressLine1: emptyToNull(input.addressLine1),
    city: emptyToNull(input.city),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country) ?? "SI",
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    timezone: input.timezone || "Europe/Ljubljana",
    contactName: emptyToNull(input.contactName),
    contactPhone: emptyToNull(input.contactPhone),
    accessInstructions: emptyToNull(input.accessInstructions),
    workingHours: emptyToNull(input.workingHours),
    securityNotes: emptyToNull(input.securityNotes),
  };
}

export async function listSites(search?: string): Promise<SiteListItem[]> {
  const session = await requireOrgSession("sites:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [eq(schema.site.organizationId, orgId), isNull(schema.site.deletedAt)];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(like(schema.site.name, q), like(schema.site.city, q), like(schema.site.addressLine1, q))!,
    );
  }

  return (await db
    .select({
      site: schema.site,
      customerName: schema.customer.name,
    })
    .from(schema.site)
    .leftJoin(schema.customer, eq(schema.site.customerId, schema.customer.id))
    .where(and(...conditions))
    .orderBy(desc(schema.site.createdAt))) as SiteListItem[];
}

export async function getSite(id: string): Promise<{
  site: Site;
  customerName: string | null;
  buildings: BuildingTree[];
  devices: Device[];
} | null> {
  const session = await requireOrgSession("sites:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [row] = (await db
    .select({
      site: schema.site,
      customerName: schema.customer.name,
    })
    .from(schema.site)
    .leftJoin(schema.customer, eq(schema.site.customerId, schema.customer.id))
    .where(
      and(eq(schema.site.id, id), eq(schema.site.organizationId, orgId), isNull(schema.site.deletedAt)),
    )
    .limit(1)) as Array<{ site: Site; customerName: string | null }>;
  if (!row) return null;

  const buildings = await db
    .select()
    .from(schema.building)
    .where(
      and(
        eq(schema.building.siteId, id),
        eq(schema.building.organizationId, orgId),
        isNull(schema.building.deletedAt),
      ),
    );

  const devices = (await db
    .select()
    .from(schema.device)
    .where(
      and(eq(schema.device.siteId, id), eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)),
    )) as Device[];

  const buildingIds = buildings.map((b: { id: string }) => b.id);
  const floors =
    buildingIds.length === 0
      ? []
      : (
          await db
            .select()
            .from(schema.floor)
            .where(and(eq(schema.floor.organizationId, orgId), isNull(schema.floor.deletedAt)))
        ).filter((f: { buildingId: string }) => buildingIds.includes(f.buildingId));

  const floorIds = floors.map((f: { id: string }) => f.id);
  const rooms =
    floorIds.length === 0
      ? []
      : (
          await db
            .select()
            .from(schema.room)
            .where(and(eq(schema.room.organizationId, orgId), isNull(schema.room.deletedAt)))
        ).filter((r: { floorId: string }) => floorIds.includes(r.floorId));

  const siteBuildings: BuildingTree[] = buildings.map((b: BuildingTree) => ({
    ...b,
    floors: floors
      .filter((f: { buildingId: string }) => f.buildingId === b.id)
      .map((f: BuildingTree["floors"][number]) => ({
        ...f,
        rooms: rooms.filter((r: { floorId: string }) => r.floorId === f.id),
      })),
  }));

  return { ...row, buildings: siteBuildings, devices };
}

export async function createSite(raw: SiteInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("sites:write");
  const parsed = siteInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [customer] = await db
    .select()
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, parsed.data.customerId),
        eq(schema.customer.organizationId, orgId),
        isNull(schema.customer.deletedAt),
      ),
    )
    .limit(1);
  if (!customer) return { ok: false, error: "Stranka ni najdena." };

  const id = randomUUID();
  const now = new Date();
  await db.insert(schema.site).values({
    id,
    organizationId: orgId,
    ...normalizeSite(parsed.data),
    qrToken: createQrToken(),
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "site.create",
    entityType: "site",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/sites");
  revalidatePath("/dashboard");
  return { ok: true, data: { id } };
}

export async function updateSite(id: string, raw: SiteInput): Promise<ActionResult> {
  const session = await requireOrgSession("sites:write");
  const parsed = siteInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [existing] = await db
    .select()
    .from(schema.site)
    .where(and(eq(schema.site.id, id), eq(schema.site.organizationId, orgId), isNull(schema.site.deletedAt)))
    .limit(1);
  if (!existing) return { ok: false, error: "Objekt ni najden." };

  await db
    .update(schema.site)
    .set({ ...normalizeSite(parsed.data), updatedAt: new Date() })
    .where(and(eq(schema.site.id, id), eq(schema.site.organizationId, orgId)));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "site.update",
    entityType: "site",
    entityId: id,
  });
  revalidatePath("/sites");
  revalidatePath(`/sites/${id}`);
  return { ok: true };
}

export async function deleteSite(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("sites:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  await db
    .update(schema.site)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.site.id, id), eq(schema.site.organizationId, orgId)));
  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "site.delete",
    entityType: "site",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/sites");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createBuilding(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("sites:write");
  const parsed = buildingInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [site] = await db
    .select()
    .from(schema.site)
    .where(
      and(
        eq(schema.site.id, parsed.data.siteId),
        eq(schema.site.organizationId, orgId),
        isNull(schema.site.deletedAt),
      ),
    )
    .limit(1);
  if (!site) return { ok: false, error: "Objekt ni najden." };
  const id = randomUUID();
  await db.insert(schema.building).values({
    id,
    organizationId: orgId,
    siteId: parsed.data.siteId,
    name: parsed.data.name.trim(),
    description: emptyToNull(parsed.data.description),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidatePath(`/sites/${parsed.data.siteId}`);
  return { ok: true, data: { id } };
}

export async function createFloor(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("sites:write");
  const parsed = floorInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [building] = await db
    .select()
    .from(schema.building)
    .where(
      and(
        eq(schema.building.id, parsed.data.buildingId),
        eq(schema.building.organizationId, orgId),
        isNull(schema.building.deletedAt),
      ),
    )
    .limit(1);
  if (!building) return { ok: false, error: "Stavba ni najdena." };
  const id = randomUUID();
  await db.insert(schema.floor).values({
    id,
    organizationId: orgId,
    buildingId: parsed.data.buildingId,
    name: parsed.data.name.trim(),
    level: parsed.data.level,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  revalidatePath(`/sites/${building.siteId}`);
  return { ok: true, data: { id } };
}

export async function createRoom(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("sites:write");
  const parsed = roomInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [floor] = await db
    .select()
    .from(schema.floor)
    .where(
      and(eq(schema.floor.id, parsed.data.floorId), eq(schema.floor.organizationId, orgId), isNull(schema.floor.deletedAt)),
    )
    .limit(1);
  if (!floor) return { ok: false, error: "Nadstropje ni najdeno." };
  const [building] = await db
    .select()
    .from(schema.building)
    .where(and(eq(schema.building.id, floor.buildingId), eq(schema.building.organizationId, orgId)))
    .limit(1);
  const id = randomUUID();
  await db.insert(schema.room).values({
    id,
    organizationId: orgId,
    floorId: parsed.data.floorId,
    name: parsed.data.name.trim(),
    description: emptyToNull(parsed.data.description),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  if (building) revalidatePath(`/sites/${building.siteId}`);
  return { ok: true, data: { id } };
}
