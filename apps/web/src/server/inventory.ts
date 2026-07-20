"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@securitydesk/database";
import {
  availableQuantity,
  averageCostAfterReceipt,
  emptyToNull,
  inventoryItemInputSchema,
  inventoryLocationInputSchema,
  inventoryReceiptInputSchema,
  inventoryReservationInputSchema,
  inventoryTransferInputSchema,
  type InventoryItemInput,
  type InventoryItemType,
  type InventoryLocationInput,
  type InventoryLocationType,
  type InventoryMovementType,
  type InventoryReceiptInput,
  type InventoryReservationInput,
  type InventoryTransferInput,
} from "@securitydesk/shared";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

const supplierInputSchema = z.object({
  name: z.string().min(1).max(255),
  taxNumber: z.string().max(64).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  email: z.string().max(255).optional().or(z.literal("")),
  phone: z.string().max(64).optional().or(z.literal("")),
  contactPerson: z.string().max(255).optional().or(z.literal("")),
  website: z.string().max(255).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});
export type SupplierInput = z.infer<typeof supplierInputSchema>;

const purchaseOrderInputSchema = z.object({
  supplierId: z.string().min(1),
  orderNumber: z.string().max(64).optional().or(z.literal("")),
  currency: z.string().max(8).default("EUR"),
  notes: z.string().max(5000).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        inventoryItemId: z.string().optional().or(z.literal("")),
        description: z.string().max(500).optional().or(z.literal("")),
        quantityOrdered: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0).default(0),
        taxRate: z.coerce.number().min(0).max(100).optional().nullable(),
      }),
    )
    .optional()
    .default([]),
});
export type PurchaseOrderInput = z.infer<typeof purchaseOrderInputSchema>;

const rmaInputSchema = z.object({
  inventoryItemId: z.string().optional().or(z.literal("")),
  inventorySerialId: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  siteId: z.string().optional().or(z.literal("")),
  caseNumber: z.string().max(64).optional().or(z.literal("")),
  reason: z.string().max(255).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
});
export type RmaInput = z.infer<typeof rmaInputSchema>;

const stocktakeCreateInputSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1).max(255),
});
export type StocktakeCreateInput = z.infer<typeof stocktakeCreateInputSchema>;

const stocktakeCompleteInputSchema = z.object({
  stocktakeId: z.string().min(1),
  counts: z
    .array(
      z.object({
        stocktakeItemId: z.string().min(1),
        countedQuantity: z.coerce.number().min(0),
      }),
    )
    .min(1),
});
export type StocktakeCompleteInput = z.infer<typeof stocktakeCompleteInputSchema>;

export type InventoryItemRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  itemType: InventoryItemType;
  unit: string;
  isSerialized: boolean;
  minimumStock: number;
  recommendedStock: number;
  purchasePrice: number | null;
  sellingPrice: number | null;
  isActive: boolean;
  updatedAt: Date;
};

export type InventoryLocationRow = {
  id: string;
  name: string;
  locationType: InventoryLocationType;
  parentId: string | null;
  address: string | null;
  isActive: boolean;
  updatedAt: Date;
};

export type InventoryStockRow = {
  id: string;
  inventoryItemId: string;
  itemSku: string;
  itemName: string;
  unit: string;
  minimumStock: number;
  inventoryLocationId: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number;
  available: number;
  averageCost: number;
  version: number;
  belowMinimum: boolean;
};

export type InventoryMovementRow = {
  id: string;
  inventoryItemId: string;
  itemSku: string;
  itemName: string;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost: number | null;
  sourceLocationId: string | null;
  sourceLocationName: string | null;
  destinationLocationId: string | null;
  destinationLocationName: string | null;
  notes: string | null;
  createdAt: Date;
};

export type InventoryReservationRow = {
  id: string;
  inventoryItemId: string;
  itemSku: string;
  itemName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  status: string;
  notes: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

export type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  createdAt: Date;
};

export type PurchaseOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  supplierId: string;
  supplierName: string;
  currency: string;
  total: number;
  createdAt: Date;
};

export type RmaCaseRow = {
  id: string;
  caseNumber: string;
  status: string;
  reason: string | null;
  inventoryItemId: string | null;
  itemName: string | null;
  supplierName: string | null;
  createdAt: Date;
};

export type StocktakeRow = {
  id: string;
  name: string;
  status: string;
  locationId: string;
  locationName: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

export type InventoryDashboardStats = {
  items: number;
  belowMinimum: number;
  openReservations: number;
  totalStockValue: number;
};

function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/inventory/items");
  revalidatePath("/inventory/locations");
  revalidatePath("/inventory/stock");
  revalidatePath("/inventory/movements");
  revalidatePath("/inventory/reservations");
  revalidatePath("/inventory/purchase-orders");
  revalidatePath("/inventory/rma");
  revalidatePath("/inventory/stocktakes");
  revalidatePath("/inventory/reports");
}

