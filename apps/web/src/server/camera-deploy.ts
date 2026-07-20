"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, isNull, like, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  allocateIpAddresses,
  cameraDeploySessionInputSchema,
  cameraDeployTargetInputSchema,
  emptyToNull,
  type CameraDeploySessionInput,
  type CameraDeploySessionStatus,
  type CameraDeployTargetInput,
  type CameraDeployTargetStatus,
} from "@securitydesk/shared";
import { decryptSecret, encryptSecret } from "@securitydesk/shared/crypto";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

export type CameraDeploySessionRow = {
  id: string;
  title: string;
  status: CameraDeploySessionStatus;
  siteId: string;
  siteName: string | null;
  customerName: string | null;
  targetCount: number;
  deployedCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CameraDeployTargetRow = {
  id: string;
  sessionId: string;
  deviceId: string | null;
  deviceName: string | null;
  name: string;
  locationLabel: string | null;
  manufacturer: string | null;
  model: string | null;
  macAddress: string | null;
  serialNumber: string | null;
  currentIp: string | null;
  targetIp: string | null;
  username: string | null;
  channelNumber: number | null;
  status: CameraDeployTargetStatus;
  sortOrder: number;
  errorMessage: string | null;
  deployedAt: Date | null;
};

export type CameraDeploySessionDetail = {
  session: {
    id: string;
    title: string;
    description: string | null;
    status: CameraDeploySessionStatus;
    customerId: string | null;
    siteId: string;
    siteName: string | null;
    customerName: string | null;
    ipRangeStart: string | null;
    ipRangeEnd: string | null;
    subnetMask: string | null;
    gateway: string | null;
    dnsServers: string | null;
    defaultUsername: string | null;
    vlanId: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  targets: CameraDeployTargetRow[];
};

function getEncryptionKey(): string | null {
  return process.env.ENCRYPTION_KEY ?? null;
}

function normalizeSession(input: CameraDeploySessionInput, encryptedDefaultPassword: string | null) {
  return {
    customerId: emptyToNull(input.customerId),
    siteId: input.siteId,
    title: input.title.trim(),
    description: emptyToNull(input.description),
    status: input.status,
    ipRangeStart: emptyToNull(input.ipRangeStart),
    ipRangeEnd: emptyToNull(input.ipRangeEnd),
    subnetMask: emptyToNull(input.subnetMask),
    gateway: emptyToNull(input.gateway),
    dnsServers: emptyToNull(input.dnsServers),
    defaultUsername: emptyToNull(input.defaultUsername),
    encryptedDefaultPassword,
    vlanId: input.vlanId ?? null,
  };
}

function normalizeTarget(input: CameraDeployTargetInput, encryptedPassword: string | null) {
  return {
    name: input.name.trim(),
    locationLabel: emptyToNull(input.locationLabel),
    manufacturer: emptyToNull(input.manufacturer),
    model: emptyToNull(input.model),
    macAddress: emptyToNull(input.macAddress),
    serialNumber: emptyToNull(input.serialNumber),
    currentIp: emptyToNull(input.currentIp),
    targetIp: emptyToNull(input.targetIp),
    username: emptyToNull(input.username),
    encryptedPassword,
    channelNumber: input.channelNumber ?? null,
    deviceId: emptyToNull(input.deviceId),
  };
}

export async function listCameraDeploySessions(search?: string): Promise<CameraDeploySessionRow[]> {
  const session = await requireOrgSession("camera_deploy:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const conditions = [
    eq(schema.cameraDeploySession.organizationId, orgId),
    isNull(schema.cameraDeploySession.deletedAt),
  ];

  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        like(schema.cameraDeploySession.title, q),
        like(schema.site.name, q),
      )!,
    );
  }

  const rows = await db
    .select({
      id: schema.cameraDeploySession.id,
      title: schema.cameraDeploySession.title,
      status: schema.cameraDeploySession.status,
      siteId: schema.cameraDeploySession.siteId,
      siteName: schema.site.name,
      customerName: schema.customer.name,
      createdAt: schema.cameraDeploySession.createdAt,
      updatedAt: schema.cameraDeploySession.updatedAt,
    })
    .from(schema.cameraDeploySession)
    .leftJoin(schema.site, eq(schema.cameraDeploySession.siteId, schema.site.id))
    .leftJoin(schema.customer, eq(schema.cameraDeploySession.customerId, schema.customer.id))
    .where(and(...conditions))
    .orderBy(desc(schema.cameraDeploySession.updatedAt));

  const result: CameraDeploySessionRow[] = [];
  for (const row of rows) {
    const targets: Array<{ status: string }> = await db
      .select({
        status: schema.cameraDeployTarget.status,
      })
      .from(schema.cameraDeployTarget)
      .where(
        and(
          eq(schema.cameraDeployTarget.sessionId, row.id),
          eq(schema.cameraDeployTarget.organizationId, orgId),
          isNull(schema.cameraDeployTarget.deletedAt),
        ),
      );

    result.push({
      ...row,
      status: row.status as CameraDeploySessionStatus,
      targetCount: targets.length,
      deployedCount: targets.filter((t) => t.status === "deployed").length,
    });
  }

  return result;
}

