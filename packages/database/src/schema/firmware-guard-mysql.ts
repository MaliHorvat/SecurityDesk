import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { organization, user } from "./mysql";
import { manufacturer, deviceType, device } from "./securitydesk-mysql";

export const firmwareAdvisory = mysqlTable(
  "firmware_advisory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    vendor: varchar("vendor", { length: 255 }).notNull(),
    description: text("description"),
    severity: mysqlEnum("severity", ["low", "normal", "high", "urgent"]).notNull().default("normal"),
    recommendedAction: text("recommended_action"),
    officialUrl: varchar("official_url", { length: 1024 }),
    dueAt: timestamp("due_at"),
    lastCheckedAt: timestamp("last_checked_at"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("firmware_advisory_org_idx").on(t.organizationId),
    index("firmware_advisory_status_idx").on(t.status),
  ],
);

export const firmwareAffectedModel = mysqlTable(
  "firmware_affected_model",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    advisoryId: varchar("advisory_id", { length: 36 })
      .notNull()
      .references(() => firmwareAdvisory.id, { onDelete: "cascade" }),
    manufacturerId: varchar("manufacturer_id", { length: 36 })
      .notNull()
      .references(() => manufacturer.id, { onDelete: "cascade" }),
    deviceTypeId: varchar("device_type_id", { length: 36 })
      .notNull()
      .references(() => deviceType.id, { onDelete: "cascade" }),
    versionPattern: varchar("version_pattern", { length: 128 }).notNull(),
    matchStrategy: mysqlEnum("match_strategy", ["equals", "starts_with"]).notNull().default("equals"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("firmware_affected_model_org_idx").on(t.organizationId),
    index("firmware_affected_model_advisory_idx").on(t.advisoryId),
    uniqueIndex("firmware_affected_model_uidx").on(t.advisoryId, t.manufacturerId, t.deviceTypeId, t.versionPattern),
  ],
);

export const remediationCampaign = mysqlTable(
  "remediation_campaign",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    advisoryId: varchar("advisory_id", { length: 36 })
      .notNull()
      .references(() => firmwareAdvisory.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    status: mysqlEnum("status", ["draft", "active", "completed", "cancelled"]).notNull().default("draft"),
    dueAt: timestamp("due_at"),
    notes: text("notes"),
    createdByUserId: varchar("created_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("remediation_campaign_org_idx").on(t.organizationId),
    index("remediation_campaign_advisory_idx").on(t.advisoryId),
  ],
);

export const firmwareMatch = mysqlTable(
  "firmware_match",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    advisoryId: varchar("advisory_id", { length: 36 })
      .notNull()
      .references(() => firmwareAdvisory.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 })
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    matchedFirmware: varchar("matched_firmware", { length: 128 }).notNull(),
    matchStrategy: mysqlEnum("match_strategy", ["equals", "starts_with"]).notNull().default("equals"),
    status: mysqlEnum("status", ["open", "in_campaign", "resolved"]).notNull().default("open"),
    campaignId: varchar("campaign_id", { length: 36 }).references(() => remediationCampaign.id, {
      onDelete: "set null",
    }),
    checkedAt: timestamp("checked_at"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("firmware_match_org_idx").on(t.organizationId),
    index("firmware_match_advisory_idx").on(t.advisoryId),
    index("firmware_match_device_idx").on(t.deviceId),
    uniqueIndex("firmware_match_uidx").on(t.advisoryId, t.deviceId),
  ],
);

