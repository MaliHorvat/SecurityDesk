import { z } from "zod";

export const customerStatusSchema = z.enum(["active", "inactive", "prospect"]);
export const deviceStatusSchema = z.enum([
  "active",
  "inactive",
  "maintenance",
  "decommissioned",
  "unknown",
]);

export const customerInputSchema = z.object({
  name: z.string().min(1, "Naziv je obvezen.").max(255),
  taxId: z.string().max(64).optional().or(z.literal("")),
  addressLine1: z.string().max(255).optional().or(z.literal("")),
  addressLine2: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(128).optional().or(z.literal("")),
  postalCode: z.string().max(32).optional().or(z.literal("")),
  country: z.string().max(64).optional().or(z.literal("")),
  email: z.string().email("Neveljaven e-poštni naslov.").optional().or(z.literal("")),
  phone: z.string().max(64).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  serviceContract: z.string().max(5000).optional().or(z.literal("")),
  status: customerStatusSchema.default("active"),
  collaborationStartedAt: z.string().optional().or(z.literal("")),
  primaryContactName: z.string().max(255).optional().or(z.literal("")),
  primaryContactEmail: z.string().email().optional().or(z.literal("")),
  primaryContactPhone: z.string().max(64).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export const siteInputSchema = z.object({
  customerId: z.string().min(1, "Izberite stranko."),
  name: z.string().min(1, "Naziv objekta je obvezen.").max(255),
  addressLine1: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(128).optional().or(z.literal("")),
  postalCode: z.string().max(32).optional().or(z.literal("")),
  country: z.string().max(64).optional().or(z.literal("")),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  timezone: z.string().max(64).default("Europe/Ljubljana"),
  contactName: z.string().max(255).optional().or(z.literal("")),
  contactPhone: z.string().max(64).optional().or(z.literal("")),
  accessInstructions: z.string().max(5000).optional().or(z.literal("")),
  workingHours: z.string().max(2000).optional().or(z.literal("")),
  securityNotes: z.string().max(5000).optional().or(z.literal("")),
});

export type SiteInput = z.infer<typeof siteInputSchema>;

export const buildingInputSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const floorInputSchema = z.object({
  buildingId: z.string().min(1),
  name: z.string().min(1).max(255),
  level: z.coerce.number().int().default(0),
});

export const roomInputSchema = z.object({
  floorId: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const deviceInputSchema = z.object({
  name: z.string().min(1, "Ime naprave je obvezno.").max(255),
  customerId: z.string().min(1).optional().or(z.literal("")),
  siteId: z.string().min(1).optional().or(z.literal("")),
  buildingId: z.string().min(1).optional().or(z.literal("")),
  floorId: z.string().min(1).optional().or(z.literal("")),
  roomId: z.string().min(1).optional().or(z.literal("")),
  deviceTypeName: z.string().max(128).optional().or(z.literal("")),
  manufacturerName: z.string().max(255).optional().or(z.literal("")),
  model: z.string().max(255).optional().or(z.literal("")),
  serialNumber: z.string().max(128).optional().or(z.literal("")),
  inventoryNumber: z.string().max(128).optional().or(z.literal("")),
  macAddress: z.string().max(64).optional().or(z.literal("")),
  ipAddress: z.string().max(64).optional().or(z.literal("")),
  subnetMask: z.string().max(64).optional().or(z.literal("")),
  gateway: z.string().max(64).optional().or(z.literal("")),
  dns: z.string().max(255).optional().or(z.literal("")),
  vlan: z.coerce.number().int().optional().nullable(),
  switchPort: z.string().max(64).optional().or(z.literal("")),
  username: z.string().max(128).optional().or(z.literal("")),
  password: z.string().max(255).optional().or(z.literal("")),
  firmware: z.string().max(128).optional().or(z.literal("")),
  supplier: z.string().max(255).optional().or(z.literal("")),
  status: deviceStatusSchema.default("active"),
  tags: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export type DeviceInput = z.infer<typeof deviceInputSchema>;

export function createQrToken(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value.trim() === "") return null;
  return value.trim();
}

/** Minimal CSV parser (handles quoted fields). */
export function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    current.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (current.some((c) => c.trim() !== "")) {
      rows.push(current);
    }
    current = [];
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    const next = content[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushRow();
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field.length > 0 || current.length > 0) pushRow();

  const headers = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  return { headers, rows };
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const escape = (value: string | number | null | undefined) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

export const DEVICE_IMPORT_HEADERS = [
  "name",
  "customer",
  "site",
  "type",
  "manufacturer",
  "model",
  "serial_number",
  "inventory_number",
  "mac_address",
  "ip_address",
  "subnet_mask",
  "gateway",
  "dns",
  "vlan",
  "switch_port",
  "firmware",
  "status",
  "tags",
] as const;

export type DeviceImportRow = {
  name: string;
  customer?: string;
  site?: string;
  type?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  inventory_number?: string;
  mac_address?: string;
  ip_address?: string;
  subnet_mask?: string;
  gateway?: string;
  dns?: string;
  vlan?: string;
  switch_port?: string;
  firmware?: string;
  status?: string;
  tags?: string;
};

export type DeviceImportPreview = {
  rowNumber: number;
  data: DeviceImportRow;
  errors: string[];
};

export function previewDeviceImport(content: string): DeviceImportPreview[] {
  const { headers, rows } = parseCsv(content);
  const indexOf = (key: string) => headers.findIndex((h) => h === key || h.replace(/\s+/g, "_") === key);

  return rows.map((row, idx) => {
    const get = (key: string) => {
      const i = indexOf(key);
      return i >= 0 ? (row[i] ?? "").trim() : "";
    };
    const data: DeviceImportRow = {
      name: get("name") || get("ime"),
      customer: get("customer") || get("stranka"),
      site: get("site") || get("objekt"),
      type: get("type") || get("vrsta"),
      manufacturer: get("manufacturer") || get("proizvajalec"),
      model: get("model"),
      serial_number: get("serial_number") || get("serijska"),
      inventory_number: get("inventory_number") || get("inventar"),
      mac_address: get("mac_address") || get("mac"),
      ip_address: get("ip_address") || get("ip"),
      subnet_mask: get("subnet_mask") || get("maska"),
      gateway: get("gateway"),
      dns: get("dns"),
      vlan: get("vlan"),
      switch_port: get("switch_port") || get("port"),
      firmware: get("firmware"),
      status: get("status") || "active",
      tags: get("tags") || get("oznake"),
    };
    const errors: string[] = [];
    if (!data.name) errors.push("Manjka ime naprave.");
    if (data.status && !deviceStatusSchema.safeParse(data.status).success) {
      errors.push(`Neveljaven status: ${data.status}`);
    }
    if (data.vlan && Number.isNaN(Number(data.vlan))) {
      errors.push("VLAN mora biti število.");
    }
    return { rowNumber: idx + 2, data, errors };
  });
}
