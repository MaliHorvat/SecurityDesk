import { NextResponse } from "next/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { findAgentByToken, getBearerToken } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: "Manjka Bearer žeton." }, { status: 401 });

  const agent = await findAgentByToken(token);
  if (!agent) return NextResponse.json({ error: "Neveljaven agent žeton." }, { status: 401 });

  const { db, schema } = getDb();

  const checks = await db
    .select({
      id: schema.monitoringCheck.id,
      name: schema.monitoringCheck.name,
      checkType: schema.monitoringCheck.checkType,
      targetHost: schema.monitoringCheck.targetHost,
      targetPort: schema.monitoringCheck.targetPort,
      targetPath: schema.monitoringCheck.targetPath,
      intervalSeconds: schema.monitoringCheck.intervalSeconds,
      timeoutMs: schema.monitoringCheck.timeoutMs,
      deviceId: schema.monitoringCheck.deviceId,
    })
    .from(schema.monitoringCheck)
    .where(
      and(
        eq(schema.monitoringCheck.organizationId, agent.organizationId),
        eq(schema.monitoringCheck.enabled, true),
        isNull(schema.monitoringCheck.deletedAt),
        or(eq(schema.monitoringCheck.agentId, agent.id), isNull(schema.monitoringCheck.agentId)),
      ),
    );

  return NextResponse.json({
    agentId: agent.id,
    checks,
  });
}
