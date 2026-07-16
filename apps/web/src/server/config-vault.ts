"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import {
  configurationBackupInputSchema,
  type ConfigurationBackupInput,
} from "@securitydesk/shared";
import { decryptSecret, encryptSecret, sha256Hex } from "@securitydesk/shared/crypto";
import { requireOrgSession } from "@/lib/org-context";
import { writeAuditLog } from "@/server/audit";
import type { ActionResult } from "@/server/customers";

export type ConfigurationBackupListItem = {
  id: string;
  version: number;
  source: string;
  label: string | null;
  note: string | null;
  checksumSha256: string;
  isLastChecked: boolean;
  lastCheckedAt: Date | null;
  lastCheckedByUserId: string | null;
  createdAt: Date;
};

function getEncryptionKey(): string | null {
  const key = process.env.ENCRYPTION_KEY;
  return key ?? null;
}

export async function listConfigurationBackupsByDevice(deviceId: string): Promise<ConfigurationBackupListItem[]> {
  const session = await requireOrgSession("config_vault:read");
  const { db, schema } = getDb();
  const orgId = session.organization.id;

  if (!deviceId?.trim()) return [];

  const deviceOk = await db
    .select({ id: schema.device.id })
    .from(schema.device)
    .where(and(eq(schema.device.id, deviceId), eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)))
    .limit(1);
  if (!deviceOk[0]) return [];

  return (await db
    .select({
      id: schema.configurationBackup.id,
      version: schema.configurationBackup.version,
      source: schema.configurationBackup.source,
      label: schema.configurationBackup.label,
      note: schema.configurationBackup.note,
      checksumSha256: schema.configurationBackup.checksumSha256,
      isLastChecked: schema.configurationBackup.isLastChecked,
      lastCheckedAt: schema.configurationBackup.lastCheckedAt,
      lastCheckedByUserId: schema.configurationBackup.lastCheckedByUserId,
      createdAt: schema.configurationBackup.createdAt,
    })
    .from(schema.configurationBackup)
    .where(
      and(
        eq(schema.configurationBackup.organizationId, orgId),
        eq(schema.configurationBackup.deviceId, deviceId),
        isNull(schema.configurationBackup.deletedAt),
      ),
    )
    .orderBy(desc(schema.configurationBackup.version))) as ConfigurationBackupListItem[];
}

export async function createConfigurationBackup(raw: ConfigurationBackupInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireOrgSession("config_vault:write");

  const parsed = configurationBackupInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." };
  }

  const key = getEncryptionKey();
  if (!key) return { ok: false, error: "Manjka ENCRYPTION_KEY." };

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const deviceId = parsed.data.deviceId;
  const now = new Date();

  const device = await db
    .select({ id: schema.device.id })
    .from(schema.device)
    .where(and(eq(schema.device.id, deviceId), eq(schema.device.organizationId, orgId), isNull(schema.device.deletedAt)))
    .limit(1);
  if (!device[0]) return { ok: false, error: "Naprava ni najdena." };

  const [{ maxVersion }] = await db
    .select({
      maxVersion: sql<number>`max(${schema.configurationBackup.version})`,
    })
    .from(schema.configurationBackup)
    .where(
      and(
        eq(schema.configurationBackup.organizationId, orgId),
        eq(schema.configurationBackup.deviceId, deviceId),
        isNull(schema.configurationBackup.deletedAt),
      ),
    );

  const nextVersion = Number(maxVersion ?? 0) + 1;
  const checksumSha256 = sha256Hex(parsed.data.configurationText);
  const encryptedSecret = encryptSecret(parsed.data.configurationText, key);

  // Only one "last checked" marker per device (latest backup).
  await db
    .update(schema.configurationBackup)
    .set({ isLastChecked: false })
    .where(
      and(
        eq(schema.configurationBackup.organizationId, orgId),
        eq(schema.configurationBackup.deviceId, deviceId),
        isNull(schema.configurationBackup.deletedAt),
      ),
    );

  const backupId = randomUUID();
  await db.insert(schema.configurationBackup).values({
    id: backupId,
    organizationId: orgId,
    deviceId,
    version: nextVersion,
    source: parsed.data.source,
    label: parsed.data.label?.trim() ? parsed.data.label.trim() : null,
    note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
    checksumSha256,
    encryptedSecret,
    lastCheckedAt: now,
    lastCheckedByUserId: session.user.id,
    isLastChecked: true,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "config_vault.backup.create",
    entityType: "configuration_backup",
    entityId: backupId,
  });

  revalidatePath("/config-vault");
  return { ok: true, data: { id: backupId } };
}

