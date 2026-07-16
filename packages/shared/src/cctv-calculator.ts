import { z } from "zod";

export const RECORDING_MODES = ["continuous", "motion", "schedule"] as const;
export type RecordingMode = (typeof RECORDING_MODES)[number];

export const cameraGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Naziv skupine je obvezen.").max(255),
  cameraCount: z.coerce.number().int().positive("Število kamer mora biti > 0"),
  resolution: z.string().min(1).max(64).default("1920x1080"),
  codec: z.string().min(1).max(32).default("H.265"),
  fps: z.coerce.number().positive().default(15),
  bitrateMbps: z.coerce.number().positive("Bitrate mora biti > 0"),
  recordingMode: z.enum(RECORDING_MODES).default("continuous"),
  activityPercent: z.coerce.number().min(1).max(100).default(100),
  recordingHoursPerDay: z.coerce.number().min(0.1).max(24).default(24),
  audio: z.boolean().default(false),
  audioBitrateMbps: z.coerce.number().min(0).default(0.064),
  secondaryStream: z.boolean().default(false),
  secondaryBitrateMbps: z.coerce.number().min(0).default(1),
});

export type CameraGroupInput = z.infer<typeof cameraGroupSchema>;

export const cctvProjectGlobalsSchema = z.object({
  retentionDays: z.coerce.number().int().positive().default(30),
  reservePercent: z.coerce.number().min(0).max(200).default(20),
  raidFactor: z.coerce.number().positive().default(1.33),
  spareCapacityTb: z.coerce.number().min(0).default(0),
  useBinaryTb: z.boolean().default(true),
  growthPercent: z.coerce.number().min(0).max(500).default(0),
  diskSizeTb: z.coerce.number().positive().default(8),
  clientsCount: z.coerce.number().int().min(0).default(2),
  clientBitrateMbps: z.coerce.number().min(0).default(8),
  maxRecorderBandwidthMbps: z.coerce.number().positive().default(256),
  maxPortsPerRecorder: z.coerce.number().int().positive().default(32),
  poeBudgetWatts: z.coerce.number().positive().default(370),
  wattsPerCamera: z.coerce.number().positive().default(8),
  upsCapacityWh: z.coerce.number().positive().default(1000),
  systemLoadWatts: z.coerce.number().positive().default(250),
});

export type CctvProjectGlobals = z.infer<typeof cctvProjectGlobalsSchema>;

export const cctvProjectInputSchema = z.object({
  name: z.string().min(1, "Naziv projekta je obvezen.").max(255),
  description: z.string().max(5000).optional().or(z.literal("")),
  customerId: z.string().optional().or(z.literal("")),
  siteId: z.string().optional().or(z.literal("")),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  globals: cctvProjectGlobalsSchema,
  groups: z.array(cameraGroupSchema).min(1, "Dodajte vsaj eno skupino kamer."),
});

export type CctvProjectInput = z.infer<typeof cctvProjectInputSchema>;

export type CameraGroupResult = {
  id: string;
  name: string;
  cameraCount: number;
  effectiveBitrateMbps: number;
  dailyGb: number;
  totalRetentionGb: number;
  inputBandwidthMbps: number;
  warnings: string[];
};

export type CctvCalculationResult = {
  equations: string[];
  assumptions: string[];
  warnings: string[];
  totalCameras: number;
  dailyGb: number;
  retentionGb: number;
  withReserveGb: number;
  withGrowthGb: number;
  totalRequiredTb: number;
  usableNeededTb: number;
  rawWithRaidTb: number;
  disksNeeded: number;
  inputBandwidthMbps: number;
  clientBandwidthMbps: number;
  recordersNeeded: number;
  portsNeeded: number;
  poeWatts: number;
  poeSwitchesNeeded: number;
  upsAutonomyHours: number;
  groups: CameraGroupResult[];
  dailySeries: Array<{ day: number; gb: number }>;
  unitLabel: "GiB/TiB" | "GB/TB";
};

function tbDivisor(useBinary: boolean): number {
  return useBinary ? 1024 : 1000;
}

