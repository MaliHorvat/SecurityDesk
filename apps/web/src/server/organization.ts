"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { PLANS } from "@securitydesk/shared";
import { getAuth } from "@/lib/auth";

export type CreateOrgResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string; code?: string };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

/** First organization membership for a user (oldest first). */
export async function findFirstMembershipOrganizationId(userId: string): Promise<string | null> {
  const { db, schema } = getDb();
  const [membership] = await db
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .orderBy(asc(schema.member.createdAt))
    .limit(1);
  return membership?.organizationId ?? null;
}

/**
 * Create organization + owner membership directly in DB.
 * Avoids Better Auth createOrganization, which can leave orgs without members
 * when membership insert fails after the org row is already written.
 */
export async function createOrganizationAction(name: string): Promise<CreateOrgResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Ime organizacije je obvezno." };
  }

  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });
  if (!session?.user) {
    return {
      ok: false,
      error: "Niste prijavljeni. Odjavite se in se ponovno prijavite, nato poskusite znova.",
      code: "UNAUTHORIZED",
    };
  }

  const existingOrgId = await findFirstMembershipOrganizationId(session.user.id);
  if (existingOrgId) {
    await setSessionActiveOrganization(session.session.id, existingOrgId);
    return { ok: true, organizationId: existingOrgId };
  }

  const { db, schema } = getDb();
  const now = new Date();
  const organizationId = randomUUID();
  const baseSlug = slugify(trimmed) || `org-${Date.now()}`;
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    await db.insert(schema.organization).values({
      id: organizationId,
      name: trimmed,
      slug,
      planId: "integrator",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.member).values({
      id: randomUUID(),
      organizationId,
      userId: session.user.id,
      role: "organization_owner",
      createdAt: now,
      updatedAt: now,
    });

    await bootstrapOrganizationDefaults(organizationId);
    await setSessionActiveOrganization(session.session.id, organizationId);

    return { ok: true, organizationId };
  } catch (error: unknown) {
    // Best-effort cleanup if member/bootstrap failed after org insert.
    try {
      await db.delete(schema.organization).where(eq(schema.organization.id, organizationId));
    } catch {
      /* ignore */
    }
    const message = error instanceof Error ? error.message : "Organizacije ni bilo mogoče ustvariti.";
    return { ok: false, error: message };
  }
}

/** Restore active org on the current session from memberships (used after login). */
export async function restoreActiveOrganizationAction(): Promise<{
  ok: boolean;
  organizationId: string | null;
}> {
  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });
  if (!session?.user) {
    return { ok: false, organizationId: null };
  }

  let organizationId = session.session.activeOrganizationId ?? null;
  if (!organizationId) {
    organizationId = await findFirstMembershipOrganizationId(session.user.id);
  }

  if (!organizationId) {
    return { ok: true, organizationId: null };
  }

  // Ensure membership exists (repairs historical orphan active-org sessions).
  const { db, schema } = getDb();
  const [existingMember] = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(
      and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, session.user.id)),
    )
    .limit(1);

  if (!existingMember) {
    const now = new Date();
    await db.insert(schema.member).values({
      id: randomUUID(),
      organizationId,
      userId: session.user.id,
      role: "organization_owner",
      createdAt: now,
      updatedAt: now,
    });
  }

  await setSessionActiveOrganization(session.session.id, organizationId);
  return { ok: true, organizationId };
}

async function setSessionActiveOrganization(sessionId: string, organizationId: string) {
  const { db, schema } = getDb();
  await db
    .update(schema.session)
    .set({ activeOrganizationId: organizationId, updatedAt: new Date() })
    .where(eq(schema.session.id, sessionId));
}

async function bootstrapOrganizationDefaults(organizationId: string) {
  const { db, schema } = getDb();
  const now = new Date();
  const planId = "integrator" as const;

  await db
    .update(schema.organization)
    .set({ planId, updatedAt: now })
    .where(eq(schema.organization.id, organizationId));

  await db.insert(schema.subscription).values({
    id: randomUUID(),
    organizationId,
    planId,
    status: "active",
    currentPeriodStart: now,
    createdAt: now,
    updatedAt: now,
  });

  for (const moduleId of PLANS[planId].limits.modules) {
    await db.insert(schema.moduleEntitlement).values({
      id: randomUUID(),
      organizationId,
      moduleId,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(schema.organizationSettings).values({
    id: randomUUID(),
    organizationId,
    locale: "sl",
    timezone: "Europe/Ljubljana",
    brandPrimaryColor: "#1d4ed8",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.dashboardStat).values({
    id: randomUUID(),
    organizationId,
    customersCount: 0,
    sitesCount: 0,
    devicesCount: 0,
    openTicketsCount: 0,
    onlineDevicesCount: 0,
    offlineDevicesCount: 0,
    updatedAt: now,
  });
}
