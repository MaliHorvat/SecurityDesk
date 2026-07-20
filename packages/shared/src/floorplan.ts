import { z } from "zod";

export const FLOOR_PLAN_STATUSES = ["draft", "active", "archived"] as const;
export const floorPlanStatusSchema = z.enum(FLOOR_PLAN_STATUSES);
export type FloorPlanStatus = z.infer<typeof floorPlanStatusSchema>;

export const FLOOR_PLAN_STATUS_LABELS: Record<FloorPlanStatus, string> = {
  draft: "Osnutek",
  active: "Aktiven",
  archived: "Arhiviran",
};

export const FLOOR_PLAN_LAYER_TYPES = [
  "devices",
  "network",
  "cctv",
  "intercom",
  "alarm",
  "fire",
  "access",
  "cabling",
  "notes",
  "zones",
] as const;
export const floorPlanLayerTypeSchema = z.enum(FLOOR_PLAN_LAYER_TYPES);
export type FloorPlanLayerType = z.infer<typeof floorPlanLayerTypeSchema>;

export const DEFAULT_FLOOR_PLAN_LAYERS: Array<{
  name: string;
  type: FloorPlanLayerType;
  sortOrder: number;
}> = [
  { name: "Naprave", type: "devices", sortOrder: 0 },
  { name: "Omrežje", type: "network", sortOrder: 1 },
  { name: "Videonadzor", type: "cctv", sortOrder: 2 },
  { name: "Domofoni", type: "intercom", sortOrder: 3 },
  { name: "Alarm", type: "alarm", sortOrder: 4 },
  { name: "Požar", type: "fire", sortOrder: 5 },
  { name: "Kontrola pristopa", type: "access", sortOrder: 6 },
  { name: "Kabelske trase", type: "cabling", sortOrder: 7 },
  { name: "Opombe", type: "notes", sortOrder: 8 },
  { name: "Območja", type: "zones", sortOrder: 9 },
];

export const FLOOR_PLAN_ELEMENT_TYPES = [
  "camera",
  "nvr",
  "vms",
  "switch",
  "router",
  "wifi_ap",
  "intercom",
  "alarm_panel",
  "alarm_sensor",
  "fire_panel",
  "fire_detector",
  "siren",
  "card_reader",
  "access_controller",
  "electric_lock",
  "ups",
  "cabinet",
  "cable_path",
  "note",
  "zone",
  "device",
  "other",
] as const;
export const floorPlanElementTypeSchema = z.enum(FLOOR_PLAN_ELEMENT_TYPES);
export type FloorPlanElementType = z.infer<typeof floorPlanElementTypeSchema>;

export const FLOOR_PLAN_CONNECTION_TYPES = [
  "network",
  "fiber",
  "copper",
  "power",
  "alarmLoop",
  "fireLoop",
  "accessControl",
  "logical",
  "other",
] as const;
export const floorPlanConnectionTypeSchema = z.enum(FLOOR_PLAN_CONNECTION_TYPES);
export type FloorPlanConnectionType = z.infer<typeof floorPlanConnectionTypeSchema>;

export const FLOOR_PLAN_SCALE_UNITS = ["m", "cm", "mm", "ft"] as const;

export const DEVICE_STATUS_VISUAL = ["online", "warning", "offline", "maintenance", "unknown"] as const;
export type DeviceStatusVisual = (typeof DEVICE_STATUS_VISUAL)[number];

export const floorPlanCreateInputSchema = z.object({
  name: z.string().min(1, "Ime tlorisa je obvezno.").max(255),
  description: z.string().max(5000).optional().or(z.literal("")),
  customerId: z.string().min(1, "Izberite stranko."),
  siteId: z.string().min(1, "Izberite objekt."),
  buildingId: z.string().optional().or(z.literal("")),
  floorId: z.string().optional().or(z.literal("")),
  roomId: z.string().optional().or(z.literal("")),
  status: floorPlanStatusSchema.default("draft"),
});
export type FloorPlanCreateInput = z.infer<typeof floorPlanCreateInputSchema>;