function gbDivisor(useBinary: boolean): number {
  // Mbps → bytes/s → GB
  // (Mbps * 1e6 bit/s) / 8 = bytes/s
  // / (1024^3) = GiB/s or / (1000^3) = GB/s
  return useBinary ? 1024 ** 3 : 1000 ** 3;
}

/**
 * Effective bitrate per camera including optional audio + secondary stream.
 */
export function effectiveBitrateMbps(group: CameraGroupInput): number {
  let bitrate = group.bitrateMbps;
  if (group.audio) bitrate += group.audioBitrateMbps;
  if (group.secondaryStream) bitrate += group.secondaryBitrateMbps;
  return bitrate;
}

/**
 * Daily storage for a group (GB/GiB depending on useBinaryTb).
 *
 * Equation:
 *   daily = bitrateMbps × cameras × recordingHours × 3600 × activity% / 8 / divisor
 */
export function dailyStorageGb(
  group: CameraGroupInput,
  useBinaryTb: boolean,
): { dailyGb: number; effectiveBitrateMbps: number } {
  const bitrate = effectiveBitrateMbps(group);
  const activity = group.activityPercent / 100;
  const seconds = group.recordingHoursPerDay * 3600;
  const bitsPerDay = bitrate * 1_000_000 * group.cameraCount * seconds * activity;
  const bytesPerDay = bitsPerDay / 8;
  const dailyGb = bytesPerDay / gbDivisor(useBinaryTb);
  return { dailyGb, effectiveBitrateMbps: bitrate };
}

