import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  double,
  index,
  uniqueIndex,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { organization, user } from "./mysql";
import { customer, site, manufacturer, device } from "./securitydesk-mysql";

export const inventoryCategory = mysqlTable(
  "inventory_category",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    parentId: varchar("parent_id", { length: 36 }).references(
      (): AnyMySqlColumn => inventoryCategory.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("inventory_category_org_idx").on(t.organizationId),
    index("inventory_category_parent_idx").on(t.parentId),
  ],
);

export const inventoryItem = mysqlTable(
  "inventory_item",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 128 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    categoryId: varchar("category_id", { length: 36 }).references(() => inventoryCategory.id, {
      onDelete: "set null",
    }),
    manufacturerId: varchar("manufacturer_id", { length: 36 }).references(() => manufacturer.id, {
      onDelete: "set null",
    }),
    unit: varchar("unit", { length: 32 }).notNull().default("kos"),
    itemType: varchar("item_type", { length: 64 }).notNull().default("sparePart"),
    isSerialized: boolean("is_serialized").notNull().default(false),
    isLotTracked: boolean("is_lot_tracked").notNull().default(false),
    minimumStock: double("minimum_stock").notNull().default(0),
    recommendedStock: double("recommended_stock").notNull().default(0),
    purchasePrice: double("purchase_price"),
    sellingPrice: double("selling_price"),
    taxRate: double("tax_rate"),
    currency: varchar("currency", { length: 8 }).notNull().default("EUR"),
    warrantyMonths: int("warranty_months"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("inventory_item_org_idx").on(t.organizationId),
    index("inventory_item_category_idx").on(t.categoryId),
    index("inventory_item_sku_idx").on(t.organizationId, t.sku),
  ],
);

export const inventoryLocation = mysqlTable(
  "inventory_location",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    locationType: varchar("location_type", { length: 64 }).notNull().default("warehouse"),
    parentId: varchar("parent_id", { length: 36 }).references(
      (): AnyMySqlColumn => inventoryLocation.id,
      { onDelete: "set null" },
    ),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    assignedUserId: varchar("assigned_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    address: varchar("address", { length: 500 }),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("inventory_location_org_idx").on(t.organizationId),
    index("inventory_location_parent_idx").on(t.parentId),
    index("inventory_location_site_idx").on(t.siteId),
  ],
);

export const inventoryStock = mysqlTable(
  "inventory_stock",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inventoryItemId: varchar("inventory_item_id", { length: 36 })
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "cascade" }),
    inventoryLocationId: varchar("inventory_location_id", { length: 36 })
      .notNull()
      .references(() => inventoryLocation.id, { onDelete: "cascade" }),
    quantity: double("quantity").notNull().default(0),
    reservedQuantity: double("reserved_quantity").notNull().default(0),
    averageCost: double("average_cost").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    version: int("version").notNull().default(1),
  },
  (t) => [
    index("inventory_stock_org_idx").on(t.organizationId),
    index("inventory_stock_item_idx").on(t.inventoryItemId),
    index("inventory_stock_location_idx").on(t.inventoryLocationId),
    uniqueIndex("inventory_stock_org_item_location_uidx").on(
      t.organizationId,
      t.inventoryItemId,
      t.inventoryLocationId,
    ),
  ],
);

export const inventorySerial = mysqlTable(
  "inventory_serial",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inventoryItemId: varchar("inventory_item_id", { length: 36 })
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "cascade" }),
    serialNumber: varchar("serial_number", { length: 128 }).notNull(),
    macAddress: varchar("mac_address", { length: 64 }),
    imei: varchar("imei", { length: 32 }),
    encryptedLicenseKey: text("encrypted_license_key"),
    status: varchar("status", { length: 64 }).notNull().default("inStock"),
    currentLocationId: varchar("current_location_id", { length: 36 }).references(
      () => inventoryLocation.id,
      { onDelete: "set null" },
    ),
    deviceId: varchar("device_id", { length: 36 }).references(() => device.id, {
      onDelete: "set null",
    }),
    customerId: varchar("customer_id", { length: 36 }).references(() => customer.id, {
      onDelete: "set null",
    }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    purchaseOrderItemId: varchar("purchase_order_item_id", { length: 36 }),
    receivedAt: timestamp("received_at"),
    installedAt: timestamp("installed_at"),
    warrantyUntil: timestamp("warranty_until"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("inventory_serial_org_idx").on(t.organizationId),
    index("inventory_serial_item_idx").on(t.inventoryItemId),
    index("inventory_serial_location_idx").on(t.currentLocationId),
    uniqueIndex("inventory_serial_org_number_uidx").on(t.organizationId, t.serialNumber),
  ],
);