/** Optimistic concurrency: UPDATE … WHERE version = expected; bump version+1. */
async function applyStockUpdate(input: {
  stockId: string;
  expectedVersion: number;
  quantity: number;
  reservedQuantity: number;
  averageCost: number;
}): Promise<void> {
  const { db, schema } = getDb();
  const result = await db
    .update(schema.inventoryStock)
    .set({
      quantity: input.quantity,
      reservedQuantity: input.reservedQuantity,
      averageCost: input.averageCost,
      version: input.expectedVersion + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.inventoryStock.id, input.stockId),
        eq(schema.inventoryStock.version, input.expectedVersion),
      ),
    );

  const header = Array.isArray(result) ? result[0] : result;
  const affected =
    typeof header === "object" && header !== null && "affectedRows" in header
      ? Number((header as { affectedRows: number }).affectedRows)
      : typeof header === "object" && header !== null && "rowCount" in header
        ? Number((header as { rowCount: number }).rowCount)
        : 1;

  if (affected === 0) {
    throw new Error("Konflikt verzije zaloge. Poskusite znova.");
  }
}

async function getOrCreateStockRow(
  organizationId: string,
  inventoryItemId: string,
  inventoryLocationId: string,
) {
  const { db, schema } = getDb();
  const [existing] = await db
    .select()
    .from(schema.inventoryStock)
    .where(
      and(
        eq(schema.inventoryStock.organizationId, organizationId),
        eq(schema.inventoryStock.inventoryItemId, inventoryItemId),
        eq(schema.inventoryStock.inventoryLocationId, inventoryLocationId),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const id = randomUUID();
  try {
    await db.insert(schema.inventoryStock).values({
      id,
      organizationId,
      inventoryItemId,
      inventoryLocationId,
      quantity: 0,
      reservedQuantity: 0,
      averageCost: 0,
      version: 1,
      updatedAt: new Date(),
    });
  } catch {
    const [raced] = await db
      .select()
      .from(schema.inventoryStock)
      .where(
        and(
          eq(schema.inventoryStock.organizationId, organizationId),
          eq(schema.inventoryStock.inventoryItemId, inventoryItemId),
          eq(schema.inventoryStock.inventoryLocationId, inventoryLocationId),
        ),
      )
      .limit(1);
    if (raced) return raced;
    throw new Error("Ni bilo mogoče ustvariti zaloge.");
  }

  const [created] = await db
    .select()
    .from(schema.inventoryStock)
    .where(eq(schema.inventoryStock.id, id))
    .limit(1);
  if (!created) throw new Error("Ni bilo mogoče prebrati zaloge.");
  return created;
}

export async function listInventoryItems(q?: string): Promise<InventoryItemRow[]> {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const search = q?.trim();

  const rows = await db
    .select({
      id: schema.inventoryItem.id,
      sku: schema.inventoryItem.sku,
      barcode: schema.inventoryItem.barcode,
      name: schema.inventoryItem.name,
      itemType: schema.inventoryItem.itemType,
      unit: schema.inventoryItem.unit,
      isSerialized: schema.inventoryItem.isSerialized,
      minimumStock: schema.inventoryItem.minimumStock,
      recommendedStock: schema.inventoryItem.recommendedStock,
      purchasePrice: schema.inventoryItem.purchasePrice,
      sellingPrice: schema.inventoryItem.sellingPrice,
      isActive: schema.inventoryItem.isActive,
      updatedAt: schema.inventoryItem.updatedAt,
    })
    .from(schema.inventoryItem)
    .where(
      and(
        eq(schema.inventoryItem.organizationId, orgId),
        isNull(schema.inventoryItem.deletedAt),
        search
          ? or(
              like(schema.inventoryItem.sku, `%${search}%`),
              like(schema.inventoryItem.name, `%${search}%`),
              like(schema.inventoryItem.barcode, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(schema.inventoryItem.updatedAt));

  return rows.map((r: typeof rows[number]) => ({
    ...r,
    itemType: r.itemType as InventoryItemType,
  }));
}

export async function createInventoryItemAction(
  raw: InventoryItemInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("inventory:write");
    const parsed = inventoryItemInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;
    const id = randomUUID();

    await db.insert(schema.inventoryItem).values({
      id,
      organizationId: orgId,
      sku: parsed.sku.trim(),
      barcode: emptyToNull(parsed.barcode),
      name: parsed.name.trim(),
      description: emptyToNull(parsed.description),
      categoryId: emptyToNull(parsed.categoryId),
      manufacturerId: emptyToNull(parsed.manufacturerId),
      unit: parsed.unit,
      itemType: parsed.itemType,
      isSerialized: parsed.isSerialized,
      isLotTracked: parsed.isLotTracked,
      minimumStock: parsed.minimumStock,
      recommendedStock: parsed.recommendedStock,
      purchasePrice: parsed.purchasePrice ?? null,
      sellingPrice: parsed.sellingPrice ?? null,
      taxRate: parsed.taxRate ?? null,
      currency: parsed.currency,
      warrantyMonths: parsed.warrantyMonths ?? null,
      isActive: parsed.isActive,
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.item.create",
      entityType: "inventory_item",
      entityId: id,
      metadata: { sku: parsed.sku },
    });

    revalidateInventory();
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Napaka pri ustvarjanju artikla.",
    };
  }
}

export async function listInventoryLocations(): Promise<InventoryLocationRow[]> {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();

  const rows = await db
    .select({
      id: schema.inventoryLocation.id,
      name: schema.inventoryLocation.name,
      locationType: schema.inventoryLocation.locationType,
      parentId: schema.inventoryLocation.parentId,
      address: schema.inventoryLocation.address,
      isActive: schema.inventoryLocation.isActive,
      updatedAt: schema.inventoryLocation.updatedAt,
    })
    .from(schema.inventoryLocation)
    .where(eq(schema.inventoryLocation.organizationId, session.organization.id))
    .orderBy(desc(schema.inventoryLocation.updatedAt));

  return rows.map((r: typeof rows[number]) => ({
    ...r,
    locationType: r.locationType as InventoryLocationType,
  }));
}

export async function createInventoryLocationAction(
  raw: InventoryLocationInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("inventory:write");
    const parsed = inventoryLocationInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;
    const id = randomUUID();

    await db.insert(schema.inventoryLocation).values({
      id,
      organizationId: orgId,
      name: parsed.name.trim(),
      locationType: parsed.locationType,
      parentId: emptyToNull(parsed.parentId),
      siteId: emptyToNull(parsed.siteId),
      assignedUserId: emptyToNull(parsed.assignedUserId),
      address: emptyToNull(parsed.address),
      description: emptyToNull(parsed.description),
      isActive: parsed.isActive,
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.location.create",
      entityType: "inventory_location",
      entityId: id,
    });

    revalidateInventory();
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Napaka pri ustvarjanju lokacije.",
    };
  }
}

export async function listInventoryStock(): Promise<InventoryStockRow[]> {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      id: schema.inventoryStock.id,
      inventoryItemId: schema.inventoryStock.inventoryItemId,
      itemSku: schema.inventoryItem.sku,
      itemName: schema.inventoryItem.name,
      unit: schema.inventoryItem.unit,
      minimumStock: schema.inventoryItem.minimumStock,
      inventoryLocationId: schema.inventoryStock.inventoryLocationId,
      locationName: schema.inventoryLocation.name,
      quantity: schema.inventoryStock.quantity,
      reservedQuantity: schema.inventoryStock.reservedQuantity,
      averageCost: schema.inventoryStock.averageCost,
      version: schema.inventoryStock.version,
    })
    .from(schema.inventoryStock)
    .innerJoin(schema.inventoryItem, eq(schema.inventoryItem.id, schema.inventoryStock.inventoryItemId))
    .innerJoin(
      schema.inventoryLocation,
      eq(schema.inventoryLocation.id, schema.inventoryStock.inventoryLocationId),
    )
    .where(eq(schema.inventoryStock.organizationId, orgId))
    .orderBy(desc(schema.inventoryStock.updatedAt));

  return rows.map((r: typeof rows[number]) => {
    const available = availableQuantity(r.quantity, r.reservedQuantity);
    return {
      ...r,
      available,
      belowMinimum: available < r.minimumStock,
    };
  });
}

