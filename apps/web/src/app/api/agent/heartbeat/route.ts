import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { agentHeartbeatRequestSchema, isAgentOnline } from "@securitydesk/shared";
import { clientIp, findAgentByToken, getBearerToken } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) return NextResponse.json({ error: "Manjka Bearer žeton." }, { status: 401 });

  const agent = await findAgentByToken(token);
  if (!agent) return NextResponse.json({ error: "Neveljaven agent žeton." }, { status: 401 });

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = agentHeartbeatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." }, { status: 400 });
  }

  const { db, schema } = getDb();
  const now = new Date();

  await db
    .update(schema.monitoringAgent)
    .set({
      status: "active",
      lastHeartbeatAt: now,
      lastIp: clientIp(request),
      version: parsed.data.version?.trim() || agent.version,
      updatedAt: now,
    })
    .where(eq(schema.monitoringAgent.id, agent.id));

  return NextResponse.json({
    ok: true,
    agentId: agent.id,
    serverTime: now.toISOString(),
    online: isAgentOnline(now),
  });
}
