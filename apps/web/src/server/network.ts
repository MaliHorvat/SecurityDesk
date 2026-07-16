"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, isNull, like, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  createDefaultPorts,
  emptyToNull,
  networkIpInputSchema,
  networkPortInputSchema,
  networkSwitchInputSchema,
  networkVlanInputSchema,
  parsePortConfigText,
  summarizeSwitchPorts,
  toCsv,
  type NetworkIpInput,
  type NetworkPortInput,
  type NetworkSwitchInput,
  type NetworkVlanInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";
import type {
  networkIpAssignment,
  networkPort,
  networkSwitch,
  networkVlan,
} from "@securitydesk/database";

export type NetworkSwitchRow = typeof networkSwitch.$inferSelect;
export type NetworkPortRow = typeof networkPort.$inferSelect;
export type NetworkVlanRow = typeof networkVlan.$inferSelect;
export type NetworkIpRow = typeof networkIpAssignment.$inferSelect;

export type SwitchListItem = {
  switch: NetworkSwitchRow;
  customerName: string | null;
  siteName: string | null;
  portSummary: ReturnType<typeof summarizeSwitchPorts> | null;
};

export async function listNetworkSwitches(search?: string): Promise<SwitchListItem[]> {
  const session = await requireOrgSession("network:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [
    eq(schema.networkSwitch.organizationId, orgId),
    isNull(schema.networkSwitch.deletedAt),
  ];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        like(schema.networkSwitch.name, q),
        like(schema.networkSwitch.ipAddress, q),
        like(schema.networkSwitch.model, q),
        like(schema.networkSwitch.manufacturer, q),
      )!,
    );
  }

  const rows = (await db
    .select({
      switch: schema.networkSwitch,
      customerName: schema.customer.name,
      siteName: schema.site.name,
    })
    .from(schema.networkSwitch)
    .leftJoin(schema.customer, eq(schema.networkSwitch.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.networkSwitch.siteId, schema.site.id))
    .where(and(...conditions))
    .orderBy(desc(schema.networkSwitch.updatedAt))) as Array<{
    switch: NetworkSwitchRow;
    customerName: string | null;
    siteName: string | null;
  }>;

  const result: SwitchListItem[] = [];
  for (const row of rows) {
    const ports = (await db
      .select()
      .from(schema.networkPort)
      .where(
        and(
          eq(schema.networkPort.switchId, row.switch.id),
          eq(schema.networkPort.organizationId, orgId),
        ),
      )) as NetworkPortRow[];
    result.push({
      ...row,
      portSummary: summarizeSwitchPorts(ports, row.switch.poeBudgetWatts),
    });
  }
  return result;
}

