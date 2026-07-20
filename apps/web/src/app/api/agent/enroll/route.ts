import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { agentEnrollRequestSchema } from "@securitydesk/shared";
import { sha256Hex } from "@securitydesk/shared/crypto";
import { clientIp } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neveljaven JSON." }, { status: 400 });
  }

  const parsed = agentEnrollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." }, { status: 400 });
  }

  const { db, schema } = getDb();
  const tokenHash = sha256Hex(parsed.data.enrollmentToken);
  const now = new Date();

  const [enroll] = await db
    .select()
    .from(schema.agentEnrollmentToken)
    .where(eq(schema.agentEnrollmentToken.tokenHash, tokenHash))
    .limit(1);

  if (!enroll) {
    return NextResponse.json({ error: "Neveljaven enrollment žeton." }, { status: 401 });
  }
  if (enroll.usedAt) {
    return NextResponse.json({ error: "Enrollment žeton je že uporabljen." }, { status: 410 });
  }
  if (enroll.expiresAt.getTime() < now.getTime()) {
    return NextResponse.json({ error: "Enrollment žeton je potekel." }, { status: 410 });
  }

  const agentToken = createOpaqueToken(32);
  const agentId = randomUUID();

  await db.insert(schema.monitoringAgent).values({
    id: agentId,
    organizationId: enroll.organizationId,
    siteId: enroll.siteId,
    name: parsed.data.name.trim(),
    hostname: parsed.data.hostname?.trim() || null,
    version: parsed.data.version?.trim() || "0.1.0",
    tokenHash: sha256Hex(agentToken),
    status: "active",
    lastHeartbeatAt: now,
    lastIp: clientIp(request),
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(schema.agentEnrollmentToken)
    .set({ usedAt: now, usedByAgentId: agentId })
    .where(eq(schema.agentEnrollmentToken.id, enroll.id));

  return NextResponse.json({
    agentId,
    agentToken,
    organizationId: enroll.organizationId,
    siteId: enroll.siteId,
    apiBase: "/api/agent",
  });
}