export async function receiveInventoryAction(
  raw: InventoryReceiptInput,
): Promise<ActionResult<{ movementIds: string[] }>> {
  try {
    const session = await requireOrgSession("inventory:receive");
    const parsed = inventoryReceiptInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;
    const userId = session.user.id;
    const movementIds: string[] = [];

    // Sequential ops with optimistic version checks (MySQL drizzle transaction optional).
    for (const line of parsed.lines) {
      const [item] = await db
        .select()
        .from(schema.inventoryItem)
        .where(
          and(
            eq(schema.inventoryItem.id, line.inventoryItemId),
            eq(schema.inventoryItem.organizationId, orgId),
            isNull(schema.inventoryItem.deletedAt),
          ),
        )
        .limit(1);
      if (!item) throw new Error("Artikel ni bil najden.");

      if (item.isSerialized) {
        const serials = line.serialNumbers ?? [];
        if (serials.length !== line.quantity) {
          throw new Error(
            `Za serializiran artikel ${item.sku} potrebujete natanko ${line.quantity} serijskih številk.`,
          );
        }
      }

      const stock = await getOrCreateStockRow(orgId, line.inventoryItemId, parsed.locationId);
      const unitCost = line.unitCost ?? item.purchasePrice ?? 0;
      const newQty = stock.quantity + line.quantity;
      const newAvg = averageCostAfterReceipt(stock.quantity, stock.averageCost, line.quantity, unitCost);

      await applyStockUpdate({
        stockId: stock.id,
        expectedVersion: stock.version,
        quantity: newQty,
        reservedQuantity: stock.reservedQuantity,
        averageCost: newAvg,
      });

      const movementId = randomUUID();
      movementIds.push(movementId);
      await db.insert(schema.inventoryMovement).values({
        id: movementId,
        organizationId: orgId,
        inventoryItemId: line.inventoryItemId,
        movementType: "receipt",
        sourceLocationId: null,
        destinationLocationId: parsed.locationId,
        quantity: line.quantity,
        unitCost,
        referenceType: emptyToNull(parsed.purchaseOrderId) ? "purchase_order" : null,
        referenceId: emptyToNull(parsed.purchaseOrderId),
        notes: emptyToNull(parsed.notes),
        performedById: userId,
        createdAt: new Date(),
      });

      if (item.isSerialized && line.serialNumbers) {
        for (const serialNumber of line.serialNumbers) {
          const serialId = randomUUID();
          await db.insert(schema.inventorySerial).values({
            id: serialId,
            organizationId: orgId,
            inventoryItemId: line.inventoryItemId,
            serialNumber: serialNumber.trim(),
            status: "inStock",
            currentLocationId: parsed.locationId,
            receivedAt: new Date(),
          });
        }
      }
    }

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: userId,
      action: "inventory.receive",
      entityType: "inventory_location",
      entityId: parsed.locationId,
      metadata: { lines: parsed.lines.length, movementIds },
    });

    revalidateInventory();
    return { ok: true, data: { movementIds } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Prejem ni uspel.",
    };
  }
}

