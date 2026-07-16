"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
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

/**
 * Create organization using the incoming request session cookies.
 * Avoids client-side Better Auth 401 when cookies are present for middleware
 * but not attached correctly on the browser auth client call.
 */
export async function createOrganizationAction(name: string): Promise<CreateOrgResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Ime organizacije je obvezno." };
  }

  const requestHeaders = await headers();
  const auth = getAuth();

  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return {
      ok: false,
      error: "Niste prijavljeni. Odjavite se in se ponovno prijavite, nato poskusite znova.",
      code: "UNAUTHORIZED",
    };
  }

  const baseSlug = slugify(trimmed) || `org-${Date.now()}`;
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  try {
    const organization = await auth.api.createOrganization({
      body: {
        name: trimmed,
        slug,
        keepCurrentActiveOrganization: false,
      },
      headers: requestHeaders,
    });

    if (!organization?.id) {
      return { ok: false, error: "Organizacije ni bilo mogoče ustvariti." };
    }

    await bootstrapOrganizationDefaults(organization.id);

    // Better Auth may fail to persist membership when DB role enum rejects "owner".
    // Always ensure the creator is organization_owner.
    const { db, schema } = getDb();
    const [existingMember] = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, organization.id),
          eq(schema.member.userId, session.user.id),
        ),
      )
      .limit(1);

    if (!existingMember) {
      const now = new Date();
      await db.insert(schema.member).values({
        id: randomUUID(),
        organizationId: organization.id,
        userId: session.user.id,
        role: "organization_owner",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await db
        .update(schema.member)
        .set({ role: "organization_owner", updatedAt: new Date() })
        .where(eq(schema.member.id, existingMember.id));
    }

    return { ok: true, organizationId: organization.id };
  } catch (error: unknown) {
    if (error instanceof APIError) {
      return {
        ok: false,
        error: error.message || "Organizacije ni bilo mogoče ustvariti.",
        code: error.status?.toString(),
      };
    }
    const message = error instanceof Error ? error.message : "Organizacije ni bilo mogoče ustvariti.";
    return { ok: false, error: message };
  }
}

async function bootstrapOrganizationDefaults(organizationId: string) {
  const { db, schema } = getDb();
  const now = new Date();

  // Integrator during active multi-module development so all nav modules are visible.
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
