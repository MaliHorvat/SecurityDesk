import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const planIdEnum = pgEnum("plan_id", [
  "starter",
  "professional",
  "integrator",
  "enterprise",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "platform_super_admin",
  "organization_owner",
  "organization_admin",
  "technician",
  "viewer",
  "customer_user",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
]);

export const user = pgTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: varchar("active_organization_id", { length: 36 }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organization = pgTable(
  "organization",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    planId: planIdEnum("plan_id").notNull().default("starter"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("organization_slug_uidx").on(t.slug)],
);

export const member = pgTable(
  "member",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // varchar: Better Auth uses owner/admin/member; app maps to PlatformRole in session layer.
    // Keep memberRoleEnum in schema file for backwards-compatible PG installs; column is varchar.
    role: varchar("role", { length: 64 }).notNull().default("organization_owner"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("member_org_idx").on(t.organizationId),
    index("member_user_idx").on(t.userId),
    uniqueIndex("member_org_user_uidx").on(t.organizationId, t.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 64 }),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: varchar("inviter_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("invitation_org_idx").on(t.organizationId)],
);

export const subscription = pgTable(
  "subscription",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    planId: planIdEnum("plan_id").notNull().default("starter"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("subscription_org_idx").on(t.organizationId)],
);

export const moduleEntitlement = pgTable(
  "module_entitlement",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    moduleId: varchar("module_id", { length: 64 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("module_entitlement_uidx").on(t.organizationId, t.moduleId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 }),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }),
    entityId: varchar("entity_id", { length: 36 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_org_idx").on(t.organizationId),
    index("audit_actor_idx").on(t.actorUserId),
    index("audit_created_idx").on(t.createdAt),
  ],
);

export const organizationSettings = pgTable("organization_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 8 }).notNull().default("sl"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Ljubljana"),
  brandPrimaryColor: varchar("brand_primary_color", { length: 16 }).default("#1d4ed8"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dashboardStat = pgTable(
  "dashboard_stat",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customersCount: integer("customers_count").notNull().default(0),
    sitesCount: integer("sites_count").notNull().default(0),
    devicesCount: integer("devices_count").notNull().default(0),
    openTicketsCount: integer("open_tickets_count").notNull().default(0),
    onlineDevicesCount: integer("online_devices_count").notNull().default(0),
    offlineDevicesCount: integer("offline_devices_count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dashboard_stat_org_uidx").on(t.organizationId)],
);