export async function transferInventoryAction(
  raw: InventoryTransferInput,
): Promise<ActionResult<{ movementId: string }>> {
  try {
    const session = await requireOrgSession("inventory:transfer");
    const parsed = inventoryTransferInputSchema.parse(raw);
    if (parsed.sourceLocationId === parsed.destinationLocationId) {
      return { ok: false, error: "Izvorna in ciljna lokacija morata biti različni." };
    }

    const { db, schema } = getDb();
    const orgId = session.organization.id;

    const source = await getOrCreateStockRow(orgId, parsed.inventoryItemId, parsed.sourceLocationId);
    const avail = availableQuantity(source.quantity, source.reservedQuantity);
    if (avail < parsed.quantity) {
      return { ok: false, error: `Nezadostna razpoložljiva zaloga (${avail}).` };
    }

    await applyStockUpdate({
      stockId: source.id,
      expectedVersion: source.version,
      quantity: source.quantity - parsed.quantity,
      reservedQuantity: source.reservedQuantity,
      averageCost: source.averageCost,
    });

    const dest = await getOrCreateStockRow(orgId, parsed.inventoryItemId, parsed.destinationLocationId);
    const newDestQty = dest.quantity + parsed.quantity;
    const newDestAvg = averageCostAfterReceipt(
      dest.quantity,
      dest.averageCost,
      parsed.quantity,
      source.averageCost,
    );

    await applyStockUpdate({
      stockId: dest.id,
      expectedVersion: dest.version,
      quantity: newDestQty,
      reservedQuantity: dest.reservedQuantity,
      averageCost: newDestAvg,
    });

    const serialId = emptyToNull(parsed.inventorySerialId);
    if (serialId) {
      await db
        .update(schema.inventorySerial)
        .set({
          currentLocationId: parsed.destinationLocationId,
          updatedAt: new Date(),
        })
        .where(
          and(eq(schema.inventorySerial.id, serialId), eq(schema.inventorySerial.organizationId, orgId)),
        );
    }

    const movementId = randomUUID();
    await db.insert(schema.inventoryMovement).values({
      id: movementId,
      organizationId: orgId,
      inventoryItemId: parsed.inventoryItemId,
      inventorySerialId: serialId,
      movementType: "transfer",
      sourceLocationId: parsed.sourceLocationId,
      destinationLocationId: parsed.destinationLocationId,
      quantity: parsed.quantity,
      unitCost: source.averageCost,
      notes: emptyToNull(parsed.notes),
      performedById: session.user.id,
      createdAt: new Date(),
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.transfer",
      entityType: "inventory_movement",
      entityId: movementId,
    });

    revalidateInventory();
    return { ok: true, data: { movementId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Prenos ni uspel.",
    };
  }
}

export async function reserveInventoryAction(
  raw: InventoryReservationInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("inventory:reserve");
    const parsed = inventoryReservationInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;

    const stock = await getOrCreateStockRow(orgId, parsed.inventoryItemId, parsed.locationId);
    const avail = availableQuantity(stock.quantity, stock.reservedQuantity);
    if (avail < parsed.quantity) {
      return { ok: false, error: `Nezadostna razpoložljiva zaloga (${avail}).` };
    }

    await applyStockUpdate({
      stockId: stock.id,
      expectedVersion: stock.version,
      quantity: stock.quantity,
      reservedQuantity: stock.reservedQuantity + parsed.quantity,
      averageCost: stock.averageCost,
    });

    const id = randomUUID();
    await db.insert(schema.inventoryReservation).values({
      id,
      organizationId: orgId,
      inventoryItemId: parsed.inventoryItemId,
      inventorySerialId: emptyToNull(parsed.inventorySerialId),
      locationId: parsed.locationId,
      quantity: parsed.quantity,
      reservationType: "general",
      projectId: emptyToNull(parsed.projectId),
      workOrderId: emptyToNull(parsed.workOrderId),
      customerId: emptyToNull(parsed.customerId),
      siteId: emptyToNull(parsed.siteId),
      reservedForUserId: emptyToNull(parsed.reservedForUserId),
      status: "active",
      expiresAt: emptyToNull(parsed.expiresAt) ? new Date(parsed.expiresAt!) : null,
      notes: emptyToNull(parsed.notes),
      createdById: session.user.id,
    });

    await db.insert(schema.inventoryMovement).values({
      id: randomUUID(),
      organizationId: orgId,
      inventoryItemId: parsed.inventoryItemId,
      inventorySerialId: emptyToNull(parsed.inventorySerialId),
      movementType: "reservation",
      sourceLocationId: parsed.locationId,
      destinationLocationId: parsed.locationId,
      quantity: parsed.quantity,
      referenceType: "reservation",
      referenceId: id,
      notes: emptyToNull(parsed.notes),
      performedById: session.user.id,
      createdAt: new Date(),
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.reserve",
      entityType: "inventory_reservation",
      entityId: id,
    });

    revalidateInventory();
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Rezervacija ni uspela.",
    };
  }
}