export async function getNetworkSwitch(id: string) {
  const session = await requireOrgSession("network:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [row] = await db
    .select({
      switch: schema.networkSwitch,
      customerName: schema.customer.name,
      siteName: schema.site.name,
    })
    .from(schema.networkSwitch)
    .leftJoin(schema.customer, eq(schema.networkSwitch.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.networkSwitch.siteId, schema.site.id))
    .where(
      and(
        eq(schema.networkSwitch.id, id),
        eq(schema.networkSwitch.organizationId, orgId),
        isNull(schema.networkSwitch.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  const ports = (await db
    .select({
      port: schema.networkPort,
      deviceName: schema.device.name,
    })
    .from(schema.networkPort)
    .leftJoin(schema.device, eq(schema.networkPort.connectedDeviceId, schema.device.id))
    .where(
      and(eq(schema.networkPort.switchId, id), eq(schema.networkPort.organizationId, orgId)),
    )
    .orderBy(asc(schema.networkPort.portNumber))) as Array<{
    port: NetworkPortRow;
    deviceName: string | null;
  }>;

  const sw = row.switch as NetworkSwitchRow;
  return {
    switch: sw,
    customerName: row.customerName as string | null,
    siteName: row.siteName as string | null,
    ports,
    summary: summarizeSwitchPorts(
      ports.map((p) => p.port),
      sw.poeBudgetWatts,
    ),
  };
}

export async function createNetworkSwitch(
  input: NetworkSwitchInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("network:write");
  const parsed = networkSwitchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;
  const id = randomUUID();
  const now = new Date();

  await db.insert(schema.networkSwitch).values({
    id,
    organizationId: orgId,
    customerId: emptyToNull(data.customerId),
    siteId: emptyToNull(data.siteId),
    deviceId: emptyToNull(data.deviceId),
    name: data.name.trim(),
    manufacturer: emptyToNull(data.manufacturer),
    model: emptyToNull(data.model),
    ipAddress: emptyToNull(data.ipAddress),
    macAddress: emptyToNull(data.macAddress),
    serialNumber: emptyToNull(data.serialNumber),
    portCount: data.portCount,
    poeBudgetWatts: data.poeBudgetWatts,
    location: emptyToNull(data.location),
    rack: emptyToNull(data.rack),
    uPosition: emptyToNull(data.uPosition),
    firmware: emptyToNull(data.firmware),
    notes: emptyToNull(data.notes),
    createdAt: now,
    updatedAt: now,
  });

  const defaults = createDefaultPorts(data.portCount);
  await db.insert(schema.networkPort).values(
    defaults.map((p) => ({
      id: randomUUID(),
      organizationId: orgId,
      switchId: id,
      portNumber: p.portNumber,
      name: p.name,
      status: p.status,
      role: p.role,
      poeState: p.poeState,
      poeWatts: p.poeWatts,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "network_switch.create",
    entityType: "network_switch",
    entityId: id,
  });
  revalidatePath("/network");
  return { ok: true, data: { id } };
}

export async function updateNetworkSwitch(
  id: string,
  input: NetworkSwitchInput,
): Promise<ActionResult> {
  const session = await requireOrgSession("network:write");
  const parsed = networkSwitchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [existing] = (await db
    .select()
    .from(schema.networkSwitch)
    .where(
      and(
        eq(schema.networkSwitch.id, id),
        eq(schema.networkSwitch.organizationId, orgId),
        isNull(schema.networkSwitch.deletedAt),
      ),
    )
    .limit(1)) as NetworkSwitchRow[];

  if (!existing) return { ok: false, error: "Stikalo ni bilo najdeno." };

  await db
    .update(schema.networkSwitch)
    .set({
      customerId: emptyToNull(data.customerId),
      siteId: emptyToNull(data.siteId),
      deviceId: emptyToNull(data.deviceId),
      name: data.name.trim(),
      manufacturer: emptyToNull(data.manufacturer),
      model: emptyToNull(data.model),
      ipAddress: emptyToNull(data.ipAddress),
      macAddress: emptyToNull(data.macAddress),
      serialNumber: emptyToNull(data.serialNumber),
      portCount: data.portCount,
      poeBudgetWatts: data.poeBudgetWatts,
      location: emptyToNull(data.location),
      rack: emptyToNull(data.rack),
      uPosition: emptyToNull(data.uPosition),
      firmware: emptyToNull(data.firmware),
      notes: emptyToNull(data.notes),
      updatedAt: new Date(),
    })
    .where(eq(schema.networkSwitch.id, id));

  // Expand ports if portCount increased
  if (data.portCount > existing.portCount) {
    const now = new Date();
    const existingPorts = (await db
      .select()
      .from(schema.networkPort)
      .where(eq(schema.networkPort.switchId, id))) as NetworkPortRow[];
    const maxNum = existingPorts.reduce((m, p) => Math.max(m, p.portNumber), 0);
    const toAdd = [];
    for (let n = maxNum + 1; n <= data.portCount; n++) {
      toAdd.push({
        id: randomUUID(),
        organizationId: orgId,
        switchId: id,
        portNumber: n,
        name: `Gi1/0/${n}`,
        status: "unknown" as const,
        role: "unused" as const,
        poeState: "unknown" as const,
        poeWatts: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (toAdd.length) await db.insert(schema.networkPort).values(toAdd);
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "network_switch.update",
    entityType: "network_switch",
    entityId: id,
  });
  revalidatePath("/network");
  revalidatePath(`/network/${id}`);
  return { ok: true };
}

export async function deleteNetworkSwitch(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("network:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  await db
    .update(schema.networkSwitch)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(schema.networkSwitch.id, id), eq(schema.networkSwitch.organizationId, orgId)),
    );

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "network_switch.delete",
    entityType: "network_switch",
    entityId: id,
  });
  revalidatePath("/network");
  return { ok: true };
}

export async function updateNetworkPort(
  id: string,
  input: Omit<NetworkPortInput, "switchId">,
): Promise<ActionResult> {
  const session = await requireOrgSession("network:write");
  const parsed = networkPortInputSchema.omit({ switchId: true }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [existing] = (await db
    .select()
    .from(schema.networkPort)
    .where(and(eq(schema.networkPort.id, id), eq(schema.networkPort.organizationId, orgId)))
    .limit(1)) as NetworkPortRow[];

  if (!existing) return { ok: false, error: "Port ni bil najden." };

  const now = new Date();
  await db
    .update(schema.networkPort)
    .set({
      portNumber: data.portNumber,
      name: data.name.trim(),
      description: emptyToNull(data.description),
      status: data.status,
      role: data.role,
      speedMbps: data.speedMbps ?? null,
      duplex: emptyToNull(data.duplex),
      poeState: data.poeState,
      poeWatts: data.poeWatts,
      accessVlan: data.accessVlan ?? null,
      taggedVlans: emptyToNull(data.taggedVlans),
      connectedDeviceId: emptyToNull(data.connectedDeviceId),
      connectedDeviceLabel: emptyToNull(data.connectedDeviceLabel),
      lastChangedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.networkPort.id, id));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "network_port.update",
    entityType: "network_port",
    entityId: id,
  });
  revalidatePath(`/network/${existing.switchId}`);
  return { ok: true };
}

export async function previewPortImport(
  switchId: string,
  text: string,
): Promise<ActionResult<{ rows: ReturnType<typeof parsePortConfigText> }>> {
  await requireOrgSession("network:write");
  const rows = parsePortConfigText(text);
  if (!rows.length) {
    return { ok: false, error: "Ni bilo mogoče razčleniti nobene vrstice." };
  }
  return { ok: true, data: { rows } };
}

export async function commitPortImport(
  switchId: string,
  text: string,
): Promise<ActionResult<{ updated: number }>> {
  const session = await requireOrgSession("network:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [sw] = (await db
    .select()
    .from(schema.networkSwitch)
    .where(
      and(
        eq(schema.networkSwitch.id, switchId),
        eq(schema.networkSwitch.organizationId, orgId),
        isNull(schema.networkSwitch.deletedAt),
      ),
    )
    .limit(1)) as NetworkSwitchRow[];
  if (!sw) return { ok: false, error: "Stikalo ni bilo najdeno." };

  const rows = parsePortConfigText(text);
  if (!rows.length) return { ok: false, error: "Ni vrstic za uvoz." };

  const existingPorts = (await db
    .select()
    .from(schema.networkPort)
    .where(eq(schema.networkPort.switchId, switchId))) as NetworkPortRow[];

  const byNumber = new Map(existingPorts.map((p) => [p.portNumber, p]));
  const byName = new Map(existingPorts.map((p) => [p.name.toLowerCase(), p]));
  let updated = 0;
  const now = new Date();

  for (const row of rows) {
    const target =
      (row.portNumber != null ? byNumber.get(row.portNumber) : undefined) ??
      byName.get(row.name.toLowerCase());
    if (!target) continue;

    await db
      .update(schema.networkPort)
      .set({
        name: row.name || target.name,
        description: emptyToNull(row.description) ?? target.description,
        accessVlan: row.accessVlan ?? target.accessVlan,
        poeWatts: row.poeWatts || target.poeWatts,
        poeState: row.poeWatts > 0 ? "on" : target.poeState,
        role: row.role === "unused" ? target.role : row.role,
        status: row.role !== "unused" || row.connectedDeviceLabel ? "up" : target.status,
        connectedDeviceLabel: emptyToNull(row.connectedDeviceLabel) ?? target.connectedDeviceLabel,
        lastChangedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.networkPort.id, target.id));
    updated += 1;
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "network_port.import",
    entityType: "network_switch",
    entityId: switchId,
    metadata: { updated },
  });
  revalidatePath(`/network/${switchId}`);
  return { ok: true, data: { updated } };
}

export async function exportPortsCsv(switchId: string): Promise<ActionResult<{ csv: string }>> {
  const detail = await getNetworkSwitch(switchId);
  if (!detail) return { ok: false, error: "Stikalo ni bilo najdeno." };

  const csv = toCsv(
    ["port", "name", "status", "role", "vlan", "poe_w", "device", "description"],
    detail.ports.map(({ port, deviceName }) => [
      port.portNumber,
      port.name,
      port.status,
      port.role,
      port.accessVlan ?? "",
      port.poeWatts,
      deviceName ?? port.connectedDeviceLabel ?? "",
      port.description ?? "",
    ]),
  );
  return { ok: true, data: { csv } };
}

export async function listNetworkVlans(): Promise<NetworkVlanRow[]> {
  const session = await requireOrgSession("network:read");
  const { db, schema } = getDb();
  return (await db
    .select()
    .from(schema.networkVlan)
    .where(eq(schema.networkVlan.organizationId, session.organization.id))
    .orderBy(asc(schema.networkVlan.vlanId))) as NetworkVlanRow[];
}

export async function createNetworkVlan(
  input: NetworkVlanInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("network:write");
  const parsed = networkVlanInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;
  const id = randomUUID();
  const now = new Date();

  try {
    await db.insert(schema.networkVlan).values({
      id,
      organizationId: orgId,
      siteId: emptyToNull(data.siteId),
      vlanId: data.vlanId,
      name: data.name.trim(),
      description: emptyToNull(data.description),
      subnetCidr: emptyToNull(data.subnetCidr),
      gateway: emptyToNull(data.gateway),
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return { ok: false, error: "VLAN s to številko že obstaja." };
  }

  revalidatePath("/network");
  return { ok: true, data: { id } };
}

export async function deleteNetworkVlan(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("network:write");
  const { db, schema } = getDb();
  await db
    .delete(schema.networkVlan)
    .where(
      and(
        eq(schema.networkVlan.id, id),
        eq(schema.networkVlan.organizationId, session.organization.id),
      ),
    );
  revalidatePath("/network");
  return { ok: true };
}

export async function listNetworkIps(siteId?: string): Promise<
  Array<{ assignment: NetworkIpRow; deviceName: string | null; siteName: string | null }>
> {
  const session = await requireOrgSession("network:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [eq(schema.networkIpAssignment.organizationId, orgId)];
  if (siteId) conditions.push(eq(schema.networkIpAssignment.siteId, siteId));

  return (await db
    .select({
      assignment: schema.networkIpAssignment,
      deviceName: schema.device.name,
      siteName: schema.site.name,
    })
    .from(schema.networkIpAssignment)
    .leftJoin(schema.device, eq(schema.networkIpAssignment.deviceId, schema.device.id))
    .leftJoin(schema.site, eq(schema.networkIpAssignment.siteId, schema.site.id))
    .where(and(...conditions))
    .orderBy(asc(schema.networkIpAssignment.ipAddress))) as Array<{
    assignment: NetworkIpRow;
    deviceName: string | null;
    siteName: string | null;
  }>;
}

export async function createNetworkIp(
  input: NetworkIpInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("network:write");
  const parsed = networkIpInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;
  const id = randomUUID();
  const now = new Date();

  try {
    await db.insert(schema.networkIpAssignment).values({
      id,
      organizationId: orgId,
      siteId: emptyToNull(data.siteId),
      vlanId: data.vlanId ?? null,
      ipAddress: data.ipAddress.trim(),
      hostname: emptyToNull(data.hostname),
      deviceId: emptyToNull(data.deviceId),
      macAddress: emptyToNull(data.macAddress),
      notes: emptyToNull(data.notes),
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    return { ok: false, error: "Ta IP je že zabeležen za isti objekt." };
  }

  revalidatePath("/network");
  return { ok: true, data: { id } };
}

export async function deleteNetworkIp(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("network:write");
  const { db, schema } = getDb();
  await db
    .delete(schema.networkIpAssignment)
    .where(
      and(
        eq(schema.networkIpAssignment.id, id),
        eq(schema.networkIpAssignment.organizationId, session.organization.id),
      ),
    );
  revalidatePath("/network");
  return { ok: true };
}
