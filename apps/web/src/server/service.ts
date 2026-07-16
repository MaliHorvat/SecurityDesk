"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  emptyToNull,
  parseOptionalDate,
  serviceReportInputSchema,
  serviceTicketInputSchema,
  workOrderInputSchema,
  type ServiceReportInput,
  type ServiceTicketInput,
  type WorkOrderInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { refreshDashboardStats, writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";
import type { serviceReport, serviceTicket, workOrder } from "@securitydesk/database";

export type ServiceTicketRow = typeof serviceTicket.$inferSelect;
export type WorkOrderRow = typeof workOrder.$inferSelect;
export type ServiceReportRow = typeof serviceReport.$inferSelect;

export type ServiceTicketListItem = {
  ticket: ServiceTicketRow;
  customerName: string | null;
  siteName: string | null;
  deviceName: string | null;
};

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export async function listServiceTickets(search?: string): Promise<ServiceTicketListItem[]> {
  const session = await requireOrgSession("service:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [
    eq(schema.serviceTicket.organizationId, orgId),
    isNull(schema.serviceTicket.deletedAt),
  ];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(like(schema.serviceTicket.title, q), like(schema.serviceTicket.description, q))!,
    );
  }

  return (await db
    .select({
      ticket: schema.serviceTicket,
      customerName: schema.customer.name,
      siteName: schema.site.name,
      deviceName: schema.device.name,
    })
    .from(schema.serviceTicket)
    .leftJoin(schema.customer, eq(schema.serviceTicket.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.serviceTicket.siteId, schema.site.id))
    .leftJoin(schema.device, eq(schema.serviceTicket.deviceId, schema.device.id))
    .where(and(...conditions))
    .orderBy(desc(schema.serviceTicket.updatedAt))) as ServiceTicketListItem[];
}

