import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { organization } from "./postgresql";
import { customer, site } from "./securitydesk-postgresql";

export const cctvProjectStatusEnum = pgEnum("cctv_project_status", ["draft", "active", "archived"]);

export const cctvProject = pgTable(
  "cctv_project",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 }).references(() => customer.id, {
      onDelete: "set null",
    }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: cctvProjectStatusEnum("status").notNull().default("draft"),
    retentionDays: integer("retention_days").notNull().default(30),
    reservePercent: doublePrecision("reserve_percent").notNull().default(20),
    raidFactor: doublePrecision("raid_factor").notNull().default(1.33),
    spareCapacityTb: doublePrecision("spare_capacity_tb").notNull().default(0),
    useBinaryTb: boolean("use_binary_tb").notNull().default(true),
    growthPercent: doublePrecision("growth_percent").notNull().default(0),
    diskSizeTb: doublePrecision("disk_size_tb").notNull().default(8),
    clientsCount: integer("clients_count").notNull().default(2),
    clientBitrateMbps: doublePrecision("client_bitrate_mbps").notNull().default(8),
    maxRecorderBandwidthMbps: doublePrecision("max_recorder_bandwidth_mbps").notNull().default(256),
    maxPortsPerRecorder: integer("max_ports_per_recorder").notNull().default(32),
    poeBudgetWatts: doublePrecision("poe_budget_watts").notNull().default(370),
    wattsPerCamera: doublePrecision("watts_per_camera").notNull().default(8),
    upsCapacityWh: doublePrecision("ups_capacity_wh").notNull().default(1000),
    systemLoadWatts: doublePrecision("system_load_watts").notNull().default(250),
    groupsJson: text("groups_json").notNull(),
    resultJson: text("result_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("cctv_project_org_idx").on(t.organizationId),
    index("cctv_project_customer_idx").on(t.customerId),
  ],
);

export const cctvScenario = pgTable(
  "cctv_scenario",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => cctvProject.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    retentionDays: integer("retention_days").notNull(),
    reservePercent: doublePrecision("reserve_percent").notNull(),
    notes: text("notes"),
    resultJson: text("result_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("cctv_scenario_org_idx").on(t.organizationId),
    index("cctv_scenario_project_idx").on(t.projectId),
  ],
);
