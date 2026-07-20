import { z } from "zod";

/** Allowlisted check types only — agent must never run arbitrary commands. */
export const MONITORING_CHECK_TYPES = ["ping", "tcp", "http", "https", "rtsp"] as const;
export const monitoringCheckTypeSchema = z.enum(MONITORING_CHECK_TYPES);
export type MonitoringCheckType = z.infer<typeof monitoringCheckTypeSchema>;

export const MONITORING_CHECK_TYPE_LABELS: Record<MonitoringCheckType, string> = {
  ping: "Ping (ICMP/reachability)",
  tcp: "TCP port",
  http: "HTTP",
  https: "HTTPS",
  rtsp: "RTSP",
};

export const monitoringHealthStatusSchema = z.enum([
  "online",
  "offline",
  "degraded",
  "error",
  "unknown",
]);
export type MonitoringHealthStatus = z.infer<typeof monitoringHealthStatusSchema>;

export const MONITORING_HEALTH_LABELS: Record<MonitoringHealthStatus, string> = {
  online: "Online",
  offline: "Offline",
  degraded: "Degraded",
  error: "Napaka",
  unknown: "Neznano",
};

export const AGENT_OFFLINE_AFTER_MS = 3 * 60 * 1000;
export const DEVICE_STALE_AFTER_MS = 5 * 60 * 1000;

export const monitoringCheckInputSchema = z.object({
  deviceId: z.string().min(1, "Izberite napravo."),
  agentId: z.string().optional().or(z.literal("")),
  name: z.string().min(1, "Ime preverjanja je obvezno.").max(255),
  checkType: monitoringCheckTypeSchema.default("ping"),
  targetHost: z.string().min(1, "Ciljni gostitelj je obvezen.").max(255),
  targetPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  targetPath: z.string().max(512).optional().or(z.literal("")),
  intervalSeconds: z.coerce.number().int().min(15).max(3600).default(60),
  timeoutMs: z.coerce.number().int().min(500).max(60000).default(5000),
  enabled: z.boolean().default(true),
});

export type MonitoringCheckInput = z.infer<typeof monitoringCheckInputSchema>;

export const enrollmentTokenInputSchema = z.object({
  siteId: z.string().optional().or(z.literal("")),
  label: z.string().max(255).optional().or(z.literal("")),
  expiresInHours: z.coerce.number().int().min(1).max(168).default(24),
});

export type EnrollmentTokenInput = z.infer<typeof enrollmentTokenInputSchema>;

export const agentEnrollRequestSchema = z.object({
  enrollmentToken: z.string().min(16),
  name: z.string().min(1).max(255),
  hostname: z.string().max(255).optional().or(z.literal("")),
  version: z.string().max(64).optional().or(z.literal("")),
});

export const agentHeartbeatRequestSchema = z.object({
  version: z.string().max(64).optional().or(z.literal("")),
});

export const agentCheckResultSchema = z.object({
  checkId: z.string().min(1),
  status: monitoringHealthStatusSchema,
  latencyMs: z.coerce.number().int().min(0).optional().nullable(),
  message: z.string().max(2000).optional().or(z.literal("")),
  checkedAt: z.string().optional().or(z.literal("")),
});

export const agentResultsRequestSchema = z.object({
  results: z.array(agentCheckResultSchema).min(1).max(200),
});

export function isAgentOnline(lastHeartbeatAt: Date | string | null | undefined, now = Date.now()) {
  if (!lastHeartbeatAt) return false;
  const ts = typeof lastHeartbeatAt === "string" ? new Date(lastHeartbeatAt).getTime() : lastHeartbeatAt.getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts <= AGENT_OFFLINE_AFTER_MS;
}

export function resolveDeviceHealth(
  lastCheckedAt: Date | string | null | undefined,
  status: MonitoringHealthStatus | null | undefined,
  now = Date.now(),
): MonitoringHealthStatus {
  if (!lastCheckedAt || !status) return "unknown";
  const ts = typeof lastCheckedAt === "string" ? new Date(lastCheckedAt).getTime() : lastCheckedAt.getTime();
  if (Number.isNaN(ts) || now - ts > DEVICE_STALE_AFTER_MS) return "unknown";
  return status;
}

export function defaultCheckForDevice(input: {
  deviceId: string;
  deviceName: string;
  ipAddress?: string | null;
}): MonitoringCheckInput {
  return {
    deviceId: input.deviceId,
    agentId: "",
    name: `Ping – ${input.deviceName}`,
    checkType: "ping",
    targetHost: input.ipAddress?.trim() || "127.0.0.1",
    targetPort: null,
    targetPath: "",
    intervalSeconds: 60,
    timeoutMs: 5000,
    enabled: true,
  };
}
