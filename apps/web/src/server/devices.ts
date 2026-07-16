"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  createQrToken,
  deviceInputSchema,
  emptyToNull,
  PLANS,
  previewDeviceImport,
  toCsv,
  type DeviceInput,
  type DeviceImportPreview,
} from "@securitydesk/shared";
import { encryptSecret } from "@securitydesk/shared/crypto";
import { requireOrgSession } from "@/lib/org-context";
import {
  ensureDeviceType,
  ensureManufacturer,
  refreshDashboardStats,
  writeAuditLog,
} from "@/server/audit";
import type { ActionResult } from "@/server/customers";
import type { Device, DeviceListItem } from "@/server/types";

function normalizeDevice(input: DeviceInput) {
  return {
    name: input.name.trim(),
    customerId: emptyToNull(input.customerId),
    siteId: emptyToNull(input.siteId),
    buildingId: emptyToNull(input.buildingId),
    floorId: emptyToNull(input.floorId),
    roomId: emptyToNull(input.roomId),
    model: emptyToNull(input.model),
    serialNumber: emptyToNull(input.serialNumber),
    inventoryNumber: emptyToNull(input.inventoryNumber),
    macAddress: emptyToNull(input.macAddress),
    ipAddress: emptyToNull(input.ipAddress),
    subnetMask: emptyToNull(input.subnetMask),
    gateway: emptyToNull(input.gateway),
    dns: emptyToNull(input.dns),
    vlan: input.vlan ?? null,
    switchPort: emptyToNull(input.switchPort),
    username: emptyToNull(input.username),
    firmware: emptyToNull(input.firmware),
    supplier: emptyToNull(input.supplier),
    status: input.status,
    tags: emptyToNull(input.tags),
    notes: emptyToNull(input.notes),
  };
}

async function resolveCustomerSiteByName(
  organizationId: string,
  customerName?: string,
  siteName?: string,
) {
  const { db, schema } = getDb();
  let customerId: string | null = null;
  let siteId: string | null = null;

  if (customerName?.trim()) {
    const [c] = await db
      .select()
      .from(schema.customer)
      .where(
        and(
          eq(schema.customer.organizationId, organizationId),
          eq(schema.customer.name, customerName.trim()),
          isNull(schema.customer.deletedAt),
        ),
      )
      .limit(1);
    customerId = c?.id ?? null;
  }

  if (siteName?.trim()) {
    const conditions = [
      eq(schema.site.organizationId, organizationId),
      eq(schema.site.name, siteName.trim()),
      isNull(schema.site.deletedAt),
    ];
    if (customerId) conditions.push(eq(schema.site.customerId, customerId));
    const [s] = await db
      .select()
      .from(schema.site)
      .where(and(...conditions))
      .limit(1);
    siteId = s?.id ?? null;
    if (s && !customerId) customerId = s.customerId;
  }

  return { customerId, siteId };
}

export async function listDevices(search?: string): Promise<DeviceListItem[]> {
  const session = await requireOrgSession("devices:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        like(schema.device.name, q),
        like(schema.device.ipAddress, q),
        like(schema.device.serialNumber, q),
        like(schema.device.model, q),
      )!,
    );
  }

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
    .where(and(...conditions))
    .orderBy(desc(schema.device.createdAt))) as DeviceListItem[];
}

export async function getDevice(id: string): Promise<DeviceListItem | null> {
  const session = await requireOrgSession("devices:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [row] = (await db
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
    .where(
      and(eq(schema.device.id, id), eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)),
    )
    .limit(1)) as DeviceListItem[];
  return row ?? null;
}