export async function getConfigurationBackupPlaintext(
  backupId: string,
): Promise<ActionResult<{ plaintext: string }>> {
  const session = await requireOrgSession("config_vault:read");

  if (!backupId?.trim()) return { ok: false, error: "Neveljaven ID." };

  const key = getEncryptionKey();
  if (!key) return { ok: false, error: "Manjka ENCRYPTION_KEY." };

  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const [row] = await db
    .select()
    .from(schema.configurationBackup)
    .where(and(eq(schema.configurationBackup.organizationId, orgId), eq(schema.configurationBackup.id, backupId), isNull(schema.configurationBackup.deletedAt)))
    .limit(1);

  if (!row) return { ok: false, error: "Zapis ni najden." };

  try {
    const plaintext = decryptSecret(row.encryptedSecret, key);
    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "config_vault.backup.read",
      entityType: "configuration_backup",
      entityId: backupId,
      metadata: { version: row.version },
    });
    return { ok: true, data: { plaintext } };
  } catch {
    return { ok: false, error: "Ni bilo mogoče dešifrirati konfiguracije." };
  }
}

export async function compareConfigurationBackups(
  leftId: string,
  rightId: string,
): Promise<
  ActionResult<{
    left: { plaintext: string; checksumSha256: string };
    right: { plaintext: string; checksumSha256: string };
  }>
> {
  const session = await requireOrgSession("config_vault:read");

  const key = getEncryptionKey();
  if (!key) return { ok: false, error: "Manjka ENCRYPTION_KEY." };

  if (!leftId?.trim() || !rightId?.trim()) {
    return { ok: false, error: "Neveljavni ID-ji za primerjavo." };
  }

  const { db, schema } = getDb();
  const orgId = session.organization.id;

  const rows = (await db
    .select()
    .from(schema.configurationBackup)
    .where(
      and(
        eq(schema.configurationBackup.organizationId, orgId),
        isNull(schema.configurationBackup.deletedAt),
        or(eq(schema.configurationBackup.id, leftId), eq(schema.configurationBackup.id, rightId)),
      ),
    )) as typeof schema.configurationBackup.$inferSelect[];

  const left = rows.find((r) => r.id === leftId);
  const right = rows.find((r) => r.id === rightId);
  if (!left || !right) {
    return { ok: false, error: "Ena od verzij ni najdena." };
  }

  try {
    const leftPlaintext = decryptSecret(left.encryptedSecret, key);
    const rightPlaintext = decryptSecret(right.encryptedSecret, key);

    await writeAuditLog({
      organizationId: orgId,
      actorUserId: session.user.id,
      action: "config_vault.backup.compare",
      entityType: "configuration_backup",
      entityId: leftId,
      metadata: { rightId },
    });

    return {
      ok: true,
      data: {
        left: { plaintext: leftPlaintext, checksumSha256: left.checksumSha256 },
        right: { plaintext: rightPlaintext, checksumSha256: right.checksumSha256 },
      },
    };
  } catch {
    return { ok: false, error: "Ni bilo mogoče dešifrirati konfiguracij." };
  }
}

export async function deleteConfigurationBackup(backupId: string): Promise<ActionResult> {
  const session = await requireOrgSession("config_vault:write");
  if (!backupId?.trim()) return { ok: false, error: "Neveljaven ID." };

  const { db, schema } = getDb();
  const orgId = session.organization.id;
  const now = new Date();

  const [existing] = await db
    .select({ id: schema.configurationBackup.id })
    .from(schema.configurationBackup)
    .where(and(eq(schema.configurationBackup.id, backupId), eq(schema.configurationBackup.organizationId, orgId), isNull(schema.configurationBackup.deletedAt)))
    .limit(1);
  if (!existing) return { ok: false, error: "Zapis ni najden." };

  await db
    .update(schema.configurationBackup)
    .set({ deletedAt: now })
    .where(and(eq(schema.configurationBackup.id, backupId), eq(schema.configurationBackup.organizationId, orgId)));

  await writeAuditLog({
    organizationId: orgId,
    actorUserId: session.user.id,
    action: "config_vault.backup.delete",
    entityType: "configuration_backup",
    entityId: backupId,
  });

  revalidatePath("/config-vault");
  return { ok: true };
}

