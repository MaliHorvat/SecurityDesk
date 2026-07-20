import { z } from "zod";

export const INVENTORY_ITEM_TYPES = [
  "device",
  "sparePart",
  "consumable",
  "cable",
  "license",
  "tool",
  "serviceItem",
  "other",
] as const;
export const inventoryItemTypeSchema = z.enum(INVENTORY_ITEM_TYPES);
export type InventoryItemType = z.infer<typeof inventoryItemTypeSchema>;

export const INVENTORY_UNITS = ["kos", "meter", "paket", "rola", "ura", "licenca"] as const;
export const inventoryUnitSchema = z.enum(INVENTORY_UNITS);

export const INVENTORY_LOCATION_TYPES = [
  "warehouse",
  "shelf",
  "vehicle",
  "technician",
  "project",
  "service",
  "customerSite",
  "quarantine",
  "rma",
  "other",
] as const;
export const inventoryLocationTypeSchema = z.enum(INVENTORY_LOCATION_TYPES);
export type InventoryLocationType = z.infer<typeof inventoryLocationTypeSchema>;

export const INVENTORY_MOVEMENT_TYPES = [
  "receipt",
  "transfer",
  "reservation",
  "reservationRelease",
  "issue",
  "installation",
  "consumption",
  "return",
  "adjustmentIncrease",
  "adjustmentDecrease",
  "rmaDispatch",
  "rmaReturn",
  "scrap",
  "stocktakeCorrection",
] as const;
export const inventoryMovementTypeSchema = z.enum(INVENTORY_MOVEMENT_TYPES);
export type InventoryMovementType = z.infer<typeof inventoryMovementTypeSchema>;

export const INVENTORY_SERIAL_STATUSES = [
  "inStock",
  "reserved",
  "issued",
  "installed",
  "returned",
  "rma",
  "damaged",
  "lost",
  "scrapped",
] as const;
export const inventorySerialStatusSchema = z.enum(INVENTORY_SERIAL_STATUSES);
export type InventorySerialStatus = z.infer<typeof inventorySerialStatusSchema>;

export const INVENTORY_RESERVATION_STATUSES = [
  "active",
  "partiallyIssued",
  "fulfilled",
  "released",
  "expired",
] as const;

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "pendingApproval",
  "approved",
  "ordered",
  "partiallyReceived",
  "received",
  "cancelled",
] as const;

export const RMA_STATUSES = [
  "opened",
  "approved",
  "sent",
  "receivedBySupplier",
  "repairing",
  "replacementIssued",
  "repaired",
  "rejected",
  "returned",
  "closed",
] as const;

export const STOCKTAKE_STATUSES = ["draft", "inProgress", "review", "completed", "cancelled"] as const;

export const inventoryItemInputSchema = z.object({
  sku: z.string().min(1).max(64),
  barcode: z.string().max(128).optional().or(z.literal("")),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  manufacturerId: z.string().optional().or(z.literal("")),
  unit: inventoryUnitSchema.default("kos"),
  itemType: inventoryItemTypeSchema.default("sparePart"),
  isSerialized: z.boolean().default(false),
  isLotTracked: z.boolean().default(false),
  minimumStock: z.coerce.number().min(0).default(0),
  recommendedStock: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).optional().nullable(),
  sellingPrice: z.coerce.number().min(0).optional().nullable(),
  taxRate: z.coerce.number().min(0).max(100).optional().nullable(),
  currency: z.string().max(8).default("EUR"),
  warrantyMonths: z.coerce.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type InventoryItemInput = z.infer<typeof inventoryItemInputSchema>;

export const inventoryLocationInputSchema = z.object({
  name: z.string().min(1).max(255),
  locationType: inventoryLocationTypeSchema.default("warehouse"),
  parentId: z.string().optional().or(z.literal("")),
  siteId: z.string().optional().or(z.literal("")),
  assignedUserId: z.string().optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
export type InventoryLocationInput = z.infer<typeof inventoryLocationInputSchema>;

export const inventoryReceiptInputSchema = z.object({
  locationId: z.string().min(1),
  supplierId: z.string().optional().or(z.literal("")),
  purchaseOrderId: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        quantity: z.coerce.number().positive(),
        unitCost: z.coerce.number().min(0).optional().nullable(),
        serialNumbers: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(1),
});
export type InventoryReceiptInput = z.infer<typeof inventoryReceiptInputSchema>;

export const inventoryTransferInputSchema = z.object({
  sourceLocationId: z.string().min(1),
  destinationLocationId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  inventorySerialId: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
export type InventoryTransferInput = z.infer<typeof inventoryTransferInputSchema>;

export const inventoryReservationInputSchema = z.object({
  inventoryItemId: z.string().min(1),
  locationId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  inventorySerialId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  workOrderId: z.string().optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  siteId: z.string().optional().or(z.literal("")),
  reservedForUserId: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
export type InventoryReservationInput = z.infer<typeof inventoryReservationInputSchema>;

export function availableQuantity(quantity: number, reservedQuantity: number): number {
  return Math.max(0, quantity - reservedQuantity);
}

export function averageCostAfterReceipt(
  currentQty: number,
  currentAvg: number,
  receiptQty: number,
  receiptUnitCost: number,
): number {
  const totalQty = currentQty + receiptQty;
  if (totalQty <= 0) return 0;
  return (currentQty * currentAvg + receiptQty * receiptUnitCost) / totalQty;
}

export function isBelowMinimum(available: number, minimumStock: number): boolean {
  return available < minimumStock;
}
