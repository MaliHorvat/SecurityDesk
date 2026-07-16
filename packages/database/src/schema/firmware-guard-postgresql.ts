import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./postgresql";
import { manufacturer, deviceType, device } from "./securitydesk-postgresql";

export const firmwareSeverityEnum = pgEnum("firmware_severity", ["low", "normal", "high", "urgent"]);
export const firmwareMatchStatusEnum = pgEnum("firmware_match_status", ["open", "in_campaign", "resolved"]);
export const remediationCampaignStatusEnum = pgEnum("remediation_campaign_status", [
  "draft",
  "active",
  "completed",
  "cancelled",
]);
export const firmwareVersionMatchStrategyEnum = pgEnum("firmware_version_match_strategy", [
  "equals",
  "starts_with",
]);

export const firmwareAdvisory = pgTable(
  "firmware_advisory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    vendor: varchar("vendor", { length: 255 }).notNull(),
    description: text("description"),
    severity: firmwareSeverityEnum("severity").notNull().default("normal"),
    recommendedAction: text("recommended_action"),
    officialUrl: varchar("official_url", { length: 1024 }),
    dueAt: timestamp("due_at"),
    lastCheckedAt: timestamp("last_checked_at"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("firmware_advisory_org_idx").on(t.organizationId),
    index("firmware_advisory_status_idx").on(t.status),
  ],
);

export const firmwareAffectedModel = pgTable(
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
    matchStrategy: firmwareVersionMatchStrategyEnum("match_strategy").notNull().default("equals"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("firmware_affected_model_org_idx").on(t.organizationId),
    index("firmware_affected_model_advisory_idx").on(t.advisoryId),
    uniqueIndex("firmware_affected_model_uidx").on(t.advisoryId, t.manufacturerId, t.deviceTypeId, t.versionPattern),
  ],
);

export const remediationCampaign = pgTable(
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
    status: remediationCampaignStatusEnum("status").notNull().default("draft"),
    dueAt: timestamp("due_at"),
    notes: text("notes"),
    createdByUserId: varchar("created_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("remediation_campaign_org_idx").on(t.organizationId),
    index("remediation_campaign_advisory_idx").on(t.advisoryId),
  ],
);

export const firmwareMatch = pgTable(
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
    matchStrategy: firmwareVersionMatchStrategyEnum("match_strategy").notNull().default("equals"),
    status: firmwareMatchStatusEnum("status").notNull().default("open"),
    campaignId: varchar("campaign_id", { length: 36 }).references(() => remediationCampaign.id, {
      onDelete: "set null",
    }),
    checkedAt: timestamp("checked_at"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("firmware_match_org_idx").on(t.organizationId),
    index("firmware_match_advisory_idx").on(t.advisoryId),
    index("firmware_match_device_idx").on(t.deviceId),
    uniqueIndex("firmware_match_uidx").on(t.advisoryId, t.deviceId),
  ],
);