export const inventoryMovement = mysqlTable(
  "inventory_movement",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inventoryItemId: varchar("inventory_item_id", { length: 36 })
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "cascade" }),
    inventorySerialId: varchar("inventory_serial_id", { length: 36 }).references(
      () => inventorySerial.id,
      { onDelete: "set null" },
    ),
    movementType: varchar("movement_type", { length: 64 }).notNull(),
    sourceLocationId: varchar("source_location_id", { length: 36 }).references(
      () => inventoryLocation.id,
      { onDelete: "set null" },
    ),
    destinationLocationId: varchar("destination_location_id", { length: 36 }).references(
      () => inventoryLocation.id,
      { onDelete: "set null" },
    ),
    quantity: double("quantity").notNull(),
    unitCost: double("unit_cost"),
    referenceType: varchar("reference_type", { length: 64 }),
    referenceId: varchar("reference_id", { length: 36 }),
    reason: varchar("reason", { length: 255 }),
    notes: text("notes"),
    performedById: varchar("performed_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    approvedById: varchar("approved_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("inventory_movement_org_idx").on(t.organizationId),
    index("inventory_movement_item_idx").on(t.inventoryItemId),
    index("inventory_movement_serial_idx").on(t.inventorySerialId),
    uniqueIndex("inventory_movement_org_idempotency_uidx").on(t.organizationId, t.idempotencyKey),
  ],
);

export const inventoryReservation = mysqlTable(
  "inventory_reservation",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inventoryItemId: varchar("inventory_item_id", { length: 36 })
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "cascade" }),
    inventorySerialId: varchar("inventory_serial_id", { length: 36 }).references(
      () => inventorySerial.id,
      { onDelete: "set null" },
    ),
    locationId: varchar("location_id", { length: 36 })
      .notNull()
      .references(() => inventoryLocation.id, { onDelete: "cascade" }),
    quantity: double("quantity").notNull(),
    reservationType: varchar("reservation_type", { length: 64 }).notNull().default("general"),
    projectId: varchar("project_id", { length: 36 }),
    workOrderId: varchar("work_order_id", { length: 36 }),
    customerId: varchar("customer_id", { length: 36 }).references(() => customer.id, {
      onDelete: "set null",
    }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    reservedForUserId: varchar("reserved_for_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 64 }).notNull().default("active"),
    expiresAt: timestamp("expires_at"),
    notes: text("notes"),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("inventory_reservation_org_idx").on(t.organizationId),
    index("inventory_reservation_item_idx").on(t.inventoryItemId),
    index("inventory_reservation_location_idx").on(t.locationId),
  ],
);

export const supplier = mysqlTable(
  "supplier",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    taxNumber: varchar("tax_number", { length: 64 }),
    address: varchar("address", { length: 500 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 64 }),
    contactPerson: varchar("contact_person", { length: 255 }),
    website: varchar("website", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("supplier_org_idx").on(t.organizationId)],
);

export const purchaseOrder = mysqlTable(
  "purchase_order",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    supplierId: varchar("supplier_id", { length: 36 })
      .notNull()
      .references(() => supplier.id, { onDelete: "restrict" }),
    orderNumber: varchar("order_number", { length: 64 }).notNull(),
    status: varchar("status", { length: 64 }).notNull().default("draft"),
    orderDate: timestamp("order_date"),
    expectedDate: timestamp("expected_date"),
    currency: varchar("currency", { length: 8 }).notNull().default("EUR"),
    subtotal: double("subtotal").notNull().default(0),
    tax: double("tax").notNull().default(0),
    total: double("total").notNull().default(0),
    notes: text("notes"),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    approvedById: varchar("approved_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("purchase_order_org_idx").on(t.organizationId),
    index("purchase_order_supplier_idx").on(t.supplierId),
    uniqueIndex("purchase_order_org_number_uidx").on(t.organizationId, t.orderNumber),
  ],
);

