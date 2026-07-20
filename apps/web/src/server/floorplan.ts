"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  DEFAULT_FLOOR_PLAN_LAYERS,
  emptyToNull,
  floorPlanCreateInputSchema,
  floorPlanSaveCanvasInputSchema,
  floorPlanUpdateInputSchema,
  normalizeElementCoords,
  type FloorPlanCreateInput,
  type FloorPlanSaveCanvasInput,
  type FloorPlanStatus,
  type FloorPlanUpdateInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { isAllowedFloorplanImage, isPdf, putObject } from "@/lib/storage";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

export type FloorPlanListItem = {
  id: string;
  name: string;
  status: FloorPlanStatus;
  siteId: string;
  siteName: string | null;
  customerName: string | null;
  version: number;
  updatedAt: Date;
  hasImage: boolean;
};

async function assertSiteInOrg(organizationId: string, siteId: string, customerId: string) {
  const { db, schema } = getDb();
  const [site] = await db
    .select({ id: schema.site.id, customerId: schema.site.customerId })
    .from(schema.site)
    .where(
      and(
        eq(schema.site.id, siteId),
        eq(schema.site.organizationId, organizationId),
        isNull(schema.site.deletedAt),
      ),
    )
    .limit(1);
  if (!site || site.customerId !== customerId) {
    throw new Error("Objekt ne pripada izbrani stranki / organizaciji.");
  }
}

async function assertDeviceInOrg(organizationId: string, deviceId: string) {
  const { db, schema } = getDb();
  const [device] = await db
    .select({ id: schema.device.id })
    .from(schema.device)
    .where(
      and(
        eq(schema.device.id, deviceId),
        eq(schema.device.organizationId, organizationId),
        isNull(schema.device.deletedAt),
      ),
    )
    .limit(1);
  if (!device) throw new Error("Naprava ne pripada organizaciji.");
}

export async function listFloorPlans(q?: string): Promise<FloorPlanListItem[]> {
  const session = await requireOrgSession("floorplan:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = (await db
    .select({
      id: schema.floorPlan.id,
      name: schema.floorPlan.name,
      status: schema.floorPlan.status,
      siteId: schema.floorPlan.siteId,
      siteName: schema.site.name,
      customerName: schema.customer.name,
      version: schema.floorPlan.version,
      updatedAt: schema.floorPlan.updatedAt,
      imageStorageKey: schema.floorPlan.imageStorageKey,
    })
    .from(schema.floorPlan)
    .leftJoin(schema.site, eq(schema.site.id, schema.floorPlan.siteId))
    .leftJoin(schema.customer, eq(schema.customer.id, schema.floorPlan.customerId))
    .where(
      and(
        eq(schema.floorPlan.organizationId, orgId),
        isNull(schema.floorPlan.deletedAt),
        q
          ? or(
              like(schema.floorPlan.name, `%${q}%`),
              like(schema.site.name, `%${q}%`),
              like(schema.customer.name, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(schema.floorPlan.updatedAt))) as Array<{
    id: string;
    name: string;
    status: FloorPlanStatus;
    siteId: string;
    siteName: string | null;
    customerName: string | null;
    version: number;
    updatedAt: Date;
    imageStorageKey: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    siteId: r.siteId,
    siteName: r.siteName,
    customerName: r.customerName,
    version: r.version,
    updatedAt: r.updatedAt,
    hasImage: Boolean(r.imageStorageKey),
  }));
}

export async function listFloorPlansForSite(siteId: string): Promise<FloorPlanListItem[]> {
  const session = await requireOrgSession("floorplan:read");
  const { db, schema } = getDb();
  const rows = (await db
    .select({
      id: schema.floorPlan.id,
      name: schema.floorPlan.name,
      status: schema.floorPlan.status,
      siteId: schema.floorPlan.siteId,
      siteName: schema.site.name,
      customerName: schema.customer.name,
      version: schema.floorPlan.version,
      updatedAt: schema.floorPlan.updatedAt,
      imageStorageKey: schema.floorPlan.imageStorageKey,
    })
    .from(schema.floorPlan)
    .leftJoin(schema.site, eq(schema.site.id, schema.floorPlan.siteId))
    .leftJoin(schema.customer, eq(schema.customer.id, schema.floorPlan.customerId))
    .where(
      and(
        eq(schema.floorPlan.organizationId, session.organization.id),
        eq(schema.floorPlan.siteId, siteId),
        isNull(schema.floorPlan.deletedAt),
      ),
    )
    .orderBy(desc(schema.floorPlan.updatedAt))) as Array<{
    id: string;
    name: string;
    status: FloorPlanStatus;
    siteId: string;
    siteName: string | null;
    customerName: string | null;
    version: number;
    updatedAt: Date;
    imageStorageKey: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    siteId: r.siteId,
    siteName: r.siteName,
    customerName: r.customerName,
    version: r.version,
    updatedAt: r.updatedAt,
    hasImage: Boolean(r.imageStorageKey),
  }));
}

