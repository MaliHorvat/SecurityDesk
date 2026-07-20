import { z } from "zod";

export const CAMERA_DEPLOY_SESSION_STATUSES = [
  "draft",
  "planned",
  "deploying",
  "completed",
  "cancelled",
] as const;

export const cameraDeploySessionStatusSchema = z.enum(CAMERA_DEPLOY_SESSION_STATUSES);
export type CameraDeploySessionStatus = z.infer<typeof cameraDeploySessionStatusSchema>;

export const CAMERA_DEPLOY_SESSION_STATUS_LABELS: Record<CameraDeploySessionStatus, string> = {
  draft: "Osnutek",
  planned: "Načrtovano",
  deploying: "V teku",
  completed: "Končano",
  cancelled: "Preklicano",
};

export const CAMERA_DEPLOY_TARGET_STATUSES = [
  "pending",
  "configured",
  "deployed",
  "failed",
  "skipped",
] as const;

export const cameraDeployTargetStatusSchema = z.enum(CAMERA_DEPLOY_TARGET_STATUSES);
export type CameraDeployTargetStatus = z.infer<typeof cameraDeployTargetStatusSchema>;

export const CAMERA_DEPLOY_TARGET_STATUS_LABELS: Record<CameraDeployTargetStatus, string> = {
  pending: "Čaka",
  configured: "Konfigurirano",
  deployed: "Nameščeno",
  failed: "Neuspešno",
  skipped: "Preskočeno",
};

const ipv4Schema = z
  .string()
  .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Neveljaven IPv4 naslov.")
  .refine((ip) => ip.split(".").every((oct) => Number(oct) <= 255), "Neveljaven IPv4 naslov.");

export const cameraDeploySessionInputSchema = z.object({
  title: z.string().min(1, "Naslov je obvezen.").max(255),
  customerId: z.string().optional().or(z.literal("")),
  siteId: z.string().min(1, "Izberite objekt."),
  description: z.string().max(5000).optional().or(z.literal("")),
  status: cameraDeploySessionStatusSchema.default("draft"),
  ipRangeStart: z.string().max(64).optional().or(z.literal("")),
  ipRangeEnd: z.string().max(64).optional().or(z.literal("")),
  subnetMask: z.string().max(64).optional().or(z.literal("")),
  gateway: z.string().max(64).optional().or(z.literal("")),
  dnsServers: z.string().max(255).optional().or(z.literal("")),
  defaultUsername: z.string().max(128).optional().or(z.literal("")),
  defaultPassword: z.string().max(256).optional().or(z.literal("")),
  vlanId: z.coerce.number().int().min(1).max(4094).optional().nullable(),
});

export type CameraDeploySessionInput = z.infer<typeof cameraDeploySessionInputSchema>;

export const cameraDeployTargetInputSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().min(1, "Ime kamere je obvezno.").max(255),
  locationLabel: z.string().max(255).optional().or(z.literal("")),
  manufacturer: z.string().max(255).optional().or(z.literal("")),
  model: z.string().max(255).optional().or(z.literal("")),
  macAddress: z.string().max(64).optional().or(z.literal("")),
  serialNumber: z.string().max(128).optional().or(z.literal("")),
  currentIp: z.string().max(64).optional().or(z.literal("")),
  targetIp: z.string().max(64).optional().or(z.literal("")),
  username: z.string().max(128).optional().or(z.literal("")),
  password: z.string().max(256).optional().or(z.literal("")),
  channelNumber: z.coerce.number().int().min(1).max(256).optional().nullable(),
  deviceId: z.string().optional().or(z.literal("")),
});

export type CameraDeployTargetInput = z.infer<typeof cameraDeployTargetInputSchema>;

export function parseIpv4(ip: string): number | null {
  const trimmed = ip.trim();
  const parsed = ipv4Schema.safeParse(trimmed);
  if (!parsed.success) return null;
  const [a, b, c, d] = trimmed.split(".").map(Number);
  return ((a << 24) >>> 0) + ((b << 16) >>> 0) + ((c << 8) >>> 0) + (d >>> 0);
}

export function formatIpv4(value: number): string {
  const n = value >>> 0;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function allocateIpAddresses(start: string, count: number): string[] {
  if (count <= 0) return [];
  const base = parseIpv4(start);
  if (base === null) return [];
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const next = base + i;
    if (next > 0xffffffff) break;
    result.push(formatIpv4(next));
  }
  return result;
}

export function countIpRange(start: string, end: string): number | null {
  const a = parseIpv4(start);
  const b = parseIpv4(end);
  if (a === null || b === null || b < a) return null;
  return b - a + 1;
}

export function sessionProgress(targets: Array<{ status: CameraDeployTargetStatus }>) {
  const total = targets.length;
  if (total === 0) return { total: 0, deployed: 0, failed: 0, pending: 0, percent: 0 };
  const deployed = targets.filter((t) => t.status === "deployed").length;
  const failed = targets.filter((t) => t.status === "failed").length;
  const pending = targets.filter((t) => t.status === "pending" || t.status === "configured").length;
  return {
    total,
    deployed,
    failed,
    pending,
    percent: Math.round((deployed / total) * 100),
  };
}