export const purchaseOrderItem = mysqlTable(
  "purchase_order_item",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    purchaseOrderId: varchar("purchase_order_id", { length: 36 })
      .notNull()
      .references(() => purchaseOrder.id, { onDelete: "cascade" }),
    inventoryItemId: varchar("inventory_item_id", { length: 36 }).references(() => inventoryItem.id, {
      onDelete: "set null",
    }),
    description: varchar("description", { length: 500 }),
    quantityOrdered: double("quantity_ordered").notNull().default(0),
    quantityReceived: double("quantity_received").notNull().default(0),
    unitPrice: double("unit_price").notNull().default(0),
    taxRate: double("tax_rate"),
    total: double("total").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("purchase_order_item_org_idx").on(t.organizationId),
    index("purchase_order_item_po_idx").on(t.purchaseOrderId),
    index("purchase_order_item_item_idx").on(t.inventoryItemId),
  ],
);

export const rmaCase = mysqlTable(
  "rma_case",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    inventoryItemId: varchar("inventory_item_id", { length: 36 }).references(() => inventoryItem.id, {
      onDelete: "set null",
    }),
    inventorySerialId: varchar("inventory_serial_id", { length: 36 }).references(
      () => inventorySerial.id,
      { onDelete: "set null" },
    ),
    supplierId: varchar("supplier_id", { length: 36 }).references(() => supplier.id, {
      onDelete: "set null",
    }),
    customerId: varchar("customer_id", { length: 36 }).references(() => customer.id, {
      onDelete: "set null",
    }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    deviceId: varchar("device_id", { length: 36 }).references(() => device.id, {
      onDelete: "set null",
    }),
    caseNumber: varchar("case_number", { length: 64 }).notNull(),
    reason: varchar("reason", { length: 255 }),
    description: text("description"),
    status: varchar("status", { length: 64 }).notNull().default("opened"),
    sentAt: timestamp("sent_at"),
    receivedAt: timestamp("received_at"),
    resolution: text("resolution"),
    replacementSerialId: varchar("replacement_serial_id", { length: 36 }).references(
      () => inventorySerial.id,
      { onDelete: "set null" },
    ),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("rma_case_org_idx").on(t.organizationId),
    index("rma_case_serial_idx").on(t.inventorySerialId),
    uniqueIndex("rma_case_org_number_uidx").on(t.organizationId, t.caseNumber),
  ],
);

export const stocktake = mysqlTable(
  "stocktake",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    locationId: varchar("location_id", { length: 36 })
      .notNull()
      .references(() => inventoryLocation.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    status: varchar("status", { length: 64 }).notNull().default("draft"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    completedById: varchar("completed_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("stocktake_org_idx").on(t.organizationId),
    index("stocktake_location_idx").on(t.locationId),
  ],
);

export const stocktakeItem = mysqlTable(
  "stocktake_item",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    stocktakeId: varchar("stocktake_id", { length: 36 })
      .notNull()
      .references(() => stocktake.id, { onDelete: "cascade" }),
    inventoryItemId: varchar("inventory_item_id", { length: 36 })
      .notNull()
      .references(() => inventoryItem.id, { onDelete: "cascade" }),
    inventorySerialId: varchar("inventory_serial_id", { length: 36 }).references(
      () => inventorySerial.id,
      { onDelete: "set null" },
    ),
    expectedQuantity: double("expected_quantity").notNull().default(0),
    countedQuantity: double("counted_quantity"),
    difference: double("difference"),
    notes: text("notes"),
    countedById: varchar("counted_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    countedAt: timestamp("counted_at"),
  },
  (t) => [
    index("stocktake_item_org_idx").on(t.organizationId),
    index("stocktake_item_stocktake_idx").on(t.stocktakeId),
    index("stocktake_item_item_idx").on(t.inventoryItemId),
  ],
);
