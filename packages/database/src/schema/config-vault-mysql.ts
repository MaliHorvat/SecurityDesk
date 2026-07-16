import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { organization, user } from "./mysql";
import { device } from "./securitydesk-mysql";

export const configurationBackup = mysqlTable(
  "configuration_backup",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizationId: varchar("organization_id", { length: 36 })
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 36 })
      .notNull()
      .references(() => device.id, { onDelete: "cascade" }),
    version: int("version").notNull(),
    source: varchar("source", { length: 128 }).notNull(),
    label: varchar("label", { length: 255 }),
    note: text("note"),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    encryptedSecret: text("encrypted_secret").notNull(),
    lastCheckedAt: timestamp("last_checked_at"),
    lastCheckedByUserId: varchar("last_checked_by_user_id", { length: 36 }).references(
      () => user.id,
      { onDelete: "set null" },
    ),
    isLastChecked: boolean("is_last_checked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("configuration_backup_org_idx").on(t.organizationId),
    index("configuration_backup_device_idx").on(t.deviceId),
    uniqueIndex("configuration_backup_device_version_uidx").on(t.deviceId, t.version),
  ],
);