export async function releaseReservationAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireOrgSession("inventory:reserve");
    const { db, schema } = getDb();
    const orgId = session.organization.id;

    const [reservation] = await db
      .select()
      .from(schema.inventoryReservation)
      .where(
        and(
          eq(schema.inventoryReservation.id, id),
          eq(schema.inventoryReservation.organizationId, orgId),
        ),
      )
      .limit(1);

    if (!reservation) return { ok: false, error: "Rezervacija ni bila najdena." };
    if (reservation.status !== "active" && reservation.status !== "partiallyIssued") {
      return { ok: false, error: "Rezervacija ni aktivna." };
    }

    const stock = await getOrCreateStockRow(orgId, reservation.inventoryItemId, reservation.locationId);
    const nextReserved = Math.max(0, stock.reservedQuantity - reservation.quantity);

    await applyStockUpdate({
      stockId: stock.id,
      expectedVersion: stock.version,
      quantity: stock.quantity,
      reservedQuantity: nextReserved,
      averageCost: stock.averageCost,
    });

    await db
      .update(schema.inventoryReservation)
      .set({ status: "released", updatedAt: new Date() })
      .where(eq(schema.inventoryReservation.id, id));

    await db.insert(schema.inventoryMovement).values({
      id: randomUUID(),
      organizationId: orgId,
      inventoryItemId: reservation.inventoryItemId,
      inventorySerialId: reservation.inventorySerialId,
      movementType: "reservationRelease",
      sourceLocationId: reservation.locationId,
      destinationLocationId: reservation.locationId,
      quantity: reservation.quantity,
      referenceType: "reservation",
      referenceId: id,
      performedById: session.user.id,
      createdAt: new Date(),
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.reservation.release",
      entityType: "inventory_reservation",
      entityId: id,
    });

    revalidateInventory();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sprostitev rezervacije ni uspela.",
    };
  }
}

export async function listMovements(limit = 100): Promise<InventoryMovementRow[]> {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      id: schema.inventoryMovement.id,
      inventoryItemId: schema.inventoryMovement.inventoryItemId,
      itemSku: schema.inventoryItem.sku,
      itemName: schema.inventoryItem.name,
      movementType: schema.inventoryMovement.movementType,
      quantity: schema.inventoryMovement.quantity,
      unitCost: schema.inventoryMovement.unitCost,
      sourceLocationId: schema.inventoryMovement.sourceLocationId,
      destinationLocationId: schema.inventoryMovement.destinationLocationId,
      notes: schema.inventoryMovement.notes,
      createdAt: schema.inventoryMovement.createdAt,
    })
    .from(schema.inventoryMovement)
    .innerJoin(schema.inventoryItem, eq(schema.inventoryItem.id, schema.inventoryMovement.inventoryItemId))
    .where(eq(schema.inventoryMovement.organizationId, orgId))
    .orderBy(desc(schema.inventoryMovement.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));

  const locations = await db
    .select({
      id: schema.inventoryLocation.id,
      name: schema.inventoryLocation.name,
    })
    .from(schema.inventoryLocation)
    .where(eq(schema.inventoryLocation.organizationId, orgId));
  const locMap = new Map(
    locations.map((l: { id: string; name: string }) => [l.id, l.name] as const),
  );

  return rows.map((r: typeof rows[number]) => ({
    ...r,
    movementType: r.movementType as InventoryMovementType,
    sourceLocationName: r.sourceLocationId ? locMap.get(r.sourceLocationId) ?? null : null,
    destinationLocationName: r.destinationLocationId
      ? locMap.get(r.destinationLocationId) ?? null
      : null,
  }));
}

export async function listReservations(): Promise<InventoryReservationRow[]> {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      id: schema.inventoryReservation.id,
      inventoryItemId: schema.inventoryReservation.inventoryItemId,
      itemSku: schema.inventoryItem.sku,
      itemName: schema.inventoryItem.name,
      locationId: schema.inventoryReservation.locationId,
      locationName: schema.inventoryLocation.name,
      quantity: schema.inventoryReservation.quantity,
      status: schema.inventoryReservation.status,
      notes: schema.inventoryReservation.notes,
      expiresAt: schema.inventoryReservation.expiresAt,
      createdAt: schema.inventoryReservation.createdAt,
    })
    .from(schema.inventoryReservation)
    .innerJoin(schema.inventoryItem, eq(schema.inventoryItem.id, schema.inventoryReservation.inventoryItemId))
    .innerJoin(
      schema.inventoryLocation,
      eq(schema.inventoryLocation.id, schema.inventoryReservation.locationId),
    )
    .where(eq(schema.inventoryReservation.organizationId, orgId))
    .orderBy(desc(schema.inventoryReservation.createdAt));

  return rows;
}

