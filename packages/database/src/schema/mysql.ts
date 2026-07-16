import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: varchar("active_organization_id", { length: 36 }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = mysqlTable(
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
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = mysqlTable("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const organization = mysqlTable(
  "organization",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    planId: mysqlEnum("plan_id", ["starter", "professional", "integrator", "enterprise"])
      .notNull()
      .default("starter"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [uniqueIndex("organization_slug_uidx").on(t.slug)],
);

export const member = mysqlTable(
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
    role: varchar("role", { length: 64 }).notNull().default("organization_owner"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    index("member_org_idx").on(t.organizationId),
    index("member_user_idx").on(t.userId),
    uniqueIndex("member_org_user_uidx").on(t.organizationId, t.userId),
  ],
);

export const invitation = mysqlTable(
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

export const subscription = mysqlTable(
  "subscription",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    planId: mysqlEnum("plan_id", ["starter", "professional", "integrator", "enterprise"])
      .notNull()
      .default("starter"),
    status: mysqlEnum("status", ["active", "trialing", "past_due", "canceled", "incomplete"])
      .notNull()
      .default("active"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [index("subscription_org_idx").on(t.organizationId)],
);

export const moduleEntitlement = mysqlTable(
  "module_entitlement",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    moduleId: varchar("module_id", { length: 64 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("module_entitlement_uidx").on(t.organizationId, t.moduleId),
  ],
);

export const auditLog = mysqlTable(
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

export const organizationSettings = mysqlTable("organization_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: "cascade" }),
  locale: varchar("locale", { length: 8 }).notNull().default("sl"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Europe/Ljubljana"),
  brandPrimaryColor: varchar("brand_primary_color", { length: 16 }).default("#1d4ed8"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/** Placeholder counts for Phase 1 dashboard until Phase 2 entities land. */
export const dashboardStat = mysqlTable(
  "dashboard_stat",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    customersCount: int("customers_count").notNull().default(0),
    sitesCount: int("sites_count").notNull().default(0),
    devicesCount: int("devices_count").notNull().default(0),
    openTicketsCount: int("open_tickets_count").notNull().default(0),
    onlineDevicesCount: int("online_devices_count").notNull().default(0),
    offlineDevicesCount: int("offline_devices_count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [uniqueIndex("dashboard_stat_org_uidx").on(t.organizationId)],
);
