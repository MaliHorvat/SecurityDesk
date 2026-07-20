"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  enrollmentTokenInputSchema,
  emptyToNull,
  isAgentOnline,
  monitoringCheckInputSchema,
  resolveDeviceHealth,
  type EnrollmentTokenInput,
  type MonitoringCheckInput,
  type MonitoringHealthStatus,
} from "@securitydesk/shared";
import { sha256Hex } from "@securitydesk/shared/crypto";
import { requireOrgSession } from "@/lib/org-context";
import { refreshDashboardStats, writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

export type MonitoringAgentRow = {
  id: string;
  name: string;
  hostname: string | null;
  version: string | null;
  status: string;
  siteId: string | null;
  siteName: string | null;
  lastHeartbeatAt: Date | null;
  lastIp: string | null;
  online: boolean;
  createdAt: Date;
};

export type MonitoringCheckRow = {
  id: string;
  name: string;
  checkType: string;
  targetHost: string;
  targetPort: number | null;
  targetPath: string | null;
  intervalSeconds: number;
  enabled: boolean;
  deviceId: string;
  deviceName: string;
  agentId: string | null;
  agentName: string | null;
  lastStatus: MonitoringHealthStatus;
  lastCheckedAt: Date | null;
  lastLatencyMs: number | null;
};

function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export async function listMonitoringAgents(): Promise<MonitoringAgentRow[]> {
  const session = await requireOrgSession("monitoring:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      id: schema.monitoringAgent.id,
      name: schema.monitoringAgent.name,
      hostname: schema.monitoringAgent.hostname,
      version: schema.monitoringAgent.version,
      status: schema.monitoringAgent.status,
      siteId: schema.monitoringAgent.siteId,
      siteName: schema.site.name,
      lastHeartbeatAt: schema.monitoringAgent.lastHeartbeatAt,
      lastIp: schema.monitoringAgent.lastIp,
      createdAt: schema.monitoringAgent.createdAt,
    })
    .from(schema.monitoringAgent)
    .leftJoin(schema.site, eq(schema.monitoringAgent.siteId, schema.site.id))
    .where(and(eq(schema.monitoringAgent.organizationId, orgId), isNull(schema.monitoringAgent.deletedAt)))
    .orderBy(desc(schema.monitoringAgent.createdAt));

  return rows.map((r: (typeof rows)[number]) => ({
    ...r,
    online: r.status !== "revoked" && isAgentOnline(r.lastHeartbeatAt),
  }));
}

export async function createEnrollmentToken(
  raw: EnrollmentTokenInput,
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const session = await requireOrgSession("monitoring:write");
  const parsed = enrollmentTokenInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const token = createOpaqueToken(24);
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + parsed.data.expiresInHours * 60 * 60 * 1000);

  await db.insert(schema.agentEnrollmentToken).values({
    id,
    organizationId: orgId,
    siteId: emptyToNull(parsed.data.siteId),
    createdByUserId: session.user.id,
    label: emptyToNull(parsed.data.label),
    tokenHash: sha256Hex(token),
    expiresAt,
    createdAt: now,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "monitoring.enrollment_token.create",
    entityType: "agent_enrollment_token",
    entityId: id,
  });

  revalidatePath("/monitoring");
  return { ok: true, data: { token, expiresAt: expiresAt.toISOString() } };
}

