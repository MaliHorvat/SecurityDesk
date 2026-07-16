import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./postgresql";

export const customerStatusEnum = pgEnum("customer_status", ["active", "inactive", "prospect"]);
export const deviceStatusEnum = pgEnum("device_status", [
  "active",
  "inactive",
  "maintenance",
  "decommissioned",
  "unknown",
]);
export const siteDocumentKindEnum = pgEnum("site_document_kind", [
  "floorplan",
  "photo",
  "contract",
  "other",
]);
export const deviceDocumentKindEnum = pgEnum("device_document_kind", [
  "photo",
  "manual",
  "config",
  "other",
]);

export const customer = pgTable(
  "customer",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    taxId: varchar("tax_id", { length: 64 }),
    addressLine1: varchar("address_line1", { length: 255 }),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 128 }),
    postalCode: varchar("postal_code", { length: 32 }),
    country: varchar("country", { length: 64 }).default("SI"),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 64 }),
    notes: text("notes"),
    serviceContract: text("service_contract"),
    status: customerStatusEnum("status").notNull().default("active"),
    collaborationStartedAt: timestamp("collaboration_started_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("customer_org_idx").on(t.organizationId),
    index("customer_name_idx").on(t.organizationId, t.name),
  ],
);

export const customerContact = pgTable(
  "customer_contact",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 64 }),
    role: varchar("role", { length: 128 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("customer_contact_org_idx").on(t.organizationId),
    index("customer_contact_customer_idx").on(t.customerId),
  ],
);

export const site = pgTable(
  "site",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    addressLine1: varchar("address_line1", { length: 255 }),
    city: varchar("city", { length: 128 }),
    postalCode: varchar("postal_code", { length: 32 }),
    country: varchar("country", { length: 64 }).default("SI"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Ljubljana"),
    contactName: varchar("contact_name", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 64 }),
    accessInstructions: text("access_instructions"),
    workingHours: text("working_hours"),
    securityNotes: text("security_notes"),
    qrToken: varchar("qr_token", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("site_org_idx").on(t.organizationId),
    index("site_customer_idx").on(t.customerId),
    uniqueIndex("site_qr_uidx").on(t.qrToken),
  ],
);

export const building = pgTable(
  "building",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 })
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("building_org_idx").on(t.organizationId), index("building_site_idx").on(t.siteId)],
);

export const floor = pgTable(
  "floor",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    buildingId: varchar("building_id", { length: 36 })
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    level: integer("level").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("floor_org_idx").on(t.organizationId), index("floor_building_idx").on(t.buildingId)],
);

export const room = pgTable(
  "room",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    floorId: varchar("floor_id", { length: 36 })
      .notNull()
      .references(() => floor.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("room_org_idx").on(t.organizationId), index("room_floor_idx").on(t.floorId)],
);

export const manufacturer = pgTable(
  "manufacturer",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    website: varchar("website", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("manufacturer_org_idx").on(t.organizationId),
    uniqueIndex("manufacturer_org_name_uidx").on(t.organizationId, t.name),
  ],
);

export const deviceType = pgTable(
  "device_type",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    category: varchar("category", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("device_type_org_idx").on(t.organizationId),
    uniqueIndex("device_type_org_name_uidx").on(t.organizationId, t.name),
  ],
);

export const device = pgTable(
  "device",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 }).references(() => customer.id, {
      onDelete: "set null",
    }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    buildingId: varchar("building_id", { length: 36 }).references(() => building.id, {
      onDelete: "set null",
    }),
    floorId: varchar("floor_id", { length: 36 }).references(() => floor.id, { onDelete: "set null" }),
    roomId: varchar("room_id", { length: 36 }).references(() => room.id, { onDelete: "set null" }),
    deviceTypeId: varchar("device_type_id", { length: 36 }).references(() => deviceType.id, {
      onDelete: "set null",
    }),
    manufacturerId: varchar("manufacturer_id", { length: 36 }).references(() => manufacturer.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    model: varchar("model", { length: 255 }),
    serialNumber: varchar("serial_number", { length: 128 }),
    inventoryNumber: varchar("inventory_number", { length: 128 }),
    macAddress: varchar("mac_address", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    subnetMask: varchar("subnet_mask", { length: 64 }),
    gateway: varchar("gateway", { length: 64 }),
    dns: varchar("dns", { length: 255 }),
    vlan: integer("vlan"),
    switchPort: varchar("switch_port", { length: 64 }),
    username: varchar("username", { length: 128 }),
    firmware: varchar("firmware", { length: 128 }),
    installedAt: timestamp("installed_at"),
    purchasedAt: timestamp("purchased_at"),
    warrantyUntil: timestamp("warranty_until"),
    supplier: varchar("supplier", { length: 255 }),
    status: deviceStatusEnum("status").notNull().default("active"),
    tags: text("tags"),
    notes: text("notes"),
    qrToken: varchar("qr_token", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("device_org_idx").on(t.organizationId),
    index("device_site_idx").on(t.siteId),
    index("device_customer_idx").on(t.customerId),
    index("device_ip_idx").on(t.organizationId, t.siteId, t.ipAddress),
    uniqueIndex("device_qr_uidx").on(t.qrToken),
  ],
);

export const deviceCredential = pgTable(
  "device_credential",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 })
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 128 }).notNull().default("default"),
    encryptedSecret: text("encrypted_secret").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("device_credential_org_idx").on(t.organizationId),
    index("device_credential_device_idx").on(t.deviceId),
  ],
);

export const siteDocument = pgTable(
  "site_document",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 })
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    sizeBytes: integer("size_bytes"),
    kind: siteDocumentKindEnum("kind").notNull().default("other"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("site_document_org_idx").on(t.organizationId), index("site_document_site_idx").on(t.siteId)],
);

export const deviceDocument = pgTable(
  "device_document",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 })
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    sizeBytes: integer("size_bytes"),
    kind: deviceDocumentKindEnum("kind").notNull().default("other"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("device_document_org_idx").on(t.organizationId),
    index("device_document_device_idx").on(t.deviceId),
  ],
);
