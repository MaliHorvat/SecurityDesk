import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { sha256Hex } from "@securitydesk/shared/crypto";

export async function findAgentByToken(token: string) {
  const tokenHash = sha256Hex(token);
  const { db, schema } = getDb();
  const [agent] = await db
    .select()
    .from(schema.monitoringAgent)
    .where(
      and(
        eq(schema.monitoringAgent.tokenHash, tokenHash),
        isNull(schema.monitoringAgent.deletedAt),
      ),
    )
    .limit(1);
  if (!agent || agent.status === "revoked") return null;
  return agent;
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}