export function calculateCctvProject(
  globals: CctvProjectGlobals,
  groups: CameraGroupInput[],
): CctvCalculationResult {
  const warnings: string[] = [];
  const assumptions = [
    "1 Mbps = 1.000.000 bit/s",
    globals.useBinaryTb
      ? "Kapaciteta v binarnih enotah (1 GiB = 1024³ B, 1 TiB = 1024 GiB)"
      : "Kapaciteta v decimalnih enotah (1 GB = 1000³ B, 1 TB = 1000 GB)",
    `RAID faktor ${globals.raidFactor} (raw = usable × faktor)`,
    "PoE in UPS so okvirne ocene, ne meritev na objektu",
  ];

  const equations = [
    "dnevno_GB = bitrate_Mbps × kamere × ure × 3600 × (aktivnost/100) / 8 / delitelj",
    "hramba_GB = dnevno_GB × dnevi_hrambe",
    "z_rezervo_GB = hramba_GB × (1 + rezerva%/100)",
    "z_rastjo_GB = z_rezervo_GB × (1 + rast%/100) + spare_TB×delitelj",
    "raw_TB = required_usable_TB × RAID_faktor",
    "diski = ceil(raw_TB / velikost_diska_TB)",
    "vhodna_pasovna = Σ (bitrate × kamere)",
    "izhodna_pasovna = odjemalci × bitrate_odjemalca",
  ];

  const groupResults: CameraGroupResult[] = groups.map((group) => {
    const gWarnings: string[] = [];
    if (group.recordingMode === "continuous" && group.activityPercent < 100) {
      gWarnings.push(
        `Skupina „${group.name}“: kontinuirano snemanje z aktivnostjo ${group.activityPercent}% – preverite nastavitev.`,
      );
    }
    if (group.recordingHoursPerDay > 24) {
      gWarnings.push(`Skupina „${group.name}“: ure snemanja > 24.`);
    }
    if (group.bitrateMbps > 32) {
      gWarnings.push(`Skupina „${group.name}“: zelo visok bitrate (${group.bitrateMbps} Mbps).`);
    }

    const { dailyGb, effectiveBitrateMbps: eff } = dailyStorageGb(group, globals.useBinaryTb);
    const totalRetentionGb = dailyGb * globals.retentionDays;
    const inputBandwidthMbps = eff * group.cameraCount;

    return {
      id: group.id,
      name: group.name,
      cameraCount: group.cameraCount,
      effectiveBitrateMbps: round(eff, 3),
      dailyGb: round(dailyGb, 3),
      totalRetentionGb: round(totalRetentionGb, 3),
      inputBandwidthMbps: round(inputBandwidthMbps, 3),
      warnings: gWarnings,
    };
  });

  for (const g of groupResults) warnings.push(...g.warnings);

  const totalCameras = groups.reduce((s, g) => s + g.cameraCount, 0);
  const dailyGb = groupResults.reduce((s, g) => s + g.dailyGb, 0);
  const retentionGb = dailyGb * globals.retentionDays;
  const withReserveGb = retentionGb * (1 + globals.reservePercent / 100);
  const withGrowthGb =
    withReserveGb * (1 + globals.growthPercent / 100) +
    globals.spareCapacityTb * tbDivisor(globals.useBinaryTb);

  const totalRequiredTb = withGrowthGb / tbDivisor(globals.useBinaryTb);
  const usableNeededTb = totalRequiredTb;
  const rawWithRaidTb = usableNeededTb * globals.raidFactor;
  const disksNeeded = Math.max(1, Math.ceil(rawWithRaidTb / globals.diskSizeTb));

  const inputBandwidthMbps = groupResults.reduce((s, g) => s + g.inputBandwidthMbps, 0);
  const clientBandwidthMbps = globals.clientsCount * globals.clientBitrateMbps;

  const byBandwidth = Math.ceil(inputBandwidthMbps / globals.maxRecorderBandwidthMbps);
  const byPorts = Math.ceil(totalCameras / globals.maxPortsPerRecorder);
  const recordersNeeded = Math.max(1, byBandwidth, byPorts);
  const portsNeeded = totalCameras;

  const poeWatts = totalCameras * globals.wattsPerCamera;
  const poeSwitchesNeeded = Math.max(1, Math.ceil(poeWatts / globals.poeBudgetWatts));
  const upsAutonomyHours = globals.systemLoadWatts > 0 ? globals.upsCapacityWh / globals.systemLoadWatts : 0;

  if (globals.retentionDays > 365) {
    warnings.push("Hramba > 365 dni – preverite stroške in zakonodajo.");
  }
  if (inputBandwidthMbps > globals.maxRecorderBandwidthMbps * 4) {
    warnings.push("Skupna vhodna pasovna širina je zelo visoka glede na zmogljivost snemalnika.");
  }
  if (poeWatts > globals.poeBudgetWatts * 3) {
    warnings.push("PoE poraba presega večkratnik budgeta stikala – načrtujte več stikal.");
  }
  if (upsAutonomyHours < 0.25) {
    warnings.push("UPS avtonomija je pod 15 minut – preverite kapaciteto.");
  }
  if (groups.length === 0) {
    warnings.push("Ni skupin kamer.");
  }

  const dailySeries = Array.from({ length: Math.min(globals.retentionDays, 90) }, (_, i) => ({
    day: i + 1,
    gb: round(dailyGb * (i + 1), 3),
  }));

  return {
    equations,
    assumptions,
    warnings,
    totalCameras,
    dailyGb: round(dailyGb, 3),
    retentionGb: round(retentionGb, 3),
    withReserveGb: round(withReserveGb, 3),
    withGrowthGb: round(withGrowthGb, 3),
    totalRequiredTb: round(totalRequiredTb, 3),
    usableNeededTb: round(usableNeededTb, 3),
    rawWithRaidTb: round(rawWithRaidTb, 3),
    disksNeeded,
    inputBandwidthMbps: round(inputBandwidthMbps, 3),
    clientBandwidthMbps: round(clientBandwidthMbps, 3),
    recordersNeeded,
    portsNeeded,
    poeWatts: round(poeWatts, 1),
    poeSwitchesNeeded,
    upsAutonomyHours: round(upsAutonomyHours, 2),
    groups: groupResults,
    dailySeries,
    unitLabel: globals.useBinaryTb ? "GiB/TiB" : "GB/TB",
  };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function createDefaultCameraGroup(id: string): CameraGroupInput {
  return {
    id,
    name: "Skupina 1",
    cameraCount: 8,
    resolution: "1920x1080",
    codec: "H.265",
    fps: 15,
    bitrateMbps: 4,
    recordingMode: "continuous",
    activityPercent: 100,
    recordingHoursPerDay: 24,
    audio: false,
    audioBitrateMbps: 0.064,
    secondaryStream: false,
    secondaryBitrateMbps: 1,
  };
}

export function createDefaultGlobals(): CctvProjectGlobals {
  return cctvProjectGlobalsSchema.parse({});
}
