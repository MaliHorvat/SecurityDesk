import { z } from "zod";

export const networkPortStatusSchema = z.enum(["up", "down", "disabled", "error", "unknown"]);
export const networkPortRoleSchema = z.enum(["access", "trunk", "uplink", "unused"]);
export const networkPoeStateSchema = z.enum(["off", "on", "fault", "denied", "unknown"]);

export const networkSwitchInputSchema = z.object({
  name: z.string().min(1, "Ime stikala je obvezno.").max(255),
  customerId: z.string().min(1).optional().or(z.literal("")),
  siteId: z.string().min(1).optional().or(z.literal("")),
  deviceId: z.string().min(1).optional().or(z.literal("")),
  manufacturer: z.string().max(255).optional().or(z.literal("")),
  model: z.string().max(255).optional().or(z.literal("")),
  ipAddress: z.string().max(64).optional().or(z.literal("")),
  macAddress: z.string().max(64).optional().or(z.literal("")),
  serialNumber: z.string().max(128).optional().or(z.literal("")),
  portCount: z.coerce.number().int().min(1).max(128).default(24),
  poeBudgetWatts: z.coerce.number().min(0).default(0),
  location: z.string().max(255).optional().or(z.literal("")),
  rack: z.string().max(128).optional().or(z.literal("")),
  uPosition: z.string().max(32).optional().or(z.literal("")),
  firmware: z.string().max(128).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export type NetworkSwitchInput = z.infer<typeof networkSwitchInputSchema>;

export const networkPortInputSchema = z.object({
  switchId: z.string().min(1),
  portNumber: z.coerce.number().int().min(1).max(128),
  name: z.string().min(1).max(64),
  description: z.string().max(2000).optional().or(z.literal("")),
  status: networkPortStatusSchema.default("unknown"),
  role: networkPortRoleSchema.default("unused"),
  speedMbps: z.coerce.number().int().min(0).optional().nullable(),
  duplex: z.string().max(16).optional().or(z.literal("")),
  poeState: networkPoeStateSchema.default("unknown"),
  poeWatts: z.coerce.number().min(0).default(0),
  accessVlan: z.coerce.number().int().min(1).max(4094).optional().nullable(),
  taggedVlans: z.string().max(500).optional().or(z.literal("")),
  connectedDeviceId: z.string().min(1).optional().or(z.literal("")),
  connectedDeviceLabel: z.string().max(255).optional().or(z.literal("")),
});

export type NetworkPortInput = z.infer<typeof networkPortInputSchema>;

export const networkVlanInputSchema = z.object({
  vlanId: z.coerce.number().int().min(1).max(4094),
  name: z.string().min(1).max(255),
  siteId: z.string().min(1).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  subnetCidr: z.string().max(64).optional().or(z.literal("")),
  gateway: z.string().max(64).optional().or(z.literal("")),
});

export type NetworkVlanInput = z.infer<typeof networkVlanInputSchema>;

export const networkIpInputSchema = z.object({
  ipAddress: z.string().min(1, "IP je obvezen.").max(64),
  siteId: z.string().min(1).optional().or(z.literal("")),
  vlanId: z.coerce.number().int().min(1).max(4094).optional().nullable(),
  hostname: z.string().max(255).optional().or(z.literal("")),
  deviceId: z.string().min(1).optional().or(z.literal("")),
  macAddress: z.string().max(64).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type NetworkIpInput = z.infer<typeof networkIpInputSchema>;

export const PORT_STATUS_LABELS: Record<z.infer<typeof networkPortStatusSchema>, string> = {
  up: "Aktiven",
  down: "Neaktiven",
  disabled: "Onemogočen",
  error: "Napaka",
  unknown: "Neznano",
};

export const PORT_ROLE_LABELS: Record<z.infer<typeof networkPortRoleSchema>, string> = {
  access: "Access",
  trunk: "Trunk",
  uplink: "Uplink",
  unused: "Prost",
};

export const POE_STATE_LABELS: Record<z.infer<typeof networkPoeStateSchema>, string> = {
  off: "Izklop",
  on: "Vklopljen",
  fault: "Napaka",
  denied: "Zavrnjen",
  unknown: "Neznano",
};

/** Visual state for front-panel port map. */
export type PortVisualState = "free" | "occupied" | "error" | "uplink" | "trunk" | "poe_warning";

export function resolvePortVisualState(port: {
  status: z.infer<typeof networkPortStatusSchema>;
  role: z.infer<typeof networkPortRoleSchema>;
  poeState: z.infer<typeof networkPoeStateSchema>;
  poeWatts: number;
  connectedDeviceId?: string | null;
  connectedDeviceLabel?: string | null;
}): PortVisualState {
  if (port.status === "error" || port.poeState === "fault") return "error";
  if (port.role === "uplink") return "uplink";
  if (port.role === "trunk") return "trunk";
  if (port.poeState === "on" && port.poeWatts > 25) return "poe_warning";
  if (
    port.role !== "unused" ||
    port.connectedDeviceId ||
    (port.connectedDeviceLabel && port.connectedDeviceLabel.trim()) ||
    port.status === "up"
  ) {
    return "occupied";
  }
  return "free";
}

export function defaultPortName(portNumber: number, style: "cisco" | "simple" = "cisco"): string {
  if (style === "simple") return `Port ${portNumber}`;
  return `Gi1/0/${portNumber}`;
}

export function createDefaultPorts(portCount: number): Array<{
  portNumber: number;
  name: string;
  status: "unknown";
  role: "unused";
  poeState: "unknown";
  poeWatts: number;
}> {
  return Array.from({ length: portCount }, (_, i) => {
    const portNumber = i + 1;
    return {
      portNumber,
      name: defaultPortName(portNumber),
      status: "unknown" as const,
      role: "unused" as const,
      poeState: "unknown" as const,
      poeWatts: 0,
    };
  });
}

export function summarizeSwitchPorts(
  ports: Array<{
    status: z.infer<typeof networkPortStatusSchema>;
    role: z.infer<typeof networkPortRoleSchema>;
    poeWatts: number;
    poeState: z.infer<typeof networkPoeStateSchema>;
  }>,
  poeBudgetWatts: number,
) {
  const used = ports.filter((p) => p.role !== "unused" || p.status === "up").length;
  const free = ports.length - used;
  const errors = ports.filter((p) => p.status === "error" || p.poeState === "fault").length;
  const poeUsed = ports.reduce((sum, p) => sum + (p.poeState === "on" ? p.poeWatts : 0), 0);
  const poeOverBudget = poeBudgetWatts > 0 && poeUsed > poeBudgetWatts;
  return {
    total: ports.length,
    used,
    free,
    errors,
    poeUsedWatts: Math.round(poeUsed * 10) / 10,
    poeBudgetWatts,
    poeOverBudget,
    poePercent: poeBudgetWatts > 0 ? Math.round((poeUsed / poeBudgetWatts) * 1000) / 10 : 0,
  };
}

/** Parse simple Cisco-like interface lines or CSV into port draft rows. */
export function parsePortConfigText(text: string): Array<{
  name: string;
  portNumber: number | null;
  description: string;
  accessVlan: number | null;
  taggedVlans: string;
  poeWatts: number;
  role: z.infer<typeof networkPortRoleSchema>;
  connectedDeviceLabel: string;
}> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: Array<{
    name: string;
    portNumber: number | null;
    description: string;
    accessVlan: number | null;
    taggedVlans: string;
    poeWatts: number;
    role: z.infer<typeof networkPortRoleSchema>;
    connectedDeviceLabel: string;
  }> = [];

  for (const line of lines) {
    // Cisco: interface GigabitEthernet1/0/1
    const iface = line.match(/^interface\s+(\S+)/i);
    if (iface) {
      const name = iface[1]!;
      const numMatch = name.match(/(\d+)\s*$/);
      rows.push({
        name,
        portNumber: numMatch ? Number(numMatch[1]) : null,
        description: "",
        accessVlan: null,
        taggedVlans: "",
        poeWatts: 0,
        role: "unused",
        connectedDeviceLabel: "",
      });
      continue;
    }

    // Display / dash-separated: Gi1/0/1 – Kamera – VLAN 101 – PoE 8,4 W
    if (/^(Gi|Fa|Te|Port)/i.test(line) && /[–\-—]/.test(line)) {
      const parts = line.split(/\s*[–\-—]\s*/).map((p) => p.trim()).filter(Boolean);
      const name = parts[0] ?? "";
      const numMatch = name.match(/(\d+)\s*$/);
      let accessVlan: number | null = null;
      let poeWatts = 0;
      let connectedDeviceLabel = "";
      let description = "";
      for (const part of parts.slice(1)) {
        const vlanMatch = part.match(/^VLAN\s*(\d+)$/i);
        const poeMatch = part.match(/^PoE\s*([\d.,]+)/i);
        if (vlanMatch) {
          accessVlan = Number(vlanMatch[1]);
        } else if (poeMatch) {
          poeWatts = Number(poeMatch[1]!.replace(",", "."));
        } else if (!connectedDeviceLabel) {
          connectedDeviceLabel = part;
          description = part;
        }
      }
      rows.push({
        name,
        portNumber: numMatch ? Number(numMatch[1]) : null,
        description,
        accessVlan,
        taggedVlans: "",
        poeWatts,
        role: /uplink/i.test(connectedDeviceLabel) ? "uplink" : "access",
        connectedDeviceLabel,
      });
      continue;
    }

    // CSV: name,description,vlan,poe,device
    if (line.includes(",")) {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0] ?? "";
      const numMatch = name.match(/(\d+)\s*$/);
      rows.push({
        name,
        portNumber: numMatch ? Number(numMatch[1]) : null,
        description: parts[1] ?? "",
        accessVlan: parts[2] ? Number(parts[2]) : null,
        taggedVlans: "",
        poeWatts: parts[3] ? Number(parts[3].replace(",", ".")) : 0,
        role: "access",
        connectedDeviceLabel: parts[4] ?? parts[1] ?? "",
      });
    }
  }

  return rows;
}

export function findDuplicateIps(
  assignments: Array<{ ipAddress: string; siteId?: string | null; id?: string }>,
): string[] {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const a of assignments) {
    const key = `${a.siteId ?? "global"}::${a.ipAddress.trim().toLowerCase()}`;
    if (seen.has(key)) dupes.push(a.ipAddress);
    else seen.set(key, a.id ?? "");
  }
  return [...new Set(dupes)];
}
