import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { agentResultsRequestSchema, parseOptionalDate } from "@securitydesk/shared";
import { findAgentByToken, getBearerToken } from "@/lib/agent-auth";
import { syncMonitoringDashboardStats } from "@/server/monitoring";

export const dynamic = "force-dynamic";

type CheckRow = { id: string; deviceId: string };

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: "Manjka Bearer žeton." }, { status: 401 });

  const agent = await findAgentByToken(token);
  if (!agent) return NextResponse.json({ error: "Neveljaven agent žeton." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neveljaven JSON." }, { status: 400 });
  }

  const parsed = agentResultsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." }, { status: 400 });
  }

  const { db, schema } = getDb();
  const checkIds = parsed.data.results.map((r) => r.checkId);

  const checks: CheckRow[] = await db
    .select({
      id: schema.monitoringCheck.id,
      deviceId: schema.monitoringCheck.deviceId,
    })
    .from(schema.monitoringCheck)
    .where(
      and(
        eq(schema.monitoringCheck.organizationId, agent.organizationId),
        isNull(schema.monitoringCheck.deletedAt),
        inArray(schema.monitoringCheck.id, checkIds),
      ),
    );

  const byId = new Map<string, CheckRow>(checks.map((c) => [c.id, c]));
  const now = new Date();
  let inserted = 0;

  for (const result of parsed.data.results) {
    const check = byId.get(result.checkId);
    if (!check) continue;

    await db.insert(schema.monitoringCheckResult).values({
      id: randomUUID(),
      organizationId: agent.organizationId,
      checkId: check.id,
      deviceId: check.deviceId,
      agentId: agent.id,
      status: result.status,
      latencyMs: result.latencyMs ?? null,
      message: result.message?.trim() || null,
      checkedAt: parseOptionalDate(result.checkedAt) ?? now,
      createdAt: now,
    });
    inserted += 1;
  }

  await db
    .update(schema.monitoringAgent)
    .set({ status: "active", lastHeartbeatAt: now, updatedAt: now })
    .where(eq(schema.monitoringAgent.id, agent.id));

  await syncMonitoringDashboardStats(agent.organizationId);

  return NextResponse.json({ ok: true, inserted });
}
