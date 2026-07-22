import { z } from "zod";

/** Release channels — internal (dogfood) → beta → stable (general availability). */
export const DESKTOP_CHANNELS = ["internal", "beta", "stable"] as const;
export const desktopChannelSchema = z.enum(DESKTOP_CHANNELS);
export type DesktopChannel = z.infer<typeof desktopChannelSchema>;

export const DESKTOP_CHANNEL_LABELS: Record<DesktopChannel, string> = {
  internal: "Interno",
  beta: "Beta",
  stable: "Stabilno",
};

export const DESKTOP_RELEASE_STATUSES = [
  "draft",
  "testing",
  "published",
  "paused",
  "withdrawn",
  "archived",
] as const;
export const desktopReleaseStatusSchema = z.enum(DESKTOP_RELEASE_STATUSES);
export type DesktopReleaseStatus = z.infer<typeof desktopReleaseStatusSchema>;

export const DESKTOP_RELEASE_STATUS_LABELS: Record<DesktopReleaseStatus, string> = {
  draft: "Osnutek",
  testing: "V testiranju",
  published: "Objavljeno",
  paused: "Začasno ustavljeno",
  withdrawn: "Umaknjeno",
  archived: "Arhivirano",
};

export const DESKTOP_PLATFORMS = ["windows", "macos", "linux"] as const;
export const desktopPlatformSchema = z.enum(DESKTOP_PLATFORMS);
export type DesktopPlatform = z.infer<typeof desktopPlatformSchema>;

export const DESKTOP_ARCHITECTURES = ["x86_64", "aarch64"] as const;
export const desktopArchitectureSchema = z.enum(DESKTOP_ARCHITECTURES);
export type DesktopArchitecture = z.infer<typeof desktopArchitectureSchema>;

export const desktopReleaseCreateInputSchema = z.object({
  version: z
    .string()
    .min(1, "Različica je obvezna.")
    .max(32)
    .regex(/^\d+\.\d+\.\d+(?:[-+].+)?$/, "Različica mora slediti semantičnemu formatu (npr. 1.2.3)."),
  channel: desktopChannelSchema.default("internal"),
  title: z.string().min(1, "Naslov je obvezen.").max(255),
  releaseNotes: z.string().max(20000).optional().or(z.literal("")),
  status: desktopReleaseStatusSchema.default("draft"),
  isMandatory: z.boolean().default(false),
  minimumSupportedVersion: z.string().max(32).optional().or(z.literal("")),
  rolloutPercentage: z.coerce.number().int().min(0).max(100).default(100),
  availableFrom: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});
export type DesktopReleaseCreateInput = z.infer<typeof desktopReleaseCreateInputSchema>;

export const desktopArtifactInputSchema = z.object({
  desktopReleaseId: z.string().min(1, "Izberite izdajo."),
  platform: desktopPlatformSchema,
  architecture: desktopArchitectureSchema,
  packageType: z.string().min(1, "Vrsta paketa je obvezna.").max(32),
  storageKey: z.string().min(1, "Ključ shrambe je obvezen.").max(512),
  downloadUrlReference: z.string().max(2000).optional().or(z.literal("")),
  signature: z.string().max(10000).optional().or(z.literal("")),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "SHA-256 mora imeti 64 šestnajstiških znakov.")
    .optional()
    .or(z.literal("")),
  fileSize: z.coerce.number().int().min(0).optional().nullable(),
  originalFileName: z.string().max(255).optional().or(z.literal("")),
  codeSigningStatus: z.string().max(32).optional().or(z.literal("")),
});
export type DesktopArtifactInput = z.infer<typeof desktopArtifactInputSchema>;

/**
 * Compares two semantic-version-ish strings ("1.2.3", with optional
 * "-prerelease"/"+build" suffixes which are ignored for ordering purposes).
 * Returns -1 if `a` < `b`, 1 if `a` > `b`, 0 if equal.
 */
export function compareSemVer(a: string, b: string): -1 | 0 | 1 {
  const normalize = (v: string) =>
    v
      .trim()
      .split(/[-+]/)[0]!
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);

  const partsA = normalize(a);
  const partsB = normalize(b);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/** Deterministic 32-bit FNV-1a hash — pure JS, safe for client bundles (no node:crypto). */
function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministically decides whether a given installation falls within the
 * rollout percentage for a release, using a stable hash of releaseId+installationId
 * so the same installation always gets the same answer for a given rollout.
 */
export function isInRollout(
  releaseId: string,
  installationId: string,
  rolloutPercentage: number,
): boolean {
  if (rolloutPercentage <= 0) return false;
  if (rolloutPercentage >= 100) return true;

  const bucket = stableHash(`${releaseId}:${installationId}`) % 100;
  return bucket < rolloutPercentage;
}

export const desktopLoginRequestSchema = z.object({
  email: z.string().email("Vnesite veljaven e-poštni naslov."),
  password: z.string().min(1, "Geslo je obvezno."),
});
export type DesktopLoginRequest = z.infer<typeof desktopLoginRequestSchema>;

export const desktopRegisterInstallationSchema = z.object({
  installationId: z.string().min(1, "Manjka installationId."),
  platform: desktopPlatformSchema,
  architecture: desktopArchitectureSchema,
  osVersion: z.string().max(128).optional().or(z.literal("")),
  currentVersion: z.string().max(32).optional().or(z.literal("")),
  channel: desktopChannelSchema.optional(),
  deviceName: z.string().max(255).optional().or(z.literal("")),
});
export type DesktopRegisterInstallationInput = z.infer<typeof desktopRegisterInstallationSchema>;

export const DESKTOP_UPDATE_EVENT_TYPES = ["check", "download", "install", "error"] as const;
export const desktopUpdateEventTypeSchema = z.enum(DESKTOP_UPDATE_EVENT_TYPES);
export type DesktopUpdateEventType = z.infer<typeof desktopUpdateEventTypeSchema>;

export const desktopUpdateEventInputSchema = z.object({
  installationId: z.string().min(1, "Manjka installationId."),
  eventType: desktopUpdateEventTypeSchema,
  fromVersion: z.string().max(32).optional().or(z.literal("")),
  toVersion: z.string().max(32).optional().or(z.literal("")),
  errorCode: z.string().max(64).optional().or(z.literal("")),
  errorMessage: z.string().max(2000).optional().or(z.literal("")),
  metadata: z.record(z.unknown()).optional(),
});
export type DesktopUpdateEventInput = z.infer<typeof desktopUpdateEventInputSchema>;

export const desktopUpdateResponseSchema = z.object({
  updateAvailable: z.boolean(),
  version: z.string().max(32).optional(),
  channel: desktopChannelSchema.optional(),
  isMandatory: z.boolean().optional(),
  releaseNotes: z.string().optional(),
  minimumSupportedVersion: z.string().max(32).optional(),
  artifact: z
    .object({
      platform: desktopPlatformSchema,
      architecture: desktopArchitectureSchema,
      packageType: z.string(),
      downloadUrlReference: z.string(),
      signature: z.string().optional(),
      sha256: z.string().optional(),
      fileSize: z.number().int().optional(),
    })
    .optional(),
});
export type DesktopUpdateResponse = z.infer<typeof desktopUpdateResponseSchema>;