export async function getServiceTicket(id: string) {
  const session = await requireOrgSession("service:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [row] = await db
    .select({
      ticket: schema.serviceTicket,
      customerName: schema.customer.name,
      siteName: schema.site.name,
      deviceName: schema.device.name,
    })
    .from(schema.serviceTicket)
    .leftJoin(schema.customer, eq(schema.serviceTicket.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.serviceTicket.siteId, schema.site.id))
    .leftJoin(schema.device, eq(schema.serviceTicket.deviceId, schema.device.id))
    .where(
      and(
        eq(schema.serviceTicket.id, id),
        eq(schema.serviceTicket.organizationId, orgId),
        isNull(schema.serviceTicket.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  const workOrders = (await db
    .select()
    .from(schema.workOrder)
    .where(and(eq(schema.workOrder.ticketId, id), eq(schema.workOrder.organizationId, orgId)))
    .orderBy(desc(schema.workOrder.createdAt))) as WorkOrderRow[];

  const reports = (await db
    .select()
    .from(schema.serviceReport)
    .where(and(eq(schema.serviceReport.ticketId, id), eq(schema.serviceReport.organizationId, orgId)))
    .orderBy(desc(schema.serviceReport.createdAt))) as ServiceReportRow[];

  return {
    ticket: row.ticket as ServiceTicketRow,
    customerName: row.customerName as string | null,
    siteName: row.siteName as string | null,
    deviceName: row.deviceName as string | null,
    workOrders: workOrders.map((wo) => ({
      ...wo,
      materials: parseJsonArray(wo.materialsJson, [] as WorkOrderInput["materials"]),
      photos: parseJsonArray(wo.photosJson, [] as WorkOrderInput["photos"]),
    })),
    reports: reports.map((r) => ({
      ...r,
      materials: parseJsonArray(r.materialsJson, [] as ServiceReportInput["materials"]),
      photos: parseJsonArray(r.photosJson, [] as ServiceReportInput["photos"]),
    })),
  };
}

export async function createServiceTicket(
  input: ServiceTicketInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("service:write");
  const parsed = serviceTicketInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;
  const id = randomUUID();
  const now = new Date();

  await db.insert(schema.serviceTicket).values({
    id,
    organizationId: orgId,
    customerId: data.customerId,
    siteId: emptyToNull(data.siteId),
    deviceId: emptyToNull(data.deviceId),
    createdByUserId: session.user.id,
    title: data.title.trim(),
    description: emptyToNull(data.description),
    category: data.category,
    priority: data.priority,
    status: data.status,
    preferredAt: parseOptionalDate(data.preferredAt),
    attachmentNotes: emptyToNull(data.attachmentNotes),
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "service_ticket.create",
    entityType: "service_ticket",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/service");
  return { ok: true, data: { id } };
}

export async function updateServiceTicket(
  id: string,
  input: ServiceTicketInput,
): Promise<ActionResult> {
  const session = await requireOrgSession("service:write");
  const parsed = serviceTicketInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(schema.serviceTicket)
    .where(
      and(
        eq(schema.serviceTicket.id, id),
        eq(schema.serviceTicket.organizationId, orgId),
        isNull(schema.serviceTicket.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return { ok: false, error: "Zahtevek ni bil najden." };

  await db
    .update(schema.serviceTicket)
    .set({
      customerId: data.customerId,
      siteId: emptyToNull(data.siteId),
      deviceId: emptyToNull(data.deviceId),
      title: data.title.trim(),
      description: emptyToNull(data.description),
      category: data.category,
      priority: data.priority,
      status: data.status,
      preferredAt: parseOptionalDate(data.preferredAt),
      attachmentNotes: emptyToNull(data.attachmentNotes),
      updatedAt: new Date(),
    })
    .where(eq(schema.serviceTicket.id, id));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "service_ticket.update",
    entityType: "service_ticket",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/service");
  revalidatePath(`/service/${id}`);
  return { ok: true };
}

export async function deleteServiceTicket(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("service:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  await db
    .update(schema.serviceTicket)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(schema.serviceTicket.id, id), eq(schema.serviceTicket.organizationId, orgId)),
    );

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "service_ticket.delete",
    entityType: "service_ticket",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath("/service");
  return { ok: true };
}

export async function createWorkOrder(input: WorkOrderInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("service:write");
  const parsed = workOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [ticket] = await db
    .select()
    .from(schema.serviceTicket)
    .where(
      and(
        eq(schema.serviceTicket.id, data.ticketId),
        eq(schema.serviceTicket.organizationId, orgId),
        isNull(schema.serviceTicket.deletedAt),
      ),
    )
    .limit(1);
  if (!ticket) return { ok: false, error: "Zahtevek ni bil najden." };

  const id = randomUUID();
  const now = new Date();
  const techName = emptyToNull(data.technicianSignatureName);
  const custName = emptyToNull(data.customerSignatureName);

  await db.insert(schema.workOrder).values({
    id,
    organizationId: orgId,
    ticketId: data.ticketId,
    assignedToName: emptyToNull(data.assignedToName) ?? session.user.name,
    status: data.status,
    scheduledAt: parseOptionalDate(data.scheduledAt),
    arrivedAt: parseOptionalDate(data.arrivedAt),
    departedAt: parseOptionalDate(data.departedAt),
    travelCost: data.travelCost,
    workDone: emptyToNull(data.workDone),
    measurements: emptyToNull(data.measurements),
    findings: emptyToNull(data.findings),
    recommendations: emptyToNull(data.recommendations),
    materialsJson: JSON.stringify(data.materials),
    photosJson: JSON.stringify(data.photos),
    technicianSignatureName: techName,
    technicianSignedAt: techName ? now : null,
    technicianSignatureData: emptyToNull(data.technicianSignatureData),
    customerSignatureName: custName,
    customerSignedAt: custName ? now : null,
    customerSignatureData: emptyToNull(data.customerSignatureData),
    createdAt: now,
    updatedAt: now,
  });

  if (ticket.status === "open") {
    await db
      .update(schema.serviceTicket)
      .set({ status: "in_progress", updatedAt: now })
      .where(eq(schema.serviceTicket.id, ticket.id));
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "work_order.create",
    entityType: "work_order",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath(`/service/${data.ticketId}`);
  return { ok: true, data: { id } };
}

export async function updateWorkOrder(
  id: string,
  input: Omit<WorkOrderInput, "ticketId">,
): Promise<ActionResult> {
  const session = await requireOrgSession("service:write");
  const parsed = workOrderInputSchema.omit({ ticketId: true }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(schema.workOrder)
    .where(and(eq(schema.workOrder.id, id), eq(schema.workOrder.organizationId, orgId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Delovni nalog ni bil najden." };

  const now = new Date();
  const techName = emptyToNull(data.technicianSignatureName);
  const custName = emptyToNull(data.customerSignatureName);

  await db
    .update(schema.workOrder)
    .set({
      assignedToName: emptyToNull(data.assignedToName),
      status: data.status,
      scheduledAt: parseOptionalDate(data.scheduledAt),
      arrivedAt: parseOptionalDate(data.arrivedAt),
      departedAt: parseOptionalDate(data.departedAt),
      travelCost: data.travelCost,
      workDone: emptyToNull(data.workDone),
      measurements: emptyToNull(data.measurements),
      findings: emptyToNull(data.findings),
      recommendations: emptyToNull(data.recommendations),
      materialsJson: JSON.stringify(data.materials),
      photosJson: JSON.stringify(data.photos),
      technicianSignatureName: techName,
      technicianSignedAt: techName
        ? existing.technicianSignedAt ?? now
        : null,
      technicianSignatureData: emptyToNull(data.technicianSignatureData),
      customerSignatureName: custName,
      customerSignedAt: custName ? existing.customerSignedAt ?? now : null,
      customerSignatureData: emptyToNull(data.customerSignatureData),
      updatedAt: now,
    })
    .where(eq(schema.workOrder.id, id));

  if (data.status === "completed") {
    await db
      .update(schema.serviceTicket)
      .set({ status: "resolved", updatedAt: now })
      .where(
        and(
          eq(schema.serviceTicket.id, existing.ticketId),
          eq(schema.serviceTicket.organizationId, orgId),
        ),
      );
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "work_order.update",
    entityType: "work_order",
    entityId: id,
  });
  await refreshDashboardStats(orgId);
  revalidatePath(`/service/${existing.ticketId}`);
  return { ok: true };
}

export async function createServiceReport(
  input: ServiceReportInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("service:write");
  const parsed = serviceReportInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [ticket] = await db
    .select()
    .from(schema.serviceTicket)
    .where(
      and(
        eq(schema.serviceTicket.id, data.ticketId),
        eq(schema.serviceTicket.organizationId, orgId),
        isNull(schema.serviceTicket.deletedAt),
      ),
    )
    .limit(1);
  if (!ticket) return { ok: false, error: "Zahtevek ni bil najden." };

  const id = randomUUID();
  const now = new Date();
  const isFinal = data.status === "final";

  await db.insert(schema.serviceReport).values({
    id,
    organizationId: orgId,
    ticketId: data.ticketId,
    workOrderId: emptyToNull(data.workOrderId),
    title: data.title.trim(),
    faultDescription: emptyToNull(data.faultDescription),
    workPerformed: emptyToNull(data.workPerformed),
    findings: emptyToNull(data.findings),
    recommendations: emptyToNull(data.recommendations),
    customerSummary: emptyToNull(data.customerSummary),
    materialsJson: JSON.stringify(data.materials),
    photosJson: JSON.stringify(data.photos),
    technicianName: emptyToNull(data.technicianName) ?? session.user.name,
    status: data.status,
    finalizedAt: isFinal ? now : null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "service_report.create",
    entityType: "service_report",
    entityId: id,
  });
  revalidatePath(`/service/${data.ticketId}`);
  return { ok: true, data: { id } };
}

export async function finalizeServiceReport(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("service:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [existing] = await db
    .select()
    .from(schema.serviceReport)
    .where(and(eq(schema.serviceReport.id, id), eq(schema.serviceReport.organizationId, orgId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Zapisnik ni bil najden." };
  if (existing.status === "final") {
    return { ok: false, error: "Zapisnik je že potrjen. Za popravek ustvarite novo različico." };
  }

  await db
    .update(schema.serviceReport)
    .set({ status: "final", finalizedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.serviceReport.id, id));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "service_report.finalize",
    entityType: "service_report",
    entityId: id,
  });
  revalidatePath(`/service/${existing.ticketId}`);
  return { ok: true };
}

export async function createReportVersionFromFinal(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("service:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [existing] = await db
    .select()
    .from(schema.serviceReport)
    .where(and(eq(schema.serviceReport.id, id), eq(schema.serviceReport.organizationId, orgId)))
    .limit(1);
  if (!existing) return { ok: false, error: "Zapisnik ni bil najden." };

  const newId = randomUUID();
  const now = new Date();
  await db.insert(schema.serviceReport).values({
    ...existing,
    id: newId,
    status: "draft",
    finalizedAt: null,
    version: existing.version + 1,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath(`/service/${existing.ticketId}`);
  return { ok: true, data: { id: newId } };
}

/** Count open tickets for dashboard (also used by refreshDashboardStats). */
export async function countOpenTickets(organizationId: string): Promise<number> {
  const { db, schema } = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.serviceTicket)
    .where(
      and(
        eq(schema.serviceTicket.organizationId, organizationId),
        isNull(schema.serviceTicket.deletedAt),
        inArray(schema.serviceTicket.status, ["open", "in_progress", "waiting_customer"]),
      ),
    );
  return Number(row?.count ?? 0);
}