export async function createDevice(raw: DeviceInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("devices:write");
  const parsed = deviceInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const plan = PLANS[session.organization.planId];
  if (plan.limits.maxDevices !== null) {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.device)
      .where(and(eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)));
    if (Number(countRow?.count ?? 0) >= plan.limits.maxDevices) {
      return { ok: false, error: `Dosegli ste omejitev paketa (${plan.limits.maxDevices} naprav).` };
    }
  }

  const manufacturerId = await ensureManufacturer(orgId, parsed.data.manufacturerName);
  const deviceTypeId = await ensureDeviceType(orgId, parsed.data.deviceTypeName);
  const id = randomUUID();
  const now = new Date();

  await db.insert(schema.device).values({
    id,
    organizationId: orgId,
    ...normalizeDevice(parsed.data),
    manufacturerId,
    deviceTypeId,
    qrToken: createQrToken(),
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  if (parsed.data.password?.trim()) {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) return { ok: false, error: "Manjka ENCRYPTION_KEY." };
    await db.insert(schema.deviceCredential).values({
      id: randomUUID(),
      organizationId: orgId,
      deviceId: id,
      label: "default",
      encryptedSecret: encryptSecret(parsed.data.password, key),
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "device.create",
    entityType: "device",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/devices");
  revalidatePath("/dashboard");
  return { ok: true, data: { id } };
}

export async function updateDevice(id: string, raw: DeviceInput): Promise<ActionResult> {
  const session = await requireOrgSession("devices:write");
  const parsed = deviceInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [existing] = (await db
    .select()
    .from(schema.device)
    .where(
      and(eq(schema.device.id, id), eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)),
    )
    .limit(1)) as Device[];
  if (!existing) return { ok: false, error: "Naprava ni najdena." };

  const manufacturerId = await ensureManufacturer(orgId, parsed.data.manufacturerName);
  const deviceTypeId = await ensureDeviceType(orgId, parsed.data.deviceTypeName);

  await db
    .update(schema.device)
    .set({
      ...normalizeDevice(parsed.data),
      manufacturerId,
      deviceTypeId,
      updatedAt: new Date(),
      version: (existing.version ?? 1) + 1,
    })
    .where(and(eq(schema.device.id, id), eq(schema.device.organizationId, orgId)));

  if (parsed.data.password?.trim()) {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) return { ok: false, error: "Manjka ENCRYPTION_KEY." };
    await db.insert(schema.deviceCredential).values({
      id: randomUUID(),
      organizationId: orgId,
      deviceId: id,
      label: "default",
      encryptedSecret: encryptSecret(parsed.data.password, key),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "device.credential.update",
      entityType: "device",
      entityId: id,
    });
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "device.update",
    entityType: "device",
    entityId: id,
  });
  revalidatePath("/devices");
  revalidatePath(`/devices/${id}`);
  return { ok: true };
}

export async function deleteDevice(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("devices:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  await db
    .update(schema.device)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.device.id, id), eq(schema.device.organizationId, orgId)));
  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "device.delete",
    entityType: "device",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/devices");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function previewDevicesImport(content: string): Promise<ActionResult<DeviceImportPreview[]>> {
  await requireOrgSession("devices:write");
  try {
    return { ok: true, data: previewDeviceImport(content) };
  } catch {
    return { ok: false, error: "Datoteke ni bilo mogoče razčleniti." };
  }
}

export async function commitDevicesImport(
  rows: DeviceImportPreview[],
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const session = await requireOrgSession("devices:write");
  const valid = rows.filter((r) => r.errors.length === 0);
  let imported = 0;
  let skipped = rows.length - valid.length;

  for (const row of valid) {
    const { customerId, siteId } = await resolveCustomerSiteByName(
      session.organization.id,
      row.data.customer,
      row.data.site,
    );
    if (row.data.customer && !customerId) {
      skipped++;
      continue;
    }
    if (row.data.site && !siteId) {
      skipped++;
      continue;
    }

    const result = await createDevice({
      name: row.data.name,
      customerId: customerId ?? "",
      siteId: siteId ?? "",
      deviceTypeName: row.data.type ?? "",
      manufacturerName: row.data.manufacturer ?? "",
      model: row.data.model ?? "",
      serialNumber: row.data.serial_number ?? "",
      inventoryNumber: row.data.inventory_number ?? "",
      macAddress: row.data.mac_address ?? "",
      ipAddress: row.data.ip_address ?? "",
      subnetMask: row.data.subnet_mask ?? "",
      gateway: row.data.gateway ?? "",
      dns: row.data.dns ?? "",
      vlan: row.data.vlan ? Number(row.data.vlan) : null,
      switchPort: row.data.switch_port ?? "",
      firmware: row.data.firmware ?? "",
      status: (row.data.status as DeviceInput["status"]) || "active",
      tags: row.data.tags ?? "",
      username: "",
      password: "",
      supplier: "",
      notes: "",
    });
    if (result.ok) imported++;
    else skipped++;
  }

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "device.import",
    entityType: "device",
    metadata: { imported, skipped },
  });

  return { ok: true, data: { imported, skipped } };
}

export async function exportDevicesCsv(): Promise<ActionResult<{ csv: string }>> {
  const session = await requireOrgSession("devices:export");
  const devices = await listDevices();
  const csv = toCsv(
    [
      "name",
      "customer",
      "site",
      "type",
      "manufacturer",
      "model",
      "serial_number",
      "ip_address",
      "mac_address",
      "status",
      "tags",
    ],
    devices.map((d: DeviceListItem) => [
      d.device.name,
      d.customerName,
      d.siteName,
      d.deviceTypeName,
      d.manufacturerName,
      d.device.model,
      d.device.serialNumber,
      d.device.ipAddress,
      d.device.macAddress,
      d.device.status,
      d.device.tags,
    ]),
  );

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "device.export",
    entityType: "device",
  });

  return { ok: true, data: { csv } };
}