export async function getCameraDeploySession(id: string): Promise<CameraDeploySessionDetail | null> {
  const session = await requireOrgSession("camera_deploy:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [row] = await db
    .select({
      id: schema.cameraDeploySession.id,
      title: schema.cameraDeploySession.title,
      description: schema.cameraDeploySession.description,
      status: schema.cameraDeploySession.status,
      customerId: schema.cameraDeploySession.customerId,
      siteId: schema.cameraDeploySession.siteId,
      siteName: schema.site.name,
      customerName: schema.customer.name,
      ipRangeStart: schema.cameraDeploySession.ipRangeStart,
      ipRangeEnd: schema.cameraDeploySession.ipRangeEnd,
      subnetMask: schema.cameraDeploySession.subnetMask,
      gateway: schema.cameraDeploySession.gateway,
      dnsServers: schema.cameraDeploySession.dnsServers,
      defaultUsername: schema.cameraDeploySession.defaultUsername,
      vlanId: schema.cameraDeploySession.vlanId,
      createdAt: schema.cameraDeploySession.createdAt,
      updatedAt: schema.cameraDeploySession.updatedAt,
    })
    .from(schema.cameraDeploySession)
    .leftJoin(schema.site, eq(schema.cameraDeploySession.siteId, schema.site.id))
    .leftJoin(schema.customer, eq(schema.cameraDeploySession.customerId, schema.customer.id))
    .where(
      and(
        eq(schema.cameraDeploySession.id, id),
        eq(schema.cameraDeploySession.organizationId, orgId),
        isNull(schema.cameraDeploySession.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  const targets = (await db
    .select({
      id: schema.cameraDeployTarget.id,
      sessionId: schema.cameraDeployTarget.sessionId,
      deviceId: schema.cameraDeployTarget.deviceId,
      deviceName: schema.device.name,
      name: schema.cameraDeployTarget.name,
      locationLabel: schema.cameraDeployTarget.locationLabel,
      manufacturer: schema.cameraDeployTarget.manufacturer,
      model: schema.cameraDeployTarget.model,
      macAddress: schema.cameraDeployTarget.macAddress,
      serialNumber: schema.cameraDeployTarget.serialNumber,
      currentIp: schema.cameraDeployTarget.currentIp,
      targetIp: schema.cameraDeployTarget.targetIp,
      username: schema.cameraDeployTarget.username,
      channelNumber: schema.cameraDeployTarget.channelNumber,
      status: schema.cameraDeployTarget.status,
      sortOrder: schema.cameraDeployTarget.sortOrder,
      errorMessage: schema.cameraDeployTarget.errorMessage,
      deployedAt: schema.cameraDeployTarget.deployedAt,
    })
    .from(schema.cameraDeployTarget)
    .leftJoin(schema.device, eq(schema.cameraDeployTarget.deviceId, schema.device.id))
    .where(
      and(
        eq(schema.cameraDeployTarget.sessionId, id),
        eq(schema.cameraDeployTarget.organizationId, orgId),
        isNull(schema.cameraDeployTarget.deletedAt),
      ),
    )
    .orderBy(asc(schema.cameraDeployTarget.sortOrder), asc(schema.cameraDeployTarget.name))) as CameraDeployTargetRow[];

  return {
    session: {
      ...row,
      status: row.status as CameraDeploySessionStatus,
    },
    targets,
  };
}

export async function createCameraDeploySession(
  raw: CameraDeploySessionInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("camera_deploy:write");
  const parsed = cameraDeploySessionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const key = getEncryptionKey();
  let encryptedDefaultPassword: string | null = null;
  if (parsed.data.defaultPassword?.trim()) {
    if (!key) {
      return { ok: false, error: "ENCRYPTION_KEY ni nastavljen – gesel ni mogoče shraniti." };
    }
    encryptedDefaultPassword = encryptSecret(parsed.data.defaultPassword.trim(), key);
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const id = randomUUID();
  const now = new Date();
  const values = normalizeSession(parsed.data, encryptedDefaultPassword);

  await db.insert(schema.cameraDeploySession).values({
    id,
    organizationId: orgId,
    ...values,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "camera_deploy.session.create",
    entityType: "camera_deploy_session",
    entityId: id,
    metadata: { title: values.title },
  });

  revalidatePath("/camera-deploy");
  return { ok: true, data: { id } };
}

export async function updateCameraDeploySession(
  id: string,
  raw: CameraDeploySessionInput,
): Promise<ActionResult> {
  const session = await requireOrgSession("camera_deploy:write");
  const parsed = cameraDeploySessionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [existing] = await db
    .select({ id: schema.cameraDeploySession.id, encryptedDefaultPassword: schema.cameraDeploySession.encryptedDefaultPassword })
    .from(schema.cameraDeploySession)
    .where(
      and(
        eq(schema.cameraDeploySession.id, id),
        eq(schema.cameraDeploySession.organizationId, orgId),
        isNull(schema.cameraDeploySession.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return { ok: false, error: "Seja ni najdena." };

  let encryptedDefaultPassword = existing.encryptedDefaultPassword;
  if (parsed.data.defaultPassword?.trim()) {
    const key = getEncryptionKey();
    if (!key) {
      return { ok: false, error: "ENCRYPTION_KEY ni nastavljen – gesel ni mogoče shraniti." };
    }
    encryptedDefaultPassword = encryptSecret(parsed.data.defaultPassword.trim(), key);
  }

  const values = normalizeSession(parsed.data, encryptedDefaultPassword);
  await db
    .update(schema.cameraDeploySession)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(schema.cameraDeploySession.id, id));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "camera_deploy.session.update",
    entityType: "camera_deploy_session",
    entityId: id,
    metadata: { title: values.title },
  });

  revalidatePath("/camera-deploy");
  revalidatePath(`/camera-deploy/${id}`);
  return { ok: true };
}

export async function deleteCameraDeploySession(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("camera_deploy:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = new Date();

  const [existing] = await db
    .select({ id: schema.cameraDeploySession.id })
    .from(schema.cameraDeploySession)
    .where(
      and(
        eq(schema.cameraDeploySession.id, id),
        eq(schema.cameraDeploySession.organizationId, orgId),
        isNull(schema.cameraDeploySession.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return { ok: false, error: "Seja ni najdena." };

  await db
    .update(schema.cameraDeploySession)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(schema.cameraDeploySession.id, id));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "camera_deploy.session.delete",
    entityType: "camera_deploy_session",
    entityId: id,
  });

  revalidatePath("/camera-deploy");
  return { ok: true };
}

export async function addCameraDeployTarget(
  raw: CameraDeployTargetInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("camera_deploy:write");
  const parsed = cameraDeployTargetInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [deploySession] = await db
    .select({ id: schema.cameraDeploySession.id })
    .from(schema.cameraDeploySession)
    .where(
      and(
        eq(schema.cameraDeploySession.id, parsed.data.sessionId),
        eq(schema.cameraDeploySession.organizationId, orgId),
        isNull(schema.cameraDeploySession.deletedAt),
      ),
    )
    .limit(1);

  if (!deploySession) return { ok: false, error: "Seja ni najdena." };

  let encryptedPassword: string | null = null;
  if (parsed.data.password?.trim()) {
    const key = getEncryptionKey();
    if (!key) {
      return { ok: false, error: "ENCRYPTION_KEY ni nastavljen – gesel ni mogoče shraniti." };
    }
    encryptedPassword = encryptSecret(parsed.data.password.trim(), key);
  }

  const [maxSort] = await db
    .select({ sortOrder: schema.cameraDeployTarget.sortOrder })
    .from(schema.cameraDeployTarget)
    .where(
      and(
        eq(schema.cameraDeployTarget.sessionId, parsed.data.sessionId),
        isNull(schema.cameraDeployTarget.deletedAt),
      ),
    )
    .orderBy(desc(schema.cameraDeployTarget.sortOrder))
    .limit(1);

  const id = randomUUID();
  const now = new Date();
  const values = normalizeTarget(parsed.data, encryptedPassword);

  await db.insert(schema.cameraDeployTarget).values({
    id,
    organizationId: orgId,
    sessionId: parsed.data.sessionId,
    ...values,
    status: "pending",
    sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath(`/camera-deploy/${parsed.data.sessionId}`);
  return { ok: true, data: { id } };
}

export async function updateCameraDeployTargetStatus(
  targetId: string,
  status: CameraDeployTargetStatus,
  errorMessage?: string,
): Promise<ActionResult> {
  const session = await requireOrgSession("camera_deploy:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = new Date();

  const [target] = await db
    .select({
      id: schema.cameraDeployTarget.id,
      sessionId: schema.cameraDeployTarget.sessionId,
    })
    .from(schema.cameraDeployTarget)
    .where(
      and(
        eq(schema.cameraDeployTarget.id, targetId),
        eq(schema.cameraDeployTarget.organizationId, orgId),
        isNull(schema.cameraDeployTarget.deletedAt),
      ),
    )
    .limit(1);

  if (!target) return { ok: false, error: "Kamera ni najdena." };

  await db
    .update(schema.cameraDeployTarget)
    .set({
      status,
      errorMessage: errorMessage?.trim() || null,
      deployedAt: status === "deployed" ? now : null,
      updatedAt: now,
    })
    .where(eq(schema.cameraDeployTarget.id, targetId));

  revalidatePath(`/camera-deploy/${target.sessionId}`);
  return { ok: true };
}

export async function deleteCameraDeployTarget(targetId: string): Promise<ActionResult> {
  const session = await requireOrgSession("camera_deploy:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = new Date();

  const [target] = await db
    .select({ sessionId: schema.cameraDeployTarget.sessionId })
    .from(schema.cameraDeployTarget)
    .where(
      and(
        eq(schema.cameraDeployTarget.id, targetId),
        eq(schema.cameraDeployTarget.organizationId, orgId),
        isNull(schema.cameraDeployTarget.deletedAt),
      ),
    )
    .limit(1);

  if (!target) return { ok: false, error: "Kamera ni najdena." };

  await db
    .update(schema.cameraDeployTarget)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(schema.cameraDeployTarget.id, targetId));

  revalidatePath(`/camera-deploy/${target.sessionId}`);
  return { ok: true };
}

export async function autoAssignTargetIps(sessionId: string): Promise<ActionResult<{ updated: number }>> {
  const session = await requireOrgSession("camera_deploy:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [deploySession] = await db
    .select({
      ipRangeStart: schema.cameraDeploySession.ipRangeStart,
    })
    .from(schema.cameraDeploySession)
    .where(
      and(
        eq(schema.cameraDeploySession.id, sessionId),
        eq(schema.cameraDeploySession.organizationId, orgId),
        isNull(schema.cameraDeploySession.deletedAt),
      ),
    )
    .limit(1);

  if (!deploySession?.ipRangeStart) {
    return { ok: false, error: "Seja nima nastavljenega začetnega IP območja." };
  }

  const targets: Array<{ id: string; targetIp: string | null }> = await db
    .select({
      id: schema.cameraDeployTarget.id,
      targetIp: schema.cameraDeployTarget.targetIp,
    })
    .from(schema.cameraDeployTarget)
    .where(
      and(
        eq(schema.cameraDeployTarget.sessionId, sessionId),
        eq(schema.cameraDeployTarget.organizationId, orgId),
        isNull(schema.cameraDeployTarget.deletedAt),
      ),
    )
    .orderBy(asc(schema.cameraDeployTarget.sortOrder), asc(schema.cameraDeployTarget.name));

  const unassigned = targets.filter((t) => !t.targetIp?.trim());
  if (unassigned.length === 0) {
    return { ok: true, data: { updated: 0 } };
  }

  const usedIps = new Set(targets.map((t) => t.targetIp).filter(Boolean) as string[]);
  let cursor = deploySession.ipRangeStart;
  let updated = 0;
  const now = new Date();

  for (const target of unassigned) {
    let assigned: string | null = null;
    for (let i = 0; i < 512; i++) {
      const candidate = allocateIpAddresses(cursor, 1)[0];
      if (!candidate) break;
      cursor = allocateIpAddresses(candidate, 2)[1] ?? candidate;
      if (!usedIps.has(candidate)) {
        assigned = candidate;
        usedIps.add(candidate);
        break;
      }
    }
    if (!assigned) break;

    await db
      .update(schema.cameraDeployTarget)
      .set({ targetIp: assigned, status: "configured", updatedAt: now })
      .where(eq(schema.cameraDeployTarget.id, target.id));
    updated += 1;
  }

  revalidatePath(`/camera-deploy/${sessionId}`);
  return { ok: true, data: { updated } };
}

export async function revealSessionDefaultPassword(sessionId: string): Promise<ActionResult<{ password: string }>> {
  const session = await requireOrgSession("camera_deploy:write");
  const key = getEncryptionKey();
  if (!key) return { ok: false, error: "ENCRYPTION_KEY ni nastavljen." };

  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [row] = await db
    .select({ encryptedDefaultPassword: schema.cameraDeploySession.encryptedDefaultPassword })
    .from(schema.cameraDeploySession)
    .where(
      and(
        eq(schema.cameraDeploySession.id, sessionId),
        eq(schema.cameraDeploySession.organizationId, orgId),
        isNull(schema.cameraDeploySession.deletedAt),
      ),
    )
    .limit(1);

  if (!row?.encryptedDefaultPassword) {
    return { ok: false, error: "Privzeto geslo ni shranjeno." };
  }

  try {
    const password = decryptSecret(row.encryptedDefaultPassword, key);
    return { ok: true, data: { password } };
  } catch {
    return { ok: false, error: "Gesla ni mogoče dešifrirati." };
  }
}