export async function inventoryDashboardStats(): Promise<InventoryDashboardStats> {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [[itemsCount], stockRows, [openRes]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.inventoryItem)
      .where(and(eq(schema.inventoryItem.organizationId, orgId), isNull(schema.inventoryItem.deletedAt))),
    db
      .select({
        quantity: schema.inventoryStock.quantity,
        reservedQuantity: schema.inventoryStock.reservedQuantity,
        averageCost: schema.inventoryStock.averageCost,
        minimumStock: schema.inventoryItem.minimumStock,
      })
      .from(schema.inventoryStock)
      .innerJoin(schema.inventoryItem, eq(schema.inventoryItem.id, schema.inventoryStock.inventoryItemId))
      .where(eq(schema.inventoryStock.organizationId, orgId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.inventoryReservation)
      .where(
        and(
          eq(schema.inventoryReservation.organizationId, orgId),
          eq(schema.inventoryReservation.status, "active"),
        ),
      ),
  ]);

  let belowMinimum = 0;
  let totalStockValue = 0;
  for (const row of stockRows) {
    const avail = availableQuantity(row.quantity, row.reservedQuantity);
    if (avail < row.minimumStock) belowMinimum += 1;
    totalStockValue += row.quantity * row.averageCost;
  }

  return {
    items: Number(itemsCount?.count ?? 0),
    belowMinimum,
    openReservations: Number(openRes?.count ?? 0),
    totalStockValue,
  };
}

export async function listSuppliers(): Promise<SupplierRow[]> {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();

  return db
    .select({
      id: schema.supplier.id,
      name: schema.supplier.name,
      email: schema.supplier.email,
      phone: schema.supplier.phone,
      contactPerson: schema.supplier.contactPerson,
      createdAt: schema.supplier.createdAt,
    })
    .from(schema.supplier)
    .where(eq(schema.supplier.organizationId, session.organization.id))
    .orderBy(desc(schema.supplier.createdAt));
}

export async function createSupplierAction(
  raw: SupplierInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("inventory:write");
    const parsed = supplierInputSchema.parse(raw);
    const { db, schema } = getDb();
    const id = randomUUID();

    await db.insert(schema.supplier).values({
      id,
      organizationId: session.organization.id,
      name: parsed.name.trim(),
      taxNumber: emptyToNull(parsed.taxNumber),
      address: emptyToNull(parsed.address),
      email: emptyToNull(parsed.email),
      phone: emptyToNull(parsed.phone),
      contactPerson: emptyToNull(parsed.contactPerson),
      website: emptyToNull(parsed.website),
      notes: emptyToNull(parsed.notes),
    });

    await writeAuditLog({
      organizationId: session.organization.id,
      actorUserId: session.user.id,
      action: "inventory.supplier.create",
      entityType: "supplier",
      entityId: id,
    });

    revalidateInventory();
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Napaka pri ustvarjanju dobavitelja.",
    };
  }
}

export async function listPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  const session = await requireOrgSession("inventory:purchase_orders");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      id: schema.purchaseOrder.id,
      orderNumber: schema.purchaseOrder.orderNumber,
      status: schema.purchaseOrder.status,
      supplierId: schema.purchaseOrder.supplierId,
      supplierName: schema.supplier.name,
      currency: schema.purchaseOrder.currency,
      total: schema.purchaseOrder.total,
      createdAt: schema.purchaseOrder.createdAt,
    })
    .from(schema.purchaseOrder)
    .innerJoin(schema.supplier, eq(schema.supplier.id, schema.purchaseOrder.supplierId))
    .where(eq(schema.purchaseOrder.organizationId, orgId))
    .orderBy(desc(schema.purchaseOrder.createdAt));

  return rows;
}

export async function createPurchaseOrderAction(
  raw: PurchaseOrderInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("inventory:purchase_orders");
    const parsed = purchaseOrderInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;
    const id = randomUUID();
    const orderNumber =
      emptyToNull(parsed.orderNumber) ?? `PO-${new Date().toISOString().slice(0, 10)}-${id.slice(0, 6)}`;

    let subtotal = 0;
    let tax = 0;
    for (const line of parsed.lines) {
      const lineTotal = line.quantityOrdered * line.unitPrice;
      subtotal += lineTotal;
      tax += lineTotal * ((line.taxRate ?? 0) / 100);
    }
    const total = subtotal + tax;

    await db.insert(schema.purchaseOrder).values({
      id,
      organizationId: orgId,
      supplierId: parsed.supplierId,
      orderNumber,
      status: "draft",
      currency: parsed.currency,
      subtotal,
      tax,
      total,
      notes: emptyToNull(parsed.notes),
      createdById: session.user.id,
    });

    for (const line of parsed.lines) {
      const lineTotal = line.quantityOrdered * line.unitPrice;
      await db.insert(schema.purchaseOrderItem).values({
        id: randomUUID(),
        organizationId: orgId,
        purchaseOrderId: id,
        inventoryItemId: emptyToNull(line.inventoryItemId),
        description: emptyToNull(line.description),
        quantityOrdered: line.quantityOrdered,
        quantityReceived: 0,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate ?? null,
        total: lineTotal,
      });
    }

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.purchase_order.create",
      entityType: "purchase_order",
      entityId: id,
    });

    revalidateInventory();
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Napaka pri ustvarjanju naročilnice.",
    };
  }
}

