import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { organization, user } from "./postgresql";
import { customer, site, building, floor, room, device } from "./securitydesk-postgresql";
import { networkSwitch, networkPort } from "./network-postgresql";

export const floorPlanStatusEnum = pgEnum("floor_plan_status", ["draft", "active", "archived"]);

export const floorPlan = pgTable(
  "floor_plan",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 })
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    buildingId: varchar("building_id", { length: 36 }).references(() => building.id, {
      onDelete: "set null",
    }),
    floorId: varchar("floor_id", { length: 36 }).references(() => floor.id, { onDelete: "set null" }),
    roomId: varchar("room_id", { length: 36 }).references(() => room.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    imageStorageKey: varchar("image_storage_key", { length: 512 }),
    imageMimeType: varchar("image_mime_type", { length: 128 }),
    pdfStorageKey: varchar("pdf_storage_key", { length: 512 }),
    originalWidth: integer("original_width"),
    originalHeight: integer("original_height"),
    scaleEnabled: boolean("scale_enabled").notNull().default(false),
    scaleValue: doublePrecision("scale_value"),
    scaleUnit: varchar("scale_unit", { length: 8 }),
    status: floorPlanStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("floor_plan_org_idx").on(t.organizationId),
    index("floor_plan_site_idx").on(t.siteId),
    index("floor_plan_customer_idx").on(t.customerId),
  ],
);

export const floorPlanLayer = pgTable(
  "floor_plan_layer",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    floorPlanId: varchar("floor_plan_id", { length: 36 })
      .notNull()
      .references(() => floorPlan.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    isLocked: boolean("is_locked").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("floor_plan_layer_org_idx").on(t.organizationId),
    index("floor_plan_layer_plan_idx").on(t.floorPlanId),
  ],
);

export const floorPlanElement = pgTable(
  "floor_plan_element",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    floorPlanId: varchar("floor_plan_id", { length: 36 })
      .notNull()
      .references(() => floorPlan.id, { onDelete: "cascade" }),
    layerId: varchar("layer_id", { length: 36 })
      .notNull()
      .references(() => floorPlanLayer.id, { onDelete: "cascade" }),
    elementType: varchar("element_type", { length: 64 }).notNull(),
    deviceId: varchar("device_id", { length: 36 }).references(() => device.id, {
      onDelete: "set null",
    }),
    switchId: varchar("switch_id", { length: 36 }).references(() => networkSwitch.id, {
      onDelete: "set null",
    }),
    switchPortId: varchar("switch_port_id", { length: 36 }).references(() => networkPort.id, {
      onDelete: "set null",
    }),
    roomId: varchar("room_id", { length: 36 }).references(() => room.id, { onDelete: "set null" }),
    label: varchar("label", { length: 255 }),
    description: text("description"),
    x: doublePrecision("x").notNull().default(0),
    y: doublePrecision("y").notNull().default(0),
    width: doublePrecision("width").notNull().default(32),
    height: doublePrecision("height").notNull().default(32),
    rotation: doublePrecision("rotation").notNull().default(0),
    zIndex: integer("z_index").notNull().default(0),
    icon: varchar("icon", { length: 64 }),
    shape: varchar("shape", { length: 32 }),
    statusOverride: varchar("status_override", { length: 32 }),
    metadata: text("metadata"),
    isLocked: boolean("is_locked").notNull().default(false),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("floor_plan_element_org_idx").on(t.organizationId),
    index("floor_plan_element_plan_idx").on(t.floorPlanId),
    index("floor_plan_element_device_idx").on(t.deviceId),
  ],
);

export const floorPlanConnection = pgTable(
  "floor_plan_connection",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    floorPlanId: varchar("floor_plan_id", { length: 36 })
      .notNull()
      .references(() => floorPlan.id, { onDelete: "cascade" }),
    sourceElementId: varchar("source_element_id", { length: 36 })
      .notNull()
      .references(() => floorPlanElement.id, { onDelete: "cascade" }),
    targetElementId: varchar("target_element_id", { length: 36 })
      .notNull()
      .references(() => floorPlanElement.id, { onDelete: "cascade" }),
    connectionType: varchar("connection_type", { length: 64 }).notNull().default("network"),
    label: varchar("label", { length: 255 }),
    pathData: text("path_data"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("floor_plan_connection_org_idx").on(t.organizationId),
    index("floor_plan_connection_plan_idx").on(t.floorPlanId),
  ],
);

export const floorPlanZone = pgTable(
  "floor_plan_zone",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    floorPlanId: varchar("floor_plan_id", { length: 36 })
      .notNull()
      .references(() => floorPlan.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    zoneType: varchar("zone_type", { length: 64 }).notNull().default("custom"),
    points: text("points").notNull(),
    label: varchar("label", { length: 255 }),
    description: text("description"),
    opacity: doublePrecision("opacity").notNull().default(0.25),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("floor_plan_zone_org_idx").on(t.organizationId),
    index("floor_plan_zone_plan_idx").on(t.floorPlanId),
  ],
);

export const floorPlanVersion = pgTable(
  "floor_plan_version",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    floorPlanId: varchar("floor_plan_id", { length: 36 })
      .notNull()
      .references(() => floorPlan.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    description: varchar("description", { length: 500 }),
    snapshotJson: text("snapshot_json"),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("floor_plan_version_org_idx").on(t.organizationId),
    index("floor_plan_version_plan_idx").on(t.floorPlanId),
  ],
);
