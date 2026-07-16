"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  DEFAULT_HANDOVER_CHECKLIST,
  emptyToNull,
  handoverDocumentInputSchema,
  handoverPackageInputSchema,
  handoverSignatureInputSchema,
  type HandoverDocumentInput,
  type HandoverPackageInput,
  type HandoverSignatureInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";
import type {
  handoverChecklistItem,
  handoverDocument,
  handoverPackage,
  handoverSignature,
} from "@securitydesk/database";

export type HandoverPackageRow = typeof handoverPackage.$inferSelect;
export type HandoverChecklistRow = typeof handoverChecklistItem.$inferSelect;
export type HandoverDocumentRow = typeof handoverDocument.$inferSelect;
export type HandoverSignatureRow = typeof handoverSignature.$inferSelect;

export type HandoverListItem = {
  package: HandoverPackageRow;
  customerName: string | null;
  siteName: string | null;
};

async function seedChecklist(organizationId: string, packageId: string) {
  const { db, schema } = getDb();
  const now = new Date();
  await db.insert(schema.handoverChecklistItem).values(
    DEFAULT_HANDOVER_CHECKLIST.map((item, index) => ({
      id: randomUUID(),
      organizationId,
      packageId,
      itemKey: item.key,
      label: item.label,
      checked: false,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function listHandoverPackages(search?: string): Promise<HandoverListItem[]> {
  const session = await requireOrgSession("handover:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const conditions = [
    eq(schema.handoverPackage.organizationId, orgId),
    isNull(schema.handoverPackage.deletedAt),
  ];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    conditions.push(
      or(like(schema.handoverPackage.title, q), like(schema.handoverPackage.description, q))!,
    );
  }

  return (await db
    .select({
      package: schema.handoverPackage,
      customerName: schema.customer.name,
      siteName: schema.site.name,
    })
    .from(schema.handoverPackage)
    .leftJoin(schema.customer, eq(schema.handoverPackage.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.handoverPackage.siteId, schema.site.id))
    .where(and(...conditions))
    .orderBy(desc(schema.handoverPackage.updatedAt))) as HandoverListItem[];
}

export async function getHandoverPackage(id: string) {
  const session = await requireOrgSession("handover:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [row] = await db
    .select({
      package: schema.handoverPackage,
      customerName: schema.customer.name,
      siteName: schema.site.name,
    })
    .from(schema.handoverPackage)
    .leftJoin(schema.customer, eq(schema.handoverPackage.customerId, schema.customer.id))
    .leftJoin(schema.site, eq(schema.handoverPackage.siteId, schema.site.id))
    .where(
      and(
        eq(schema.handoverPackage.id, id),
        eq(schema.handoverPackage.organizationId, orgId),
        isNull(schema.handoverPackage.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  const checklist = (await db
    .select()
    .from(schema.handoverChecklistItem)
    .where(
      and(
        eq(schema.handoverChecklistItem.packageId, id),
        eq(schema.handoverChecklistItem.organizationId, orgId),
      ),
    )
    .orderBy(schema.handoverChecklistItem.sortOrder)) as HandoverChecklistRow[];

  const documents = (await db
    .select()
    .from(schema.handoverDocument)
    .where(
      and(
        eq(schema.handoverDocument.packageId, id),
        eq(schema.handoverDocument.organizationId, orgId),
      ),
    )
    .orderBy(desc(schema.handoverDocument.createdAt))) as HandoverDocumentRow[];

  const signatures = (await db
    .select()
    .from(schema.handoverSignature)
    .where(
      and(
        eq(schema.handoverSignature.packageId, id),
        eq(schema.handoverSignature.organizationId, orgId),
      ),
    )
    .orderBy(desc(schema.handoverSignature.signedAt))) as HandoverSignatureRow[];

  return {
    package: row.package as HandoverPackageRow,
    customerName: row.customerName as string | null,
    siteName: row.siteName as string | null,
    checklist,
    documents,
    signatures,
  };
}

export async function createHandoverPackage(
  input: HandoverPackageInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("handover:write");
  const parsed = handoverPackageInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;
  const id = randomUUID();
  const now = new Date();

  await db.insert(schema.handoverPackage).values({
    id,
    organizationId: orgId,
    customerId: data.customerId,
    siteId: emptyToNull(data.siteId),
    title: data.title.trim(),
    description: emptyToNull(data.description),
    status: data.status,
    retentionNotes: emptyToNull(data.retentionNotes),
    serviceContacts: emptyToNull(data.serviceContacts),
    deviceSummary: emptyToNull(data.deviceSummary),
    ipTable: emptyToNull(data.ipTable),
    notes: emptyToNull(data.notes),
    publicToken: randomBytes(24).toString("hex"),
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  await seedChecklist(orgId, id);

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "handover.create",
    entityType: "handover_package",
    entityId: id,
  });
  revalidatePath("/handover");
  return { ok: true, data: { id } };
}

export async function updateHandoverPackage(
  id: string,
  input: HandoverPackageInput,
): Promise<ActionResult> {
  const session = await requireOrgSession("handover:write");
  const parsed = handoverPackageInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(schema.handoverPackage)
    .where(
      and(
        eq(schema.handoverPackage.id, id),
        eq(schema.handoverPackage.organizationId, orgId),
        isNull(schema.handoverPackage.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) return { ok: false, error: "Predajni paket ni bil najden." };
  if (existing.status === "accepted") {
    return {
      ok: false,
      error: "Sprejeti paket ni mogoče spreminjati. Ustvarite novo različico.",
    };
  }

  await db
    .update(schema.handoverPackage)
    .set({
      customerId: data.customerId,
      siteId: emptyToNull(data.siteId),
      title: data.title.trim(),
      description: emptyToNull(data.description),
      status: data.status,
      retentionNotes: emptyToNull(data.retentionNotes),
      serviceContacts: emptyToNull(data.serviceContacts),
      deviceSummary: emptyToNull(data.deviceSummary),
      ipTable: emptyToNull(data.ipTable),
      notes: emptyToNull(data.notes),
      updatedAt: new Date(),
    })
    .where(eq(schema.handoverPackage.id, id));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "handover.update",
    entityType: "handover_package",
    entityId: id,
  });
  revalidatePath("/handover");
  revalidatePath(`/handover/${id}`);
  return { ok: true };
}

export async function deleteHandoverPackage(id: string): Promise<ActionResult> {
  const session = await requireOrgSession("handover:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  await db
    .update(schema.handoverPackage)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(schema.handoverPackage.id, id), eq(schema.handoverPackage.organizationId, orgId)),
    );

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "handover.delete",
    entityType: "handover_package",
    entityId: id,
  });
  revalidatePath("/handover");
  return { ok: true };
}

export async function toggleHandoverChecklistItem(
  itemId: string,
  checked: boolean,
): Promise<ActionResult> {
  const session = await requireOrgSession("handover:write");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [item] = await db
    .select()
    .from(schema.handoverChecklistItem)
    .where(
      and(
        eq(schema.handoverChecklistItem.id, itemId),
        eq(schema.handoverChecklistItem.organizationId, orgId),
      ),
    )
    .limit(1);
  if (!item) return { ok: false, error: "Postavka ni bila najdena." };

  const [pkg] = await db
    .select()
    .from(schema.handoverPackage)
    .where(eq(schema.handoverPackage.id, item.packageId))
    .limit(1);
  if (pkg?.status === "accepted") {
    return { ok: false, error: "Sprejeti paket ni mogoče spreminjati." };
  }

  await db
    .update(schema.handoverChecklistItem)
    .set({
      checked,
      checkedAt: checked ? new Date() : null,
      checkedByName: checked ? session.user.name : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.handoverChecklistItem.id, itemId));

  revalidatePath(`/handover/${item.packageId}`);
  return { ok: true };
}

export async function addHandoverDocument(
  input: HandoverDocumentInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("handover:write");
  const parsed = handoverDocumentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [pkg] = await db
    .select()
    .from(schema.handoverPackage)
    .where(
      and(
        eq(schema.handoverPackage.id, data.packageId),
        eq(schema.handoverPackage.organizationId, orgId),
        isNull(schema.handoverPackage.deletedAt),
      ),
    )
    .limit(1);
  if (!pkg) return { ok: false, error: "Predajni paket ni bil najden." };
  if (pkg.status === "accepted") {
    return { ok: false, error: "Sprejeti paket ni mogoče spreminjati." };
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(schema.handoverDocument).values({
    id,
    organizationId: orgId,
    packageId: data.packageId,
    title: data.title.trim(),
    docType: data.docType,
    content: emptyToNull(data.content),
    url: emptyToNull(data.url),
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath(`/handover/${data.packageId}`);
  return { ok: true, data: { id } };
}

export async function signHandoverPackage(
  input: HandoverSignatureInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("handover:write");
  const parsed = handoverSignatureInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const data = parsed.data;

  const [pkg] = await db
    .select()
    .from(schema.handoverPackage)
    .where(
      and(
        eq(schema.handoverPackage.id, data.packageId),
        eq(schema.handoverPackage.organizationId, orgId),
        isNull(schema.handoverPackage.deletedAt),
      ),
    )
    .limit(1);
  if (!pkg) return { ok: false, error: "Predajni paket ni bil najden." };
  if (pkg.status === "accepted") {
    return { ok: false, error: "Paket je že sprejet." };
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(schema.handoverSignature).values({
    id,
    organizationId: orgId,
    packageId: data.packageId,
    role: data.role,
    signerName: data.signerName.trim(),
    signedAt: now,
    signatureData: emptyToNull(data.signatureData),
    createdAt: now,
  });

  const signatures = await db
    .select()
    .from(schema.handoverSignature)
    .where(eq(schema.handoverSignature.packageId, data.packageId));

  const hasContractor =
    (signatures as HandoverSignatureRow[]).some((s) => s.role === "contractor") ||
    data.role === "contractor";
  const hasCustomer =
    (signatures as HandoverSignatureRow[]).some((s) => s.role === "customer") ||
    data.role === "customer";

  if (hasContractor && hasCustomer) {
    await db
      .update(schema.handoverPackage)
      .set({ status: "accepted", acceptedAt: now, updatedAt: now })
      .where(eq(schema.handoverPackage.id, data.packageId));
  } else if (pkg.status === "draft" || pkg.status === "ready") {
    await db
      .update(schema.handoverPackage)
      .set({ status: "sent", updatedAt: now })
      .where(eq(schema.handoverPackage.id, data.packageId));
  }

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "handover.sign",
    entityType: "handover_package",
    entityId: data.packageId,
    metadata: { role: data.role, signerName: data.signerName },
  });
  revalidatePath(`/handover/${data.packageId}`);
  return { ok: true, data: { id } };
}

export async function createHandoverVersion(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("handover:write");
  const detail = await getHandoverPackage(id);
  if (!detail) return { ok: false, error: "Predajni paket ni bil najden." };

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const newId = randomUUID();
  const now = new Date();
  const pkg = detail.package;

  await db.insert(schema.handoverPackage).values({
    ...pkg,
    id: newId,
    status: "draft",
    acceptedAt: null,
    publicToken: randomBytes(24).toString("hex"),
    version: pkg.version + 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  await seedChecklist(orgId, newId);

  for (const doc of detail.documents) {
    await db.insert(schema.handoverDocument).values({
      ...doc,
      id: randomUUID(),
      packageId: newId,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (pkg.status === "accepted") {
    await db
      .update(schema.handoverPackage)
      .set({ status: "superseded", updatedAt: now })
      .where(eq(schema.handoverPackage.id, id));
  }

  revalidatePath("/handover");
  return { ok: true, data: { id: newId } };
}

/** Public (token) lookup — no auth; for customer acceptance portal. */
export async function getHandoverByPublicToken(token: string) {
  const { db, schema } = getDb();
  const [pkg] = await db
    .select()
    .from(schema.handoverPackage)
    .where(
      and(
        eq(schema.handoverPackage.publicToken, token),
        isNull(schema.handoverPackage.deletedAt),
      ),
    )
    .limit(1);
  if (!pkg) return null;

  const [customer] = await db
    .select()
    .from(schema.customer)
    .where(eq(schema.customer.id, pkg.customerId))
    .limit(1);

  const checklist = await db
    .select()
    .from(schema.handoverChecklistItem)
    .where(eq(schema.handoverChecklistItem.packageId, pkg.id))
    .orderBy(schema.handoverChecklistItem.sortOrder);

  const documents = await db
    .select({
      id: schema.handoverDocument.id,
      title: schema.handoverDocument.title,
      docType: schema.handoverDocument.docType,
      content: schema.handoverDocument.content,
      url: schema.handoverDocument.url,
    })
    .from(schema.handoverDocument)
    .where(eq(schema.handoverDocument.packageId, pkg.id));

  const signatures = await db
    .select()
    .from(schema.handoverSignature)
    .where(eq(schema.handoverSignature.packageId, pkg.id));

  return {
    package: {
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      status: pkg.status,
      retentionNotes: pkg.retentionNotes,
      serviceContacts: pkg.serviceContacts,
      deviceSummary: pkg.deviceSummary,
      ipTable: pkg.ipTable,
      notes: pkg.notes,
      version: pkg.version,
      acceptedAt: pkg.acceptedAt,
    },
    customerName: customer?.name ?? null,
    checklist,
    documents,
    signatures,
  };
}

export async function acceptHandoverByPublicToken(input: {
  token: string;
  signerName: string;
  signatureData?: string;
}): Promise<ActionResult> {
  const detail = await getHandoverByPublicToken(input.token);
  if (!detail) return { ok: false, error: "Predajni paket ni bil najden." };
  if (detail.package.status === "accepted") {
    return { ok: false, error: "Paket je že sprejet." };
  }

  const { db, schema } = getDb();
  const [pkg] = await db
    .select()
    .from(schema.handoverPackage)
    .where(eq(schema.handoverPackage.publicToken, input.token))
    .limit(1);
  if (!pkg) return { ok: false, error: "Predajni paket ni bil najden." };

  const name = input.signerName.trim();
  if (!name) return { ok: false, error: "Ime podpisnika je obvezno." };

  const now = new Date();
  await db.insert(schema.handoverSignature).values({
    id: randomUUID(),
    organizationId: pkg.organizationId,
    packageId: pkg.id,
    role: "customer",
    signerName: name,
    signedAt: now,
    signatureData: emptyToNull(input.signatureData),
    createdAt: now,
  });

  const signatures = await db
    .select()
    .from(schema.handoverSignature)
    .where(eq(schema.handoverSignature.packageId, pkg.id));

  const hasContractor = (signatures as HandoverSignatureRow[]).some((s) => s.role === "contractor");
  if (hasContractor) {
    await db
      .update(schema.handoverPackage)
      .set({ status: "accepted", acceptedAt: now, updatedAt: now })
      .where(eq(schema.handoverPackage.id, pkg.id));
  } else {
    await db
      .update(schema.handoverPackage)
      .set({ status: "sent", updatedAt: now })
      .where(eq(schema.handoverPackage.id, pkg.id));
  }

  await writeAuditLog({
    organizationId: pkg.organizationId,
    action: "handover.public_accept",
    entityType: "handover_package",
    entityId: pkg.id,
    metadata: { signerName: name },
  });

  return { ok: true };
}
