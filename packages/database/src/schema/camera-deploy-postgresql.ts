import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { organization } from "./postgresql";
import { customer, site, device } from "./securitydesk-postgresql";

export const cameraDeploySessionStatusEnum = pgEnum("camera_deploy_session_status", [
  "draft",
  "planned",
  "deploying",
  "completed",
  "cancelled",
]);

export const cameraDeployTargetStatusEnum = pgEnum("camera_deploy_target_status", [
  "pending",
  "configured",
  "deployed",
  "failed",
  "skipped",
]);

export const cameraDeploySession = pgTable(
  "camera_deploy_session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 }).references(() => customer.id, {
      onDelete: "set null",
    }),
    siteId: varchar("site_id", { length: 36 })
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: cameraDeploySessionStatusEnum("status").notNull().default("draft"),
    ipRangeStart: varchar("ip_range_start", { length: 64 }),
    ipRangeEnd: varchar("ip_range_end", { length: 64 }),
    subnetMask: varchar("subnet_mask", { length: 64 }),
    gateway: varchar("gateway", { length: 64 }),
    dnsServers: varchar("dns_servers", { length: 255 }),
    defaultUsername: varchar("default_username", { length: 128 }),
    encryptedDefaultPassword: text("encrypted_default_password"),
    vlanId: integer("vlan_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("camera_deploy_session_org_idx").on(t.organizationId),
    index("camera_deploy_session_site_idx").on(t.siteId),
  ],
);

export const cameraDeployTarget = pgTable(
  "camera_deploy_target",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 36 })
      .notNull()
      .references(() => cameraDeploySession.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 }).references(() => device.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    locationLabel: varchar("location_label", { length: 255 }),
    manufacturer: varchar("manufacturer", { length: 255 }),
    model: varchar("model", { length: 255 }),
    macAddress: varchar("mac_address", { length: 64 }),
    serialNumber: varchar("serial_number", { length: 128 }),
    currentIp: varchar("current_ip", { length: 64 }),
    targetIp: varchar("target_ip", { length: 64 }),
    username: varchar("username", { length: 128 }),
    encryptedPassword: text("encrypted_password"),
    channelNumber: integer("channel_number"),
    status: cameraDeployTargetStatusEnum("status").notNull().default("pending"),
    sortOrder: integer("sort_order").notNull().default(0),
    errorMessage: text("error_message"),
    deployedAt: timestamp("deployed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("camera_deploy_target_org_idx").on(t.organizationId),
    index("camera_deploy_target_session_idx").on(t.sessionId),
    index("camera_deploy_target_device_idx").on(t.deviceId),
  ],
);
