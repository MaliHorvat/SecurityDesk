import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { organization, user } from "./mysql";
import { site, device } from "./securitydesk-mysql";

export const monitoringAgent = mysqlTable(
  "monitoring_agent",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    hostname: varchar("hostname", { length: 255 }),
    version: varchar("version", { length: 64 }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pending", "active", "offline", "revoked"])
      .notNull()
      .default("pending"),
    lastHeartbeatAt: timestamp("last_heartbeat_at"),
    lastIp: varchar("last_ip", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("monitoring_agent_org_idx").on(t.organizationId),
    index("monitoring_agent_site_idx").on(t.siteId),
    uniqueIndex("monitoring_agent_token_uidx").on(t.tokenHash),
  ],
);

export const agentEnrollmentToken = mysqlTable(
  "agent_enrollment_token",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    createdByUserId: varchar("created_by_user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    label: varchar("label", { length: 255 }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    usedByAgentId: varchar("used_by_agent_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("agent_enrollment_token_org_idx").on(t.organizationId),
    uniqueIndex("agent_enrollment_token_hash_uidx").on(t.tokenHash),
  ],
);

export const monitoringCheck = mysqlTable(
  "monitoring_check",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 })
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id", { length: 36 }).references(() => monitoringAgent.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    checkType: mysqlEnum("check_type", ["ping", "tcp", "http", "https", "rtsp"])
      .notNull()
      .default("ping"),
    targetHost: varchar("target_host", { length: 255 }).notNull(),
    targetPort: int("target_port"),
    targetPath: varchar("target_path", { length: 512 }),
    intervalSeconds: int("interval_seconds").notNull().default(60),
    timeoutMs: int("timeout_ms").notNull().default(5000),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("monitoring_check_org_idx").on(t.organizationId),
    index("monitoring_check_device_idx").on(t.deviceId),
    index("monitoring_check_agent_idx").on(t.agentId),
  ],
);

export const monitoringCheckResult = mysqlTable(
  "monitoring_check_result",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    checkId: varchar("check_id", { length: 36 })
      .notNull()
      .references(() => monitoringCheck.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 })
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    agentId: varchar("agent_id", { length: 36 }).references(() => monitoringAgent.id, {
      onDelete: "set null",
    }),
    status: mysqlEnum("status", ["online", "offline", "degraded", "error", "unknown"])
      .notNull()
      .default("unknown"),
    latencyMs: int("latency_ms"),
    message: text("message"),
    checkedAt: timestamp("checked_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("monitoring_check_result_org_idx").on(t.organizationId),
    index("monitoring_check_result_check_idx").on(t.checkId),
    index("monitoring_check_result_device_idx").on(t.deviceId),
    index("monitoring_check_result_checked_idx").on(t.checkedAt),
  ],
);
