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

export const desktopPlatformEnum = pgEnum("desktop_platform", ["windows", "macos", "linux"]);
export const desktopArchitectureEnum = pgEnum("desktop_architecture", ["x86_64", "aarch64"]);
export const desktopChannelEnum = pgEnum("desktop_update_channel", ["internal", "beta", "stable"]);
export const desktopReleaseStatusEnum = pgEnum("desktop_release_status", [
  "draft",
  "testing",
  "published",
  "paused",
  "withdrawn",
  "archived",
]);

export const desktopApiToken = pgTable(
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

export const desktopInstallation = pgTable(
  "desktop_installation",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    installationId: varchar("installation_id", { length: 64 }).notNull(),
    organizationId: varchar("organization_id", { length: 36 }).references(() => organization.id, {
      onDelete: "set null",
    }),
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    deviceName: varchar("device_name", { length: 255 }),
    platform: desktopPlatformEnum("platform").notNull(),
    architecture: desktopArchitectureEnum("architecture").notNull(),
    osVersion: varchar("os_version", { length: 128 }),
    currentVersion: varchar("current_version", { length: 32 }),
    updateChannel: desktopChannelEnum("update_channel").notNull().default("stable"),
    lastSeenAt: timestamp("last_seen_at"),
    lastUpdateCheckAt: timestamp("last_update_check_at"),
    lastOfferedVersion: varchar("last_offered_version", { length: 32 }),
    lastInstalledVersion: varchar("last_installed_version", { length: 32 }),
    updateStatus: varchar("update_status", { length: 32 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("desktop_installation_id_uidx").on(t.installationId),
    index("desktop_installation_org_idx").on(t.organizationId),
    index("desktop_installation_user_idx").on(t.userId),
  ],
);

export const desktopRelease = pgTable(
  "desktop_release",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    version: varchar("version", { length: 32 }).notNull(),
    channel: desktopChannelEnum("channel").notNull().default("internal"),
    title: varchar("title", { length: 255 }).notNull(),
    releaseNotes: text("release_notes"),
    status: desktopReleaseStatusEnum("status").notNull().default("draft"),
    isMandatory: boolean("is_mandatory").notNull().default(false),
    minimumSupportedVersion: varchar("minimum_supported_version", { length: 32 }),
    rolloutPercentage: integer("rollout_percentage").notNull().default(100),
    publishedAt: timestamp("published_at"),
    availableFrom: timestamp("available_from"),
    expiresAt: timestamp("expires_at"),
    createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    publishedById: varchar("published_by_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("desktop_release_version_channel_uidx").on(t.version, t.channel),
    index("desktop_release_channel_idx").on(t.channel),
    index("desktop_release_status_idx").on(t.status),
  ],
);

export const desktopReleaseArtifact = pgTable(
  "desktop_release_artifact",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    desktopReleaseId: varchar("desktop_release_id", { length: 36 })
      .notNull()
      .references(() => desktopRelease.id, { onDelete: "cascade" }),
    platform: desktopPlatformEnum("platform").notNull(),
    architecture: desktopArchitectureEnum("architecture").notNull(),
    packageType: varchar("package_type", { length: 32 }).notNull(),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    downloadUrlReference: text("download_url_reference"),
    signature: text("signature"),
    sha256: varchar("sha256", { length: 64 }),
    fileSize: integer("file_size"),
    originalFileName: varchar("original_file_name", { length: 255 }),
    codeSigningStatus: varchar("code_signing_status", { length: 32 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("desktop_artifact_release_idx").on(t.desktopReleaseId),
    index("desktop_artifact_platform_arch_idx").on(t.platform, t.architecture),
  ],
);

export const desktopUpdateEvent = pgTable(
  "desktop_update_event",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    desktopInstallationId: varchar("desktop_installation_id", { length: 36 })
      .notNull()
      .references(() => desktopInstallation.id, { onDelete: "cascade" }),
    desktopReleaseId: varchar("desktop_release_id", { length: 36 }).references(() => desktopRelease.id, {
      onDelete: "set null",
    }),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    fromVersion: varchar("from_version", { length: 32 }),
    toVersion: varchar("to_version", { length: 32 }),
    errorCode: varchar("error_code", { length: 64 }),
    errorMessage: text("error_message"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("desktop_update_event_installation_idx").on(t.desktopInstallationId),
    index("desktop_update_event_release_idx").on(t.desktopReleaseId),
  ],
);
