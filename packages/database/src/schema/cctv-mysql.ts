import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  double,
  boolean,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { organization } from "./mysql";
import { customer, site } from "./securitydesk-mysql";

export const cctvProject = mysqlTable(
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
    status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
    retentionDays: int("retention_days").notNull().default(30),
    reservePercent: double("reserve_percent").notNull().default(20),
    raidFactor: double("raid_factor").notNull().default(1.33),
    spareCapacityTb: double("spare_capacity_tb").notNull().default(0),
    useBinaryTb: boolean("use_binary_tb").notNull().default(true),
    growthPercent: double("growth_percent").notNull().default(0),
    diskSizeTb: double("disk_size_tb").notNull().default(8),
    clientsCount: int("clients_count").notNull().default(2),
    clientBitrateMbps: double("client_bitrate_mbps").notNull().default(8),
    maxRecorderBandwidthMbps: double("max_recorder_bandwidth_mbps").notNull().default(256),
    maxPortsPerRecorder: int("max_ports_per_recorder").notNull().default(32),
    poeBudgetWatts: double("poe_budget_watts").notNull().default(370),
    wattsPerCamera: double("watts_per_camera").notNull().default(8),
    upsCapacityWh: double("ups_capacity_wh").notNull().default(1000),
    systemLoadWatts: double("system_load_watts").notNull().default(250),
    groupsJson: text("groups_json").notNull(),
    resultJson: text("result_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("cctv_project_org_idx").on(t.organizationId),
    index("cctv_project_customer_idx").on(t.customerId),
  ],
);

export const cctvScenario = mysqlTable(
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
    retentionDays: int("retention_days").notNull(),
    reservePercent: double("reserve_percent").notNull(),
    notes: text("notes"),
    resultJson: text("result_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("cctv_scenario_org_idx").on(t.organizationId),
    index("cctv_scenario_project_idx").on(t.projectId),
  ],
);
