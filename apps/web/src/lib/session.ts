import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { mapMemberRole, PLANS, type PlatformRole } from "@securitydesk/shared";
import { getAuth } from "@/lib/auth";

/**
 * Logout creates a new session without activeOrganizationId.
 * Restore the earliest membership so the org appears after re-login.
 */
async function resolveActiveOrganizationId(
  userId: string,
  sessionId: string,
  currentActiveOrgId: string | null,
): Promise<string | null> {
  if (currentActiveOrgId) {
    return currentActiveOrgId;
  }

  const { db, schema } = getDb();
  const [membership] = await db
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .orderBy(asc(schema.member.createdAt))
    .limit(1);

  if (!membership) {
    return null;
  }

  const organizationId = membership.organizationId;

  await db
    .update(schema.session)
    .set({ activeOrganizationId: organizationId, updatedAt: new Date() })
    .where(eq(schema.session.id, sessionId));

  return organizationId;
}

export type AppSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  session: {
    id: string;
    activeOrganizationId?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    planId: "starter" | "professional" | "integrator" | "enterprise";
  } | null;
  role: PlatformRole | null;
};

/**
 * Ensure the signed-in user has a membership row for the active org.
 * Better Auth used to fail inserting role "owner" into a MySQL ENUM that only
 * allowed organization_owner — leaving orgs without members (empty nav).
 */
async function ensureMembership(
  organizationId: string,
  userId: string,
  preferredRole: string = "organization_owner",
): Promise<string> {
  const { db, schema } = getDb();
  const [existing] = await db
    .select()
    .from(schema.member)
    .where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, userId)))
    .limit(1);

  if (existing) {
    return existing.role;
  }

  const now = new Date();
  await db.insert(schema.member).values({
    id: randomUUID(),
    organizationId,
    userId,
    role: preferredRole,
    createdAt: now,
    updatedAt: now,
  });
  return preferredRole;
}

/** Keep module_entitlement rows in sync when plan catalog gains new modules. */
async function ensurePlanModuleEntitlements(
  organizationId: string,
  planId: "starter" | "professional" | "integrator" | "enterprise",
) {
  try {
    const { db, schema } = getDb();
    const now = new Date();
    const existing = await db
      .select({ moduleId: schema.moduleEntitlement.moduleId })
      .from(schema.moduleEntitlement)
      .where(eq(schema.moduleEntitlement.organizationId, organizationId));
    const have = new Set(existing.map((e: { moduleId: string }) => e.moduleId));

    for (const moduleId of PLANS[planId].limits.modules) {
      if (have.has(moduleId)) continue;
      await db.insert(schema.moduleEntitlement).values({
        id: randomUUID(),
        organizationId,
        moduleId,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    // Never break login/nav if entitlement backfill fails (unique races, etc.).
    console.error("[ensurePlanModuleEntitlements]", organizationId, planId, error);
  }
}

/** During multi-module rollout, lift starter orgs so sidebar shows all active modules. */
async function ensureDevPlan(
  organizationId: string,
  currentPlanId: "starter" | "professional" | "integrator" | "enterprise",
): Promise<"starter" | "professional" | "integrator" | "enterprise"> {
  if (process.env.DEV_LIFT_STARTER_MODULES !== "true") {
    await ensurePlanModuleEntitlements(organizationId, currentPlanId);
    return currentPlanId;
  }

  if (currentPlanId !== "starter") {
    await ensurePlanModuleEntitlements(organizationId, currentPlanId);
    return currentPlanId;
  }

  const { db, schema } = getDb();
  const now = new Date();
  const planId = "integrator" as const;

  await db
    .update(schema.organization)
    .set({ planId, updatedAt: now })
    .where(eq(schema.organization.id, organizationId));

  await ensurePlanModuleEntitlements(organizationId, planId);

  return planId;
}

export async function getAppSession(): Promise<AppSession | null> {
  const auth = getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  if (!session?.user) {
    return null;
  }

  const activeOrgId = await resolveActiveOrganizationId(
    session.user.id,
    session.session.id,
    session.session.activeOrganizationId ?? null,
  );
  let organization: AppSession["organization"] = null;
  let role: PlatformRole | null = null;

  if (activeOrgId) {
    const { db, schema } = getDb();
    const [org] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, activeOrgId))
      .limit(1);

    if (org) {
      const planId = await ensureDevPlan(activeOrgId, org.planId);
      organization = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        planId,
      };

      const rawRole = await ensureMembership(activeOrgId, session.user.id, "organization_owner");
      role = mapMemberRole(rawRole);
    }
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    session: {
      id: session.session.id,
      activeOrganizationId: activeOrgId,
    },
    organization,
    role,
  };
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
