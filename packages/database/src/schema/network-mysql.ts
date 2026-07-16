import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  double,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { organization } from "./mysql";
import { customer, site, device } from "./securitydesk-mysql";

export const networkSwitch = mysqlTable(
  "network_switch",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 36 }).references(() => customer.id, {
      onDelete: "set null",
    }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    deviceId: varchar("device_id", { length: 36 }).references(() => device.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    manufacturer: varchar("manufacturer", { length: 255 }),
    model: varchar("model", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    macAddress: varchar("mac_address", { length: 64 }),
    serialNumber: varchar("serial_number", { length: 128 }),
    portCount: int("port_count").notNull().default(24),
    poeBudgetWatts: double("poe_budget_watts").notNull().default(0),
    location: varchar("location", { length: 255 }),
    rack: varchar("rack", { length: 128 }),
    uPosition: varchar("u_position", { length: 32 }),
    firmware: varchar("firmware", { length: 128 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("network_switch_org_idx").on(t.organizationId),
    index("network_switch_site_idx").on(t.siteId),
  ],
);

export const networkVlan = mysqlTable(
  "network_vlan",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    vlanId: int("vlan_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    subnetCidr: varchar("subnet_cidr", { length: 64 }),
    gateway: varchar("gateway", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("network_vlan_org_idx").on(t.organizationId),
    uniqueIndex("network_vlan_org_vlan_uidx").on(t.organizationId, t.vlanId, t.siteId),
  ],
);

export const networkPort = mysqlTable(
  "network_port",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    switchId: varchar("switch_id", { length: 36 })
      .notNull()
      .references(() => networkSwitch.id, { onDelete: "cascade" }),
    portNumber: int("port_number").notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", [
      "up",
      "down",
      "disabled",
      "error",
      "unknown",
    ])
      .notNull()
      .default("unknown"),
    role: mysqlEnum("role", ["access", "trunk", "uplink", "unused"])
      .notNull()
      .default("unused"),
    speedMbps: int("speed_mbps"),
    duplex: varchar("duplex", { length: 16 }),
    poeState: mysqlEnum("poe_state", ["off", "on", "fault", "denied", "unknown"])
      .notNull()
      .default("unknown"),
    poeWatts: double("poe_watts").notNull().default(0),
    accessVlan: int("access_vlan"),
    taggedVlans: text("tagged_vlans"),
    connectedDeviceId: varchar("connected_device_id", { length: 36 }).references(() => device.id, {
      onDelete: "set null",
    }),
    connectedDeviceLabel: varchar("connected_device_label", { length: 255 }),
    lastChangedAt: timestamp("last_changed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("network_port_org_idx").on(t.organizationId),
    index("network_port_switch_idx").on(t.switchId),
    uniqueIndex("network_port_switch_number_uidx").on(t.switchId, t.portNumber),
  ],
);

export const networkIpAssignment = mysqlTable(
  "network_ip_assignment",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    siteId: varchar("site_id", { length: 36 }).references(() => site.id, { onDelete: "set null" }),
    vlanId: int("vlan_id"),
    ipAddress: varchar("ip_address", { length: 64 }).notNull(),
    hostname: varchar("hostname", { length: 255 }),
    deviceId: varchar("device_id", { length: 36 }).references(() => device.id, {
      onDelete: "set null",
    }),
    macAddress: varchar("mac_address", { length: 64 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("network_ip_org_idx").on(t.organizationId),
    index("network_ip_site_idx").on(t.siteId),
    uniqueIndex("network_ip_org_ip_uidx").on(t.organizationId, t.ipAddress, t.siteId),
  ],
);
