"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  calculateCctvProject,
  cctvProjectInputSchema,
  emptyToNull,
  type CctvCalculationResult,
  type CctvProjectInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

export type CctvProjectRow = {
  id: string;
  organizationId: string;
  customerId: string | null;
  siteId: string | null;
  name: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  retentionDays: number;
  reservePercent: number;
  raidFactor: number;
  spareCapacityTb: number;
  useBinaryTb: boolean;
  growthPercent: number;
  diskSizeTb: number;
  clientsCount: number;
  clientBitrateMbps: number;
  maxRecorderBandwidthMbps: number;
  maxPortsPerRecorder: number;
  poeBudgetWatts: number;
  wattsPerCamera: number;
  upsCapacityWh: number;
  systemLoadWatts: number;
  groupsJson: string;
  resultJson: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CctvProjectListItem = {
  project: CctvProjectRow;
  customerName: string | null;
  siteName: string | null;
};

function toStored(input: CctvProjectInput) {
  const result = calculateCctvProject(input.globals, input.groups);
  return {
    name: input.name.trim(),
    description: emptyToNull(input.description),
    customerId: emptyToNull(input.customerId),
    siteId: emptyToNull(input.siteId),
    status: input.status,
    ...input.globals,
    groupsJson: JSON.stringify(input.groups),
    resultJson: JSON.stringify(result),
  };
}

export async function listCctvProjects(search?: string): Promise<CctvProjectListItem[]> {
  const session = await requireOrgSession("projects:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [eq(schema.cctvProject.organizationId, orgId), isNull(schema.cctvProject.deletedAt)];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(or(like(schema.cctvProject.name, q), like(schema.cctvProject.description, q))!);
  }

  return (await db
    .select({
      project: schema.cctvProject,
      customerName: schema.customer.name,
      siteName: schema.site.name,
    })
    .from(schema.cctvProject)
    .leftJoin(schema.customer, eq(schema.cctvProject.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.cctvProject.siteId, schema.site.id))
    .where(and(...conditions))
    .orderBy(desc(schema.cctvProject.updatedAt))) as CctvProjectListItem[];
}

export async function getCctvProject(id: string): Promise<{
  project: CctvProjectRow;
  customerName: string | null;
  siteName: string | null;
  input: CctvProjectInput;
  result: CctvCalculationResult;
  scenarios: Array<{
    id: string;
    name: string;
    retentionDays: number;
    reservePercent: number;
    notes: string | null;
    result: CctvCalculationResult | null;
  }>;
} | null> {
  const session = await requireOrgSession("projects:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [row] = (await db
    .select({
      project: schema.cctvProject,
      customerName: schema.customer.name,
      siteName: schema.site.name,
    })
    .from(schema.cctvProject)
    .leftJoin(schema.customer, eq(schema.cctvProject.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.cctvProject.siteId, schema.site.id))
    .where(
      and(
        eq(schema.cctvProject.id, id),
        eq(schema.cctvProject.organizationId, orgId),
        isNull(schema.cctvProject.deletedAt),
      ),
    )
    .limit(1)) as Array<{ project: CctvProjectRow; customerName: string | null; siteName: string | null }>;

  if (!row) return null;

  const p = row.project;
  const groups = JSON.parse(p.groupsJson) as CctvProjectInput["groups"];
  const input: CctvProjectInput = {
    name: p.name,
    description: p.description ?? "",
    customerId: p.customerId ?? "",
    siteId: p.siteId ?? "",
    status: p.status,
    globals: {
      retentionDays: p.retentionDays,
      reservePercent: p.reservePercent,
      raidFactor: p.raidFactor,
      spareCapacityTb: p.spareCapacityTb,
      useBinaryTb: p.useBinaryTb,
      growthPercent: p.growthPercent,
      diskSizeTb: p.diskSizeTb,
      clientsCount: p.clientsCount,
      clientBitrateMbps: p.clientBitrateMbps,
      maxRecorderBandwidthMbps: p.maxRecorderBandwidthMbps,
      maxPortsPerRecorder: p.maxPortsPerRecorder,
      poeBudgetWatts: p.poeBudgetWatts,
      wattsPerCamera: p.wattsPerCamera,
      upsCapacityWh: p.upsCapacityWh,
      systemLoadWatts: p.systemLoadWatts,
    },
    groups,
  };
  const result = p.resultJson
    ? (JSON.parse(p.resultJson) as CctvCalculationResult)
    : calculateCctvProject(input.globals, input.groups);

  const scenarioRows = await db
    .select()
    .from(schema.cctvScenario)
    .where(and(eq(schema.cctvScenario.projectId, id), eq(schema.cctvScenario.organizationId, orgId)))
    .orderBy(desc(schema.cctvScenario.createdAt));

  return {
    ...row,
    input,
    result,
    scenarios: scenarioRows.map(
      (s: {
        id: string;
        name: string;
        retentionDays: number;
        reservePercent: number;
        notes: string | null;
        resultJson: string | null;
      }) => ({
        id: s.id,
        name: s.name,
        retentionDays: s.retentionDays,
        reservePercent: s.reservePercent,
        notes: s.notes,
        result: s.resultJson ? (JSON.parse(s.resultJson) as CctvCalculationResult) : null,
      }),
    ),
  };
}

export async function createCctvProject(raw: CctvProjectInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("projects:write");
  const parsed = cctvProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const id = randomUUID();
  const now = new Date();
  const stored = toStored(parsed.data);

  await db.insert(schema.cctvProject).values({
    id,
    organizationId: session.organization.id,
    ...stored,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: session.organization.id,
    actorUserId: session.user.id,
    action: "cctv_project.create",
    entityType: "cctv_project",
    entityId: id,
  });

  revalidatePath("/projects");
  return { ok: true, data: { id } };
}

export async function updateCctvProject(
  id: string,
  raw: CctvProjectInput,
): Promise<ActionResult> {
  const session = await requireOrgSession("projects:write");
  const parsed = cctvProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const [existing] = await db
    .select()
    .from(schema.cctvProject)
    .where(
      and(eq(schema.cctvProject.id, id), eq(schema.cctvProject.organizationId, orgId), isNull(schema.cctvProject.deletedAt)),
    )
    .limit(1);
  if (!existing) return { ok: false, error: "Projekt ni najden." };

  await db
    .update(schema.cctvProject)
    .set({ ...toStored(parsed.data), updatedAt: new Date() })
    .where(and(eq(schema.cctvProject.id, id), eq(schema.cctvProject.organizationId, orgId)));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "cctv_project.update",
    entityType: "cctv_project",
    entityId: id,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}

export async function deleteCctvProject(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("projects:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  await db
    .update(schema.cctvProject)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.cctvProject.id, id), eq(schema.cctvProject.organizationId, orgId)));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "cctv_project.delete",
    entityType: "cctv_project",
    entityId: id,
  });
  revalidatePath("/projects");
  return { ok: true };
}

export async function saveCctvScenario(input: {
  projectId: string;
  name: string;
  retentionDays: number;
  reservePercent: number;
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("projects:write");
  const data = await getCctvProject(input.projectId);
  if (!data) return { ok: false, error: "Projekt ni najden." };

  const globals = {
    ...data.input.globals,
    retentionDays: input.retentionDays,
    reservePercent: input.reservePercent,
  };
  const result = calculateCctvProject(globals, data.input.groups);
  const id = randomUUID();
  const { db, schema } = getDb();

  await db.insert(schema.cctvScenario).values({
    id,
    organizationId: session.organization.id,
    projectId: input.projectId,
    name: input.name.trim(),
    retentionDays: input.retentionDays,
    reservePercent: input.reservePercent,
    notes: emptyToNull(input.notes),
    resultJson: JSON.stringify(result),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath(`/projects/${input.projectId}`);
  return { ok: true, data: { id } };
}

export async function previewCctvCalculation(
  raw: CctvProjectInput,
): Promise<ActionResult<CctvCalculationResult>> {
  await requireOrgSession("projects:read");
  const parsed = cctvProjectInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }
  return { ok: true, data: calculateCctvProject(parsed.data.globals, parsed.data.groups) };
}