export async function listRmaCases(): Promise<RmaCaseRow[]> {
  const session = await requireOrgSession("inventory:rma");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      id: schema.rmaCase.id,
      caseNumber: schema.rmaCase.caseNumber,
      status: schema.rmaCase.status,
      reason: schema.rmaCase.reason,
      inventoryItemId: schema.rmaCase.inventoryItemId,
      itemName: schema.inventoryItem.name,
      supplierName: schema.supplier.name,
      createdAt: schema.rmaCase.createdAt,
    })
    .from(schema.rmaCase)
    .leftJoin(schema.inventoryItem, eq(schema.inventoryItem.id, schema.rmaCase.inventoryItemId))
    .leftJoin(schema.supplier, eq(schema.supplier.id, schema.rmaCase.supplierId))
    .where(eq(schema.rmaCase.organizationId, orgId))
    .orderBy(desc(schema.rmaCase.createdAt));

  return rows;
}

export async function createRmaAction(raw: RmaInput): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("inventory:rma");
    const parsed = rmaInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;
    const id = randomUUID();
    const caseNumber =
      emptyToNull(parsed.caseNumber) ?? `RMA-${new Date().toISOString().slice(0, 10)}-${id.slice(0, 6)}`;

    await db.insert(schema.rmaCase).values({
      id,
      organizationId: orgId,
      inventoryItemId: emptyToNull(parsed.inventoryItemId),
      inventorySerialId: emptyToNull(parsed.inventorySerialId),
      supplierId: emptyToNull(parsed.supplierId),
      customerId: emptyToNull(parsed.customerId),
      siteId: emptyToNull(parsed.siteId),
      caseNumber,
      reason: emptyToNull(parsed.reason),
      description: emptyToNull(parsed.description),
      status: "opened",
      createdById: session.user.id,
    });

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.rma.create",
      entityType: "rma_case",
      entityId: id,
    });

    revalidateInventory();
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Napaka pri ustvarjanju RMA.",
    };
  }
}

export async function listStocktakes(): Promise<StocktakeRow[]> {
  const session = await requireOrgSession("inventory:stocktake");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = await db
    .select({
      id: schema.stocktake.id,
      name: schema.stocktake.name,
      status: schema.stocktake.status,
      locationId: schema.stocktake.locationId,
      locationName: schema.inventoryLocation.name,
      startedAt: schema.stocktake.startedAt,
      completedAt: schema.stocktake.completedAt,
      createdAt: schema.stocktake.createdAt,
    })
    .from(schema.stocktake)
    .innerJoin(schema.inventoryLocation, eq(schema.inventoryLocation.id, schema.stocktake.locationId))
    .where(eq(schema.stocktake.organizationId, orgId))
    .orderBy(desc(schema.stocktake.createdAt));

  return rows;
}

export async function createStocktakeAction(
  raw: StocktakeCreateInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireOrgSession("inventory:stocktake");
    const parsed = stocktakeCreateInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;
    const id = randomUUID();
    const now = new Date();

    await db.insert(schema.stocktake).values({
      id,
      organizationId: orgId,
      locationId: parsed.locationId,
      name: parsed.name.trim(),
      status: "inProgress",
      startedAt: now,
      createdById: session.user.id,
    });

    const stockRows = await db
      .select({
        inventoryItemId: schema.inventoryStock.inventoryItemId,
        quantity: schema.inventoryStock.quantity,
      })
      .from(schema.inventoryStock)
      .where(
        and(
          eq(schema.inventoryStock.organizationId, orgId),
          eq(schema.inventoryStock.inventoryLocationId, parsed.locationId),
        ),
      );

    for (const row of stockRows) {
      await db.insert(schema.stocktakeItem).values({
        id: randomUUID(),
        organizationId: orgId,
        stocktakeId: id,
        inventoryItemId: row.inventoryItemId,
        expectedQuantity: row.quantity,
        countedQuantity: null,
        difference: null,
      });
    }

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.stocktake.create",
      entityType: "stocktake",
      entityId: id,
    });

    revalidateInventory();
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Napaka pri ustvarjanju inventure.",
    };
  }
}

