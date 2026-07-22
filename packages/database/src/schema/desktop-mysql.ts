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
  foreignKey,
} from "drizzle-orm/mysql-core";
import { organization, user } from "./mysql";

export const desktopApiToken = mysqlTable(
  "desktop_api_token",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: varchar("organization_id", { length: 36 }).references(() => organization.id, {
      onDelete: "set null",
    }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }),
    expiresAt: timestamp("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [
    index("desktop_api_token_user_idx").on(t.userId),
    uniqueIndex("desktop_api_token_hash_uidx").on(t.tokenHash),
  ],
);

export const desktopInstallation = mysqlTable(
  "desktop_installation",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    installationId: varchar("installation_id", { length: 64 }).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).references(() => organization.id, {
      onDelete: "set null",
    }),
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    deviceName: varchar("device_name", { length: 255 }),
    platform: mysqlEnum("platform", ["windows", "macos", "linux"]).notNull(),
    architecture: mysqlEnum("architecture", ["x86_64", "aarch64"]).notNull(),
    osVersion: varchar("os_version", { length: 128 }),
    currentVersion: varchar("current_version", { length: 32 }),
    updateChannel: mysqlEnum("update_channel", ["internal", "beta", "stable"]).notNull().default("stable"),
    lastSeenAt: timestamp("last_seen_at"),
    lastUpdateCheckAt: timestamp("last_update_check_at"),
    lastOfferedVersion: varchar("last_offered_version", { length: 32 }),
    lastInstalledVersion: varchar("last_installed_version", { length: 32 }),
    updateStatus: varchar("update_status", { length: 32 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("desktop_installation_id_uidx").on(t.installationId),
    index("desktop_installation_org_idx").on(t.organizationId),
    index("desktop_installation_user_idx").on(t.userId),
  ],
);

export const desktopRelease = mysqlTable(
  "desktop_release",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    version: varchar("version", { length: 32 }).notNull(),
    channel: mysqlEnum("channel", ["internal", "beta", "stable"]).notNull().default("internal"),
    title: varchar("title", { length: 255 }).notNull(),
    releaseNotes: text("release_notes"),
    status: mysqlEnum("status", ["draft", "testing", "published", "paused", "withdrawn", "archived"])
      .notNull()
      .default("draft"),
    isMandatory: boolean("is_mandatory").notNull().default(false),
    minimumSupportedVersion: varchar("minimum_supported_version", { length: 32 }),
    rolloutPercentage: int("rollout_percentage").notNull().default(100),
    publishedAt: timestamp("published_at"),
    availableFrom: timestamp("available_from"),
    expiresAt: timestamp("expires_at"),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    publishedById: varchar("published_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [
    uniqueIndex("desktop_release_version_channel_uidx").on(t.version, t.channel),
    index("desktop_release_channel_idx").on(t.channel),
    index("desktop_release_status_idx").on(t.status),
  ],
);

export const desktopReleaseArtifact = mysqlTable(
  "desktop_release_artifact",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    desktopReleaseId: varchar("desktop_release_id", { length: 36 }).notNull(),
    platform: mysqlEnum("platform", ["windows", "macos", "linux"]).notNull(),
    architecture: mysqlEnum("architecture", ["x86_64", "aarch64"]).notNull(),
    packageType: varchar("package_type", { length: 32 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    downloadUrlReference: text("download_url_reference"),
    signature: text("signature"),
    sha256: varchar("sha256", { length: 64 }),
    fileSize: int("file_size"),
    originalFileName: varchar("original_file_name", { length: 255 }),
    codeSigningStatus: varchar("code_signing_status", { length: 32 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.desktopReleaseId],
      foreignColumns: [desktopRelease.id],
      name: "desktop_artifact_release_id_fk",
    }).onDelete("cascade"),
    index("desktop_artifact_release_idx").on(t.desktopReleaseId),
    index("desktop_artifact_platform_arch_idx").on(t.platform, t.architecture),
  ],
);

export const desktopUpdateEvent = mysqlTable(
  "desktop_update_event",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    desktopInstallationId: varchar("desktop_installation_id", { length: 36 }).notNull(),
    desktopReleaseId: varchar("desktop_release_id", { length: 36 }),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    fromVersion: varchar("from_version", { length: 32 }),
    toVersion: varchar("to_version", { length: 32 }),
    errorCode: varchar("error_code", { length: 64 }),
    errorMessage: text("error_message"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.desktopInstallationId],
      foreignColumns: [desktopInstallation.id],
      name: "desktop_update_event_installation_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.desktopReleaseId],
      foreignColumns: [desktopRelease.id],
      name: "desktop_update_event_release_fk",
    }).onDelete("set null"),
    index("desktop_update_event_installation_idx").on(t.desktopInstallationId),
    index("desktop_update_event_release_idx").on(t.desktopReleaseId),
  ],
);