export async function revokeMonitoringAgent(agentId: string): Promise<ActionResult> {
  const session = await requireOrgSession("monitoring:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [existing] = await db
    .select({ id: schema.monitoringAgent.id })
    .from(schema.monitoringAgent)
    .where(
      and(
        eq(schema.monitoringAgent.id, agentId),
        eq(schema.monitoringAgent.organizationId, orgId),
        isNull(schema.monitoringAgent.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { ok: false, error: "Agent ni najden." };

  await db
    .update(schema.monitoringAgent)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(schema.monitoringAgent.id, agentId));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "monitoring.agent.revoke",
    entityType: "monitoring_agent",
    entityId: agentId,
  });

  revalidatePath("/monitoring");
  return { ok: true };
}

export async function listMonitoringChecks(): Promise<MonitoringCheckRow[]> {
  const session = await requireOrgSession("monitoring:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const checks = await db
    .select({
      id: schema.monitoringCheck.id,
      name: schema.monitoringCheck.name,
      checkType: schema.monitoringCheck.checkType,
      targetHost: schema.monitoringCheck.targetHost,
      targetPort: schema.monitoringCheck.targetPort,
      targetPath: schema.monitoringCheck.targetPath,
      intervalSeconds: schema.monitoringCheck.intervalSeconds,
      enabled: schema.monitoringCheck.enabled,
      deviceId: schema.monitoringCheck.deviceId,
      deviceName: schema.device.name,
      agentId: schema.monitoringCheck.agentId,
      agentName: schema.monitoringAgent.name,
    })
    .from(schema.monitoringCheck)
    .leftJoin(schema.device, eq(schema.monitoringCheck.deviceId, schema.device.id))
    .leftJoin(schema.monitoringAgent, eq(schema.monitoringCheck.agentId, schema.monitoringAgent.id))
    .where(and(eq(schema.monitoringCheck.organizationId, orgId), isNull(schema.monitoringCheck.deletedAt)))
    .orderBy(desc(schema.monitoringCheck.createdAt));

  const results: MonitoringCheckRow[] = [];
  for (const c of checks) {
    const [latest] = await db
      .select({
        status: schema.monitoringCheckResult.status,
        checkedAt: schema.monitoringCheckResult.checkedAt,
        latencyMs: schema.monitoringCheckResult.latencyMs,
      })
      .from(schema.monitoringCheckResult)
      .where(
        and(
          eq(schema.monitoringCheckResult.organizationId, orgId),
          eq(schema.monitoringCheckResult.checkId, c.id),
        ),
      )
      .orderBy(desc(schema.monitoringCheckResult.checkedAt))
      .limit(1);

    results.push({
      id: c.id,
      name: c.name,
      checkType: c.checkType,
      targetHost: c.targetHost,
      targetPort: c.targetPort,
      targetPath: c.targetPath,
      intervalSeconds: c.intervalSeconds,
      enabled: c.enabled,
      deviceId: c.deviceId,
      deviceName: c.deviceName ?? "—",
      agentId: c.agentId,
      agentName: c.agentName,
      lastStatus: resolveDeviceHealth(latest?.checkedAt, latest?.status as MonitoringHealthStatus | undefined),
      lastCheckedAt: latest?.checkedAt ?? null,
      lastLatencyMs: latest?.latencyMs ?? null,
    });
  }

  return results;
}

export async function createMonitoringCheck(raw: MonitoringCheckInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("monitoring:write");
  const parsed = monitoringCheckInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [device] = await db
    .select({ id: schema.device.id })
    .from(schema.device)
    .where(
      and(eq(schema.device.id, data.deviceId), eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)),
    )
    .limit(1);
  if (!device) return { ok: false, error: "Naprava ni najdena." };

  if (data.agentId?.trim()) {
    const [agent] = await db
      .select({ id: schema.monitoringAgent.id })
      .from(schema.monitoringAgent)
      .where(
        and(
          eq(schema.monitoringAgent.id, data.agentId),
          eq(schema.monitoringAgent.organizationId, orgId),
          isNull(schema.monitoringAgent.deletedAt),
        ),
      )
      .limit(1);
    if (!agent) return { ok: false, error: "Agent ni najden." };
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(schema.monitoringCheck).values({
    id,
    organizationId: orgId,
    deviceId: data.deviceId,
    agentId: emptyToNull(data.agentId),
    name: data.name.trim(),
    checkType: data.checkType,
    targetHost: data.targetHost.trim(),
    targetPort: data.targetPort ?? null,
    targetPath: emptyToNull(data.targetPath),
    intervalSeconds: data.intervalSeconds,
    timeoutMs: data.timeoutMs,
    enabled: data.enabled,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "monitoring.check.create",
    entityType: "monitoring_check",
    entityId: id,
  });

  revalidatePath("/monitoring");
  return { ok: true, data: { id } };
}

export async function deleteMonitoringCheck(checkId: string): Promise<ActionResult> {
  const session = await requireOrgSession("monitoring:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [existing] = await db
    .select({ id: schema.monitoringCheck.id })
    .from(schema.monitoringCheck)
    .where(
      and(
        eq(schema.monitoringCheck.id, checkId),
        eq(schema.monitoringCheck.organizationId, orgId),
        isNull(schema.monitoringCheck.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { ok: false, error: "Preverjanje ni najdeno." };

  await db
    .update(schema.monitoringCheck)
    .set({ deletedAt: new Date(), enabled: false })
    .where(eq(schema.monitoringCheck.id, checkId));

  revalidatePath("/monitoring");
  return { ok: true };
}

export async function getMonitoringOverview(): Promise<{
  agentsOnline: number;
  agentsTotal: number;
  checksOnline: number;
  checksOffline: number;
  checksUnknown: number;
}> {
  const agents = await listMonitoringAgents();
  const checks = await listMonitoringChecks();
  return {
    agentsOnline: agents.filter((a) => a.online).length,
    agentsTotal: agents.length,
    checksOnline: checks.filter((c) => c.lastStatus === "online").length,
    checksOffline: checks.filter((c) => c.lastStatus === "offline" || c.lastStatus === "error").length,
    checksUnknown: checks.filter((c) => c.lastStatus === "unknown" || c.lastStatus === "degraded").length,
  };
}

/** Recalculate dashboard online/offline from latest monitoring results. */
export async function syncMonitoringDashboardStats(organizationId: string) {
  const { db, schema } = getDb();

  await refreshDashboardStats(organizationId);

  const latestPerDevice = await db
    .select({
      deviceId: schema.monitoringCheckResult.deviceId,
      status: schema.monitoringCheckResult.status,
      checkedAt: schema.monitoringCheckResult.checkedAt,
    })
    .from(schema.monitoringCheckResult)
    .where(eq(schema.monitoringCheckResult.organizationId, organizationId))
    .orderBy(desc(schema.monitoringCheckResult.checkedAt));

  const byDevice = new Map<string, { status: string; checkedAt: Date }>();
  for (const row of latestPerDevice) {
    if (!byDevice.has(row.deviceId)) {
      byDevice.set(row.deviceId, { status: row.status, checkedAt: row.checkedAt });
    }
  }

  let online = 0;
  let offline = 0;
  for (const v of byDevice.values()) {
    const health = resolveDeviceHealth(v.checkedAt, v.status as MonitoringHealthStatus);
    if (health === "online") online += 1;
    else if (health === "offline" || health === "error") offline += 1;
  }

  const [existing] = await db
    .select()
    .from(schema.dashboardStat)
    .where(eq(schema.dashboardStat.organizationId, organizationId))
    .limit(1);

  if (existing) {
    await db
      .update(schema.dashboardStat)
      .set({ onlineDevicesCount: online, offlineDevicesCount: offline, updatedAt: new Date() })
      .where(eq(schema.dashboardStat.id, existing.id));
  }
}