export async function completeStocktakeAction(
  raw: StocktakeCompleteInput,
): Promise<ActionResult> {
  try {
    const session = await requireOrgSession("inventory:stocktake");
    const parsed = stocktakeCompleteInputSchema.parse(raw);
    const { db, schema } = getDb();
    const orgId = session.organization.id;

    const [take] = await db
      .select()
      .from(schema.stocktake)
      .where(and(eq(schema.stocktake.id, parsed.stocktakeId), eq(schema.stocktake.organizationId, orgId)))
      .limit(1);

    if (!take) return { ok: false, error: "Inventura ni bila najdena." };
    if (take.status === "completed" || take.status === "cancelled") {
      return { ok: false, error: "Inventura je že zaključena." };
    }

    for (const count of parsed.counts) {
      const [item] = await db
        .select()
        .from(schema.stocktakeItem)
        .where(
          and(
            eq(schema.stocktakeItem.id, count.stocktakeItemId),
            eq(schema.stocktakeItem.stocktakeId, parsed.stocktakeId),
            eq(schema.stocktakeItem.organizationId, orgId),
          ),
        )
        .limit(1);
      if (!item) continue;

      const difference = count.countedQuantity - item.expectedQuantity;
      await db
        .update(schema.stocktakeItem)
        .set({
          countedQuantity: count.countedQuantity,
          difference,
          countedById: session.user.id,
          countedAt: new Date(),
        })
        .where(eq(schema.stocktakeItem.id, item.id));

      if (difference === 0) continue;

      const stock = await getOrCreateStockRow(orgId, item.inventoryItemId, take.locationId);
      await applyStockUpdate({
        stockId: stock.id,
        expectedVersion: stock.version,
        quantity: count.countedQuantity,
        reservedQuantity: Math.min(stock.reservedQuantity, count.countedQuantity),
        averageCost: stock.averageCost,
      });

      await db.insert(schema.inventoryMovement).values({
        id: randomUUID(),
        organizationId: orgId,
        inventoryItemId: item.inventoryItemId,
        movementType: "stocktakeCorrection",
        sourceLocationId: difference < 0 ? take.locationId : null,
        destinationLocationId: difference > 0 ? take.locationId : null,
        quantity: Math.abs(difference),
        referenceType: "stocktake",
        referenceId: take.id,
        reason: "Popravek inventure",
        performedById: session.user.id,
        createdAt: new Date(),
      });
    }

    await db
      .update(schema.stocktake)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedById: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.stocktake.id, take.id));

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "inventory.stocktake.complete",
      entityType: "stocktake",
      entityId: take.id,
    });

    revalidateInventory();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Zaključek inventure ni uspel.",
    };
  }
}

export type StocktakeItemRow = {
  id: string;
  inventoryItemId: string;
  itemSku: string;
  itemName: string;
  expectedQuantity: number;
  countedQuantity: number | null;
  difference: number | null;
};

export async function listStocktakeItems(stocktakeId: string): Promise<StocktakeItemRow[]> {
  const session = await requireOrgSession("inventory:stocktake");
  const { db, schema } = getDb();

  const rows = await db
    .select({
      id: schema.stocktakeItem.id,
      inventoryItemId: schema.stocktakeItem.inventoryItemId,
      itemSku: schema.inventoryItem.sku,
      itemName: schema.inventoryItem.name,
      expectedQuantity: schema.stocktakeItem.expectedQuantity,
      countedQuantity: schema.stocktakeItem.countedQuantity,
      difference: schema.stocktakeItem.difference,
    })
    .from(schema.stocktakeItem)
    .innerJoin(schema.inventoryItem, eq(schema.inventoryItem.id, schema.stocktakeItem.inventoryItemId))
    .where(
      and(
        eq(schema.stocktakeItem.stocktakeId, stocktakeId),
        eq(schema.stocktakeItem.organizationId, session.organization.id),
      ),
    );

  return rows as StocktakeItemRow[];
}

export async function getDeviceInventoryContext(deviceId: string) {
  const session = await requireOrgSession("inventory:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const serials = (await db
    .select({
      id: schema.inventorySerial.id,
      serialNumber: schema.inventorySerial.serialNumber,
      status: schema.inventorySerial.status,
      warrantyUntil: schema.inventorySerial.warrantyUntil,
      itemId: schema.inventoryItem.id,
      itemSku: schema.inventoryItem.sku,
      itemName: schema.inventoryItem.name,
      locationId: schema.inventorySerial.currentLocationId,
      siteId: schema.inventorySerial.siteId,
    })
    .from(schema.inventorySerial)
    .innerJoin(schema.inventoryItem, eq(schema.inventoryItem.id, schema.inventorySerial.inventoryItemId))
    .where(
      and(
        eq(schema.inventorySerial.organizationId, orgId),
        eq(schema.inventorySerial.deviceId, deviceId),
      ),
    )
    .limit(20)) as Array<{
    id: string;
    serialNumber: string;
    status: string;
    warrantyUntil: Date | null;
    itemId: string;
    itemSku: string;
    itemName: string;
    locationId: string | null;
    siteId: string | null;
  }>;

  const serialIds = serials.map((s) => s.id);
  const rmas =
    serialIds.length > 0
      ? ((await db
          .select({
            id: schema.rmaCase.id,
            status: schema.rmaCase.status,
            inventorySerialId: schema.rmaCase.inventorySerialId,
            reason: schema.rmaCase.reason,
            createdAt: schema.rmaCase.createdAt,
          })
          .from(schema.rmaCase)
          .where(
            and(
              eq(schema.rmaCase.organizationId, orgId),
              eq(schema.rmaCase.deviceId, deviceId),
            ),
          )
          .limit(20)) as Array<{
          id: string;
          status: string;
          inventorySerialId: string | null;
          reason: string | null;
          createdAt: Date;
        }>)
      : [];

  return { serials, rmas };
}
