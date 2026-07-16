"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  customerInputSchema,
  emptyToNull,
  PLANS,
  type CustomerInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { refreshDashboardStats, writeAuditLog } from "@/server/audit";
import type { Customer, CustomerContact, Site } from "@/server/types";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function normalizeCustomer(input: CustomerInput) {
  return {
    name: input.name.trim(),
    taxId: emptyToNull(input.taxId),
    addressLine1: emptyToNull(input.addressLine1),
    addressLine2: emptyToNull(input.addressLine2),
    city: emptyToNull(input.city),
    postalCode: emptyToNull(input.postalCode),
    country: emptyToNull(input.country) ?? "SI",
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    notes: emptyToNull(input.notes),
    serviceContract: emptyToNull(input.serviceContract),
    status: input.status,
    collaborationStartedAt: input.collaborationStartedAt
      ? new Date(input.collaborationStartedAt)
      : null,
  };
}

export async function listCustomers(search?: string): Promise<Customer[]> {
  const session = await requireOrgSession("customers:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [eq(schema.customer.organizationId, orgId), isNull(schema.customer.deletedAt)];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(
        like(schema.customer.name, q),
        like(schema.customer.taxId, q),
        like(schema.customer.email, q),
        like(schema.customer.city, q),
      )!,
    );
  }
  return (await db
    .select()
    .from(schema.customer)
    .where(and(...conditions))
    .orderBy(desc(schema.customer.createdAt))) as Customer[];
}

export async function getCustomer(id: string): Promise<{
  customer: Customer;
  contacts: CustomerContact[];
  sites: Site[];
} | null> {
  const session = await requireOrgSession("customers:read");
  const { db, schema } = getDb();
  const [row] = (await db
    .select()
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, id),
        eq(schema.customer.organizationId, session.organization.id),
        isNull(schema.customer.deletedAt),
      ),
    )
    .limit(1)) as Customer[];
  if (!row) return null;

  const contacts = (await db
    .select()
    .from(schema.customerContact)
    .where(
      and(
        eq(schema.customerContact.customerId, id),
        eq(schema.customerContact.organizationId, session.organization.id),
      ),
    )) as CustomerContact[];

  const sites = (await db
    .select()
    .from(schema.site)
    .where(
      and(
        eq(schema.site.customerId, id),
        eq(schema.site.organizationId, session.organization.id),
        isNull(schema.site.deletedAt),
      ),
    )) as Site[];

  return { customer: row, contacts, sites };
}

export async function createCustomer(raw: CustomerInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("customers:write");
  const parsed = customerInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const plan = PLANS[session.organization.planId];
  if (plan.limits.maxCustomers !== null) {
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.customer)
      .where(and(eq(schema.customer.organizationId, orgId), isNull(schema.customer.deletedAt)));
    if (Number(countRow?.count ?? 0) >= plan.limits.maxCustomers) {
      return {
        ok: false,
        error: `Dosegli ste omejitev paketa (${plan.limits.maxCustomers} strank).`,
      };
    }
  }

  const id = randomUUID();
  const now = new Date();
  const data = normalizeCustomer(parsed.data);

  await db.insert(schema.customer).values({
    id,
    organizationId: orgId,
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  if (parsed.data.primaryContactName?.trim()) {
    await db.insert(schema.customerContact).values({
      id: randomUUID(),
      organizationId: orgId,
      customerId: id,
      name: parsed.data.primaryContactName.trim(),
      email: emptyToNull(parsed.data.primaryContactEmail),
      phone: emptyToNull(parsed.data.primaryContactPhone),
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "customer.create",
    entityType: "customer",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true, data: { id } };
}

export async function updateCustomer(
  id: string,
  raw: CustomerInput,
): Promise<ActionResult> {
  const session = await requireOrgSession("customers:write");
  const parsed = customerInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [existing] = await db
    .select()
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, id),
        eq(schema.customer.organizationId, orgId),
        isNull(schema.customer.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) return { ok: false, error: "Stranka ni najdena." };

  await db
    .update(schema.customer)
    .set({ ...normalizeCustomer(parsed.data), updatedAt: new Date() })
    .where(and(eq(schema.customer.id, id), eq(schema.customer.organizationId, orgId)));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "customer.update",
    entityType: "customer",
    entityId: id,
  });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("customers:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [existing] = await db
    .select()
    .from(schema.customer)
    .where(and(eq(schema.customer.id, id), eq(schema.customer.organizationId, orgId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Stranka ni najdena." };

  await db
    .update(schema.customer)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.customer.id, id), eq(schema.customer.organizationId, orgId)));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "customer.delete",
    entityType: "customer",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}
