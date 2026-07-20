"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { PLANS, type PlanId } from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";
import { randomUUID } from "node:crypto";

const brandInputSchema = z.object({
  brandPrimaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Uporabite hex barvo v formatu #RRGGBB"),
});

const planInputSchema = z.object({
  planId: z.string(),
});

function normalizeNow() {
  return new Date();
}

export async function updateOrganizationBrandAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await requireOrgSession("organization:billing");
  const parsed = brandInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = normalizeNow();

  const [existing] = await db
    .select({ id: schema.organizationSettings.id })
    .from(schema.organizationSettings)
    .where(eq(schema.organizationSettings.organizationId, orgId))
    .limit(1);

  if (!existing) {
    await db.insert(schema.organizationSettings).values({
      id: randomUUID(),
      organizationId: orgId,
      locale: "sl",
      timezone: "Europe/Ljubljana",
      brandPrimaryColor: parsed.data.brandPrimaryColor,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(schema.organizationSettings)
      .set({ brandPrimaryColor: parsed.data.brandPrimaryColor, updatedAt: now })
      .where(eq(schema.organizationSettings.organizationId, orgId));
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "organization.brand.update",
    entityType: "organization_settings",
    entityId: existing?.id,
    metadata: { brandPrimaryColor: parsed.data.brandPrimaryColor },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateOrganizationPlanAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await requireOrgSession("organization:billing");
  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const candidate = parsed.data.planId as PlanId;
  if (!PLANS[candidate]) {
    return { ok: false, error: "Neveljaven plan." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = normalizeNow();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(schema.organization)
    .set({ planId: candidate, updatedAt: now })
    .where(eq(schema.organization.id, orgId));

  const [existingSub] = await db
    .select({ id: schema.subscription.id })
    .from(schema.subscription)
    .where(eq(schema.subscription.organizationId, orgId))
    .limit(1);

  if (!existingSub) {
    await db.insert(schema.subscription).values({
      id: randomUUID(),
      organizationId: orgId,
      planId: candidate,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(schema.subscription)
      .set({
        planId: candidate,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(schema.subscription.organizationId, orgId));
  }

  // Keep entitlements consistent with plan (used by some UI in future phases).
  await db.delete(schema.moduleEntitlement).where(eq(schema.moduleEntitlement.organizationId, orgId));
  for (const moduleId of PLANS[candidate].limits.modules) {
    await db.insert(schema.moduleEntitlement).values({
      id: randomUUID(),
      organizationId: orgId,
      moduleId,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "organization.plan.update",
    entityType: "organization",
    entityId: orgId,
    metadata: { planId: candidate },
  });

  revalidatePath("/settings");
  return { ok: true };
}