export async function getFloorPlanDetail(id: string) {
  const session = await requireOrgSession("floorplan:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [plan] = await db
    .select()
    .from(schema.floorPlan)
    .where(
      and(eq(schema.floorPlan.id, id), eq(schema.floorPlan.organizationId, orgId), isNull(schema.floorPlan.deletedAt)),
    )
    .limit(1);
  if (!plan) return null;

  const [layers, elements, connections, zones, versions] = await Promise.all([
    db
      .select()
      .from(schema.floorPlanLayer)
      .where(and(eq(schema.floorPlanLayer.floorPlanId, id), eq(schema.floorPlanLayer.organizationId, orgId))),
    db
      .select()
      .from(schema.floorPlanElement)
      .where(
        and(
          eq(schema.floorPlanElement.floorPlanId, id),
          eq(schema.floorPlanElement.organizationId, orgId),
          isNull(schema.floorPlanElement.deletedAt),
        ),
      ),
    db
      .select()
      .from(schema.floorPlanConnection)
      .where(
        and(eq(schema.floorPlanConnection.floorPlanId, id), eq(schema.floorPlanConnection.organizationId, orgId)),
      ),
    db
      .select()
      .from(schema.floorPlanZone)
      .where(and(eq(schema.floorPlanZone.floorPlanId, id), eq(schema.floorPlanZone.organizationId, orgId))),
    db
      .select()
      .from(schema.floorPlanVersion)
      .where(and(eq(schema.floorPlanVersion.floorPlanId, id), eq(schema.floorPlanVersion.organizationId, orgId)))
      .orderBy(desc(schema.floorPlanVersion.version))
      .limit(20),
  ]);

  const deviceIds = (elements as Array<{ deviceId: string | null }>)
    .map((e) => e.deviceId)
    .filter(Boolean) as string[];
  const devices =
    deviceIds.length > 0
      ? ((await db
          .select()
          .from(schema.device)
          .where(and(eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)))) as Array<{
          id: string;
          name: string;
          ipAddress: string | null;
          serialNumber: string | null;
          status: string;
        }>)
      : [];
  const deviceMap = new Map(devices.filter((d) => deviceIds.includes(d.id)).map((d) => [d.id, d]));

  const monitoringRows =
    deviceIds.length > 0
      ? ((await db
          .select({
            deviceId: schema.monitoringCheckResult.deviceId,
            status: schema.monitoringCheckResult.status,
            checkedAt: schema.monitoringCheckResult.checkedAt,
          })
          .from(schema.monitoringCheckResult)
          .where(eq(schema.monitoringCheckResult.organizationId, orgId))
          .orderBy(desc(schema.monitoringCheckResult.checkedAt))
          .limit(500)) as Array<{ deviceId: string; status: string; checkedAt: Date }>)
      : [];
  const monitoringByDevice = new Map<string, string>();
  for (const row of monitoringRows) {
    if (!monitoringByDevice.has(row.deviceId)) monitoringByDevice.set(row.deviceId, row.status);
  }

  const openTickets =
    deviceIds.length > 0
      ? ((await db
          .select({
            id: schema.serviceTicket.id,
            deviceId: schema.serviceTicket.deviceId,
            title: schema.serviceTicket.title,
            status: schema.serviceTicket.status,
          })
          .from(schema.serviceTicket)
          .where(
            and(eq(schema.serviceTicket.organizationId, orgId), isNull(schema.serviceTicket.deletedAt)),
          )) as Array<{ id: string; deviceId: string | null; title: string; status: string }>)
      : [];

  type ElRow = {
    id: string;
    layerId: string;
    elementType: string;
    deviceId: string | null;
    label: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zIndex: number;
    isLocked: boolean;
    metadata: string | null;
    statusOverride: string | null;
  };
  type ConnRow = {
    id: string;
    sourceElementId: string;
    targetElementId: string;
    connectionType: string;
    label: string | null;
    metadata: string | null;
  };
  type ZoneRow = {
    id: string;
    name: string;
    zoneType: string;
    points: string;
    opacity: number;
    metadata: string | null;
    label: string | null;
    description: string | null;
  };

  return {
    plan,
    layers,
    elements: (elements as ElRow[]).map((el) => {
      const device = el.deviceId ? deviceMap.get(el.deviceId) ?? null : null;
      const monitorStatus = el.deviceId ? monitoringByDevice.get(el.deviceId) : undefined;
      return {
        ...el,
        metadata: el.metadata ? safeJson(el.metadata) : null,
        device: device
          ? {
              ...device,
              status: monitorStatus || device.status,
            }
          : null,
        openTickets: openTickets.filter(
          (t) =>
            t.deviceId === el.deviceId &&
            ["open", "in_progress", "waiting_customer"].includes(t.status),
        ),
      };
    }),
    connections: (connections as ConnRow[]).map((c) => ({
      ...c,
      metadata: c.metadata ? safeJson(c.metadata) : null,
    })),
    zones: (zones as ZoneRow[]).map((z) => ({
      ...z,
      points: safeJson(z.points) as Array<{ x: number; y: number }>,
      metadata: z.metadata ? safeJson(z.metadata) : null,
    })),
    versions,
    imageUrl: plan.imageStorageKey
      ? `/api/storage?key=${encodeURIComponent(plan.imageStorageKey)}`
      : null,
  };
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function createFloorPlanAction(
  raw: FloorPlanCreateInput,
  formData?: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("floorplan:write");
    const parsed = floorPlanCreateInputSchema.parse(raw);
    await assertSiteInOrg(session.organization.id, parsed.siteId, parsed.customerId);

    const { db, schema } = getDb();
    const id = randomUUID();
    const now = new Date();

    let imageStorageKey: string | null = null;
    let imageMimeType: string | null = null;
    let pdfStorageKey: string | null = null;
    let originalWidth: number | null = null;
    let originalHeight: number | null = null;

    if (formData) {
      const file = formData.get("file");
      if (file instanceof File && file.size > 0) {
        const buf = Buffer.from(await file.arrayBuffer());
        const mime = file.type || "application/octet-stream";
        if (isPdf(mime)) {
          const stored = await putObject({
            organizationId: session.organization.id,
            folder: "floorplans/pdf",
            fileName: file.name,
            contentType: mime,
            body: buf,
          });
          pdfStorageKey = stored.key;
        } else if (isAllowedFloorplanImage(mime)) {
          const stored = await putObject({
            organizationId: session.organization.id,
            folder: "floorplans/images",
            fileName: file.name,
            contentType: mime,
            body: buf,
          });
          imageStorageKey = stored.key;
          imageMimeType = mime;
          originalWidth = Number(formData.get("originalWidth") || 0) || null;
          originalHeight = Number(formData.get("originalHeight") || 0) || null;
        } else {
          return { ok: false, error: "Dovoljene so slike PNG/JPG/WEBP ali PDF priloga." };
        }
      }
    }

    await db.insert(schema.floorPlan).values({
      id,
      organizationId: session.organization.id,
      customerId: parsed.customerId,
      siteId: parsed.siteId,
      buildingId: emptyToNull(parsed.buildingId),
      floorId: emptyToNull(parsed.floorId),
      roomId: emptyToNull(parsed.roomId),
      name: parsed.name.trim(),
      description: emptyToNull(parsed.description),
      imageStorageKey,
      imageMimeType,
      pdfStorageKey,
      originalWidth,
      originalHeight,
      scaleEnabled: false,
      status: parsed.status,
      version: 1,
      createdById: session.user.id,
      createdAt: now,
      updatedAt: now,
    });

    for (const layer of DEFAULT_FLOOR_PLAN_LAYERS) {
      await db.insert(schema.floorPlanLayer).values({
        id: randomUUID(),
        organizationId: session.organization.id,
        floorPlanId: id,
        name: layer.name,
        type: layer.type,
        isVisible: true,
        isLocked: false,
        sortOrder: layer.sortOrder,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.insert(schema.floorPlanVersion).values({
      id: randomUUID(),
      organizationId: session.organization.id,
      floorPlanId: id,
      version: 1,
      description: "Ustvarjen tloris",
      snapshotJson: null,
      createdById: session.user.id,
      createdAt: now,
    });

    await writeAuditLog({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: "floorplan.create",
      entityType: "floor_plan",
      entityId: id,
      metadata: { name: parsed.name },
    });

    revalidatePath("/floorplans");
    revalidatePath(`/sites/${parsed.siteId}`);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Napaka pri ustvarjanju tlorisa." };
  }
}

export async function updateFloorPlanMetaAction(raw: FloorPlanUpdateInput): Promise<ActionResult> {
  try {
    const session = await requireOrgSession("floorplan:write");
    const parsed = floorPlanUpdateInputSchema.parse(raw);
    const { db, schema } = getDb();
    const [existing] = await db
      .select()
      .from(schema.floorPlan)
      .where(
        and(
          eq(schema.floorPlan.id, parsed.id),
          eq(schema.floorPlan.organizationId, session.organization.id),
          isNull(schema.floorPlan.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return { ok: false, error: "Tloris ni najden." };
    if (existing.version !== parsed.expectedVersion) {
      return { ok: false, error: "Tloris je bil spremenjen drugje. Ponovno naložite stran." };
    }

    const nextVersion = existing.version + 1;
    await db
      .update(schema.floorPlan)
      .set({
        name: parsed.name?.trim() ?? existing.name,
        description: parsed.description === undefined ? existing.description : parsed.description,
        status: parsed.status ?? existing.status,
        scaleEnabled: parsed.scaleEnabled ?? existing.scaleEnabled,
        scaleValue: parsed.scaleValue === undefined ? existing.scaleValue : parsed.scaleValue,
        scaleUnit: parsed.scaleUnit === undefined ? existing.scaleUnit : parsed.scaleUnit,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(eq(schema.floorPlan.id, existing.id));

    await db.insert(schema.floorPlanVersion).values({
      id: randomUUID(),
      organizationId: session.organization.id,
      floorPlanId: existing.id,
      version: nextVersion,
      description: emptyToNull(parsed.changeDescription) || "Posodobitev metapodatkov",
      createdById: session.user.id,
      createdAt: new Date(),
    });

    revalidatePath(`/floorplans/${existing.id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Napaka pri shranjevanju." };
  }
}

export async function saveFloorPlanCanvasAction(raw: FloorPlanSaveCanvasInput): Promise<ActionResult<{ version: number }>> {
  try {
    const session = await requireOrgSession("floorplan:write");
    const parsed = floorPlanSaveCanvasInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;

    const [existing] = await db
      .select()
      .from(schema.floorPlan)
      .where(
        and(
          eq(schema.floorPlan.id, parsed.floorPlanId),
          eq(schema.floorPlan.organizationId, orgId),
          isNull(schema.floorPlan.deletedAt),
        ),
      )
      .limit(1);
    if (!existing) return { ok: false, error: "Tloris ni najden." };
    if (existing.version !== parsed.expectedVersion) {
      return { ok: false, error: "Konflikt verzije. Osvežite tloris pred shranjevanjem." };
    }

    for (const el of parsed.elements) {
      if (el.deviceId) await assertDeviceInOrg(orgId, el.deviceId);
    }

    const now = new Date();
    const nextVersion = existing.version + 1;

    // Soft-delete removed elements
    const keepIds = new Set(
      parsed.elements.filter((e: { id?: string }) => e.id).map((e: { id?: string }) => e.id!),
    );
    const currentElements = await db
      .select({ id: schema.floorPlanElement.id })
      .from(schema.floorPlanElement)
      .where(
        and(
          eq(schema.floorPlanElement.floorPlanId, parsed.floorPlanId),
          eq(schema.floorPlanElement.organizationId, orgId),
          isNull(schema.floorPlanElement.deletedAt),
        ),
      );
    for (const cur of currentElements) {
      if (!keepIds.has(cur.id)) {
        await db
          .update(schema.floorPlanElement)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(schema.floorPlanElement.id, cur.id));
      }
    }

    for (const el of parsed.elements) {
      const coords = normalizeElementCoords(el);
      const values = {
        organizationId: orgId,
        floorPlanId: parsed.floorPlanId,
        layerId: el.layerId,
        elementType: el.elementType,
        deviceId: emptyToNull(el.deviceId ?? undefined),
        switchId: emptyToNull(el.switchId ?? undefined),
        switchPortId: emptyToNull(el.switchPortId ?? undefined),
        roomId: emptyToNull(el.roomId ?? undefined),
        label: emptyToNull(el.label),
        description: emptyToNull(el.description),
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
        rotation: coords.rotation,
        zIndex: el.zIndex ?? 0,
        icon: emptyToNull(el.icon),
        shape: emptyToNull(el.shape),
        statusOverride: el.statusOverride ?? null,
        metadata: el.metadata ? JSON.stringify(el.metadata) : null,
        isLocked: el.isLocked ?? false,
        updatedAt: now,
        deletedAt: null as Date | null,
      };

      if (el.id) {
        await db.update(schema.floorPlanElement).set(values).where(eq(schema.floorPlanElement.id, el.id));
      } else {
        await db.insert(schema.floorPlanElement).values({
          id: randomUUID(),
          ...values,
          createdById: session.user.id,
          createdAt: now,
        });
      }
    }

    // Replace connections
    await db
      .delete(schema.floorPlanConnection)
      .where(
        and(
          eq(schema.floorPlanConnection.floorPlanId, parsed.floorPlanId),
          eq(schema.floorPlanConnection.organizationId, orgId),
        ),
      );
    for (const c of parsed.connections) {
      await db.insert(schema.floorPlanConnection).values({
        id: c.id || randomUUID(),
        organizationId: orgId,
        floorPlanId: parsed.floorPlanId,
        sourceElementId: c.sourceElementId,
        targetElementId: c.targetElementId,
        connectionType: c.connectionType,
        label: emptyToNull(c.label),
        pathData: emptyToNull(c.pathData),
        metadata: c.metadata ? JSON.stringify(c.metadata) : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Replace zones
    await db
      .delete(schema.floorPlanZone)
      .where(
        and(eq(schema.floorPlanZone.floorPlanId, parsed.floorPlanId), eq(schema.floorPlanZone.organizationId, orgId)),
      );
    for (const z of parsed.zones) {
      await db.insert(schema.floorPlanZone).values({
        id: z.id || randomUUID(),
        organizationId: orgId,
        floorPlanId: parsed.floorPlanId,
        name: z.name,
        zoneType: z.zoneType,
        points: JSON.stringify(z.points),
        label: emptyToNull(z.label),
        description: emptyToNull(z.description),
        opacity: z.opacity,
        metadata: z.metadata ? JSON.stringify(z.metadata) : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (parsed.layers) {
      for (const layer of parsed.layers) {
        await db
          .update(schema.floorPlanLayer)
          .set({
            isVisible: layer.isVisible,
            isLocked: layer.isLocked,
            sortOrder: layer.sortOrder,
            updatedAt: now,
          })
          .where(
            and(eq(schema.floorPlanLayer.id, layer.id), eq(schema.floorPlanLayer.organizationId, orgId)),
          );
      }
    }

    await db
      .update(schema.floorPlan)
      .set({ version: nextVersion, updatedAt: now })
      .where(eq(schema.floorPlan.id, parsed.floorPlanId));

    await db.insert(schema.floorPlanVersion).values({
      id: randomUUID(),
      organizationId: orgId,
      floorPlanId: parsed.floorPlanId,
      version: nextVersion,
      description: emptyToNull(parsed.changeDescription) || "Shranjen tloris",
      snapshotJson: JSON.stringify({
        elements: parsed.elements.length,
        connections: parsed.connections.length,
        zones: parsed.zones.length,
      }),
      createdById: session.user.id,
      createdAt: now,
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "floorplan.save",
      entityType: "floor_plan",
      entityId: parsed.floorPlanId,
      metadata: { version: nextVersion },
    });

    revalidatePath(`/floorplans/${parsed.floorPlanId}`);
    revalidatePath(`/floorplans/${parsed.floorPlanId}/edit`);
    return { ok: true, data: { version: nextVersion } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Napaka pri shranjevanju tlorisa." };
  }
}

export async function deleteFloorPlanAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireOrgSession("floorplan:delete");
    const { db, schema } = getDb();
    await db
      .update(schema.floorPlan)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.floorPlan.id, id), eq(schema.floorPlan.organizationId, session.organization.id)));
    await writeAuditLog({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: "floorplan.delete",
      entityType: "floor_plan",
      entityId: id,
    });
    revalidatePath("/floorplans");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Brisanje ni uspelo." };
  }
}

export async function listFloorPlanLinksForDevice(deviceId: string) {
  const session = await requireOrgSession("floorplan:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = (await db
    .select({
      elementId: schema.floorPlanElement.id,
      floorPlanId: schema.floorPlan.id,
      floorPlanName: schema.floorPlan.name,
      x: schema.floorPlanElement.x,
      y: schema.floorPlanElement.y,
      elementType: schema.floorPlanElement.elementType,
    })
    .from(schema.floorPlanElement)
    .innerJoin(schema.floorPlan, eq(schema.floorPlan.id, schema.floorPlanElement.floorPlanId))
    .where(
      and(
        eq(schema.floorPlanElement.organizationId, orgId),
        eq(schema.floorPlanElement.deviceId, deviceId),
        isNull(schema.floorPlanElement.deletedAt),
        isNull(schema.floorPlan.deletedAt),
      ),
    )
    .limit(20)) as Array<{
    elementId: string;
    floorPlanId: string;
    floorPlanName: string;
    x: number;
    y: number;
    elementType: string;
  }>;

  return rows;
}

export async function createTicketFromFloorPlanElementAction(input: {
  floorPlanId: string;
  elementId: string;
  title?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("service:write");
    const { db, schema } = getDb();
    const orgId = session.organization.id;

    const [plan] = await db
      .select({
        id: schema.floorPlan.id,
        name: schema.floorPlan.name,
        customerId: schema.floorPlan.customerId,
        siteId: schema.floorPlan.siteId,
      })
      .from(schema.floorPlan)
      .where(
        and(
          eq(schema.floorPlan.id, input.floorPlanId),
          eq(schema.floorPlan.organizationId, orgId),
          isNull(schema.floorPlan.deletedAt),
        ),
      )
      .limit(1);
    if (!plan) return { ok: false, error: "Tloris ni najden." };

    const [element] = await db
      .select({
        id: schema.floorPlanElement.id,
        label: schema.floorPlanElement.label,
        deviceId: schema.floorPlanElement.deviceId,
        elementType: schema.floorPlanElement.elementType,
      })
      .from(schema.floorPlanElement)
      .where(
        and(
          eq(schema.floorPlanElement.id, input.elementId),
          eq(schema.floorPlanElement.floorPlanId, input.floorPlanId),
          eq(schema.floorPlanElement.organizationId, orgId),
          isNull(schema.floorPlanElement.deletedAt),
        ),
      )
      .limit(1);
    if (!element) return { ok: false, error: "Element ni najden." };

    const title =
      input.title?.trim() ||
      `Servis: ${element.label || element.elementType} (${plan.name})`;
    const id = randomUUID();
    const now = new Date();
    await db.insert(schema.serviceTicket).values({
      id,
      organizationId: orgId,
      customerId: plan.customerId,
      siteId: plan.siteId,
      deviceId: element.deviceId,
      createdByUserId: session.user.id,
      title,
      description: `Ustvarjeno s tlorisa ${plan.name} (element ${element.id}).`,
      category: "general",
      priority: "normal",
      status: "open",
      attachmentNotes: `floorPlanId=${plan.id};elementId=${element.id}`,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "service_ticket.create",
      entityType: "service_ticket",
      entityId: id,
      metadata: { fromFloorPlan: plan.id, elementId: element.id },
    });
    revalidatePath("/service");
    revalidatePath(`/floorplans/${plan.id}`);
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Ustvarjanje zahtevka ni uspelo.",
    };
  }
}

export async function uploadFloorPlanImageAction(floorPlanId: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireOrgSession("floorplan:write");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Izberite sliko." };
    }
    const mime = file.type || "application/octet-stream";
    if (!isAllowedFloorplanImage(mime)) {
      return { ok: false, error: "Dovoljene so samo PNG/JPG/WEBP slike." };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const stored = await putObject({
      organizationId: session.organization.id,
      folder: "floorplans/images",
      fileName: file.name,
      contentType: mime,
      body: buf,
    });
    const { db, schema } = getDb();
    await db
      .update(schema.floorPlan)
      .set({
        imageStorageKey: stored.key,
        imageMimeType: mime,
        originalWidth: Number(formData.get("originalWidth") || 0) || null,
        originalHeight: Number(formData.get("originalHeight") || 0) || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.floorPlan.id, floorPlanId),
          eq(schema.floorPlan.organizationId, session.organization.id),
        ),
      );
    revalidatePath(`/floorplans/${floorPlanId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Nalaganje ni uspelo." };
  }
}