export const floorPlanUpdateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: floorPlanStatusSchema.optional(),
  scaleEnabled: z.boolean().optional(),
  scaleValue: z.coerce.number().positive().optional().nullable(),
  scaleUnit: z.enum(FLOOR_PLAN_SCALE_UNITS).optional().nullable(),
  expectedVersion: z.coerce.number().int().min(1),
  changeDescription: z.string().max(500).optional().or(z.literal("")),
});
export type FloorPlanUpdateInput = z.infer<typeof floorPlanUpdateInputSchema>;

export const floorPlanElementInputSchema = z.object({
  id: z.string().optional(),
  floorPlanId: z.string().min(1),
  layerId: z.string().min(1),
  elementType: floorPlanElementTypeSchema,
  deviceId: z.string().optional().nullable().or(z.literal("")),
  switchId: z.string().optional().nullable().or(z.literal("")),
  switchPortId: z.string().optional().nullable().or(z.literal("")),
  roomId: z.string().optional().nullable().or(z.literal("")),
  label: z.string().max(255).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  x: z.coerce.number(),
  y: z.coerce.number(),
  width: z.coerce.number().positive().default(32),
  height: z.coerce.number().positive().default(32),
  rotation: z.coerce.number().default(0),
  zIndex: z.coerce.number().int().default(0),
  icon: z.string().max(64).optional().or(z.literal("")),
  shape: z.string().max(32).optional().or(z.literal("")),
  statusOverride: z.enum(DEVICE_STATUS_VISUAL).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  isLocked: z.boolean().optional(),
});
export type FloorPlanElementInput = z.infer<typeof floorPlanElementInputSchema>;

export const floorPlanConnectionInputSchema = z.object({
  id: z.string().optional(),
  floorPlanId: z.string().min(1),
  sourceElementId: z.string().min(1),
  targetElementId: z.string().min(1),
  connectionType: floorPlanConnectionTypeSchema.default("network"),
  label: z.string().max(255).optional().or(z.literal("")),
  pathData: z.string().max(10000).optional().or(z.literal("")),
  metadata: z.record(z.unknown()).optional(),
});
export type FloorPlanConnectionInput = z.infer<typeof floorPlanConnectionInputSchema>;

export const floorPlanZoneInputSchema = z.object({
  id: z.string().optional(),
  floorPlanId: z.string().min(1),
  name: z.string().min(1).max(255),
  zoneType: z.string().max(64).default("custom"),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
  label: z.string().max(255).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  opacity: z.coerce.number().min(0).max(1).default(0.25),
  metadata: z.record(z.unknown()).optional(),
});
export type FloorPlanZoneInput = z.infer<typeof floorPlanZoneInputSchema>;

export const floorPlanSaveCanvasInputSchema = z.object({
  floorPlanId: z.string().min(1),
  expectedVersion: z.coerce.number().int().min(1),
  elements: z.array(floorPlanElementInputSchema),
  connections: z.array(floorPlanConnectionInputSchema).default([]),
  zones: z.array(floorPlanZoneInputSchema).default([]),
  layers: z
    .array(
      z.object({
        id: z.string().min(1),
        isVisible: z.boolean(),
        isLocked: z.boolean(),
        sortOrder: z.number().int(),
      }),
    )
    .optional(),
  changeDescription: z.string().max(500).optional().or(z.literal("")),
});
export type FloorPlanSaveCanvasInput = z.infer<typeof floorPlanSaveCanvasInputSchema>;

export const cameraFovMetadataSchema = z.object({
  directionDeg: z.number().default(0),
  fovDeg: z.number().min(1).max(360).default(90),
  rangePx: z.number().positive().default(120),
  opacity: z.number().min(0).max(1).default(0.2),
  color: z.string().default("#3b82f6"),
  description: z.string().optional(),
});
export type CameraFovMetadata = z.infer<typeof cameraFovMetadataSchema>;

export function normalizeElementCoords(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}) {
  return {
    x: Number.isFinite(input.x) ? input.x : 0,
    y: Number.isFinite(input.y) ? input.y : 0,
    width: Math.max(8, Number.isFinite(input.width) ? input.width : 32),
    height: Math.max(8, Number.isFinite(input.height) ? input.height : 32),
    rotation: Number.isFinite(input.rotation ?? 0) ? (input.rotation ?? 0) % 360 : 0,
  };
}
