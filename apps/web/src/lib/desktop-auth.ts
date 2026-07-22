import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { mapMemberRole, type PlanId, type PlatformRole } from "@securitydesk/shared";
import { sha256Hex } from "@securitydesk/shared/crypto";

export type DesktopSession = {
  tokenId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    planId: PlanId;
  } | null;
  role: PlatformRole | null;
};

export function hashToken(token: string): string {
  return sha256Hex(token);
}

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function getDesktopBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function createDesktopToken(input: {
  userId: string;
  organizationId: string | null;
  name?: string | null;
  expiresInDays?: number;
}): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
  const { db, schema } = getDb();
  const token = createOpaqueToken(32);
  const id = randomUUID();
  const now = new Date();
  const ttlDays = input.expiresInDays ?? Number(process.env.DESKTOP_API_TOKEN_TTL_DAYS ?? 90);
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  await db.insert(schema.desktopApiToken).values({
    id,
    userId: input.userId,
    organizationId: input.organizationId,
    tokenHash: hashToken(token),
    name: input.name ?? null,
    expiresAt,
    createdAt: now,
  });

  return { token, tokenId: id, expiresAt };
}

export async function revokeDesktopToken(token: string): Promise<void> {
  const { db, schema } = getDb();
  await db
    .update(schema.desktopApiToken)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.desktopApiToken.tokenHash, hashToken(token)), isNull(schema.desktopApiToken.revokedAt)));
}

export async function getDesktopBearerSession(request: Request): Promise<DesktopSession | null> {
  const token = getDesktopBearerToken(request);
  if (!token) return null;

  const { db, schema } = getDb();
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(schema.desktopApiToken)
    .where(eq(schema.desktopApiToken.tokenHash, tokenHash))
    .limit(1);
  if (!row || row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  const [user] = await db.select().from(schema.user).where(eq(schema.user.id, row.userId)).limit(1);
  if (!user) return null;

  let organization: DesktopSession["organization"] = null;
  let role: PlatformRole | null = null;

  if (row.organizationId) {
    const [org] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, row.organizationId))
      .limit(1);
    if (org) {
      organization = { id: org.id, name: org.name, slug: org.slug, planId: org.planId };
      const [member] = await db
        .select({ role: schema.member.role })
        .from(schema.member)
        .where(and(eq(schema.member.organizationId, org.id), eq(schema.member.userId, user.id)))
        .limit(1);
      role = mapMemberRole(member?.role);
    }
  }

  db.update(schema.desktopApiToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.desktopApiToken.id, row.id))
    .catch(() => {});

  return {
    tokenId: row.id,
    user: { id: user.id, name: user.name, email: user.email, image: user.image },
    organization,
    role,
  };
}

export async function requireDesktopSession(request: Request): Promise<DesktopSession> {
  const session = await getDesktopBearerSession(request);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function desktopRequestMeta(request: Request): {
  platform: string | null;
  appVersion: string | null;
  installationId: string | null;
} {
  return {
    platform: request.headers.get("x-securitydesk-platform"),
    appVersion: request.headers.get("x-securitydesk-desktop-version"),
    installationId: request.headers.get("x-securitydesk-installation-id"),
  };
}