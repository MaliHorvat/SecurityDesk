import { toCsv } from "@securitydesk/shared/securitydesk";
import type { CctvCalculationResult, CctvProjectInput } from "@securitydesk/shared/cctv-calculator";

export function buildProjectExportCsv(
  projectName: string,
  input: CctvProjectInput,
  result: CctvCalculationResult,
): string {
  const sections: string[] = [];

  sections.push(
    toCsv(
      ["projekt", "kamere", "dnevno_GB", "hramba_GB", "z_rezervo_GB", "potrebno_TB", "diski", "snemalniki", "pasovna_Mbps"],
      [
        [
          projectName,
          result.totalCameras,
          result.dailyGb,
          result.retentionGb,
          result.withReserveGb,
          result.totalRequiredTb,
          result.disksNeeded,
          result.recordersNeeded,
          result.inputBandwidthMbps,
        ],
      ],
    ),
  );

  sections.push("");
  sections.push(
    toCsv(
      ["skupina", "kamere", "bitrate_Mbps", "dnevno_GB", "hramba_GB", "pasovna_Mbps"],
      result.groups.map((g) => [
        g.name,
        g.cameraCount,
        g.effectiveBitrateMbps,
        g.dailyGb,
        g.totalRetentionGb,
        g.inputBandwidthMbps,
      ]),
    ),
  );

  sections.push("");
  sections.push(
    toCsv(
      ["skupina", "resolucija", "codec", "fps", "nacin", "aktivnost_%", "ure"],
      input.groups.map((g) => [
        g.name,
        g.resolution,
        g.codec,
        g.fps,
        g.recordingMode,
        g.activityPercent,
        g.recordingHoursPerDay,
      ]),
    ),
  );

  return sections.join("\n");
}

export function buildSuggestedEquipment(result: CctvCalculationResult): string[] {
  return [
    `${result.recordersNeeded}× snemalnik / VMS (do ${result.inputBandwidthMbps} Mbps vhodno)`,
    `${result.disksNeeded}× disk (~${result.rawWithRaidTb} TB raw z RAID)`,
    `${result.poeSwitchesNeeded}× PoE stikalo (skupaj ~${result.poeWatts} W)`,
    `${result.portsNeeded} omrežnih portov za kamere`,
    `UPS z okvirno avtonomijo ${result.upsAutonomyHours} h`,
    `Predlagani VLAN: CCTV (npr. 101), management (npr. 10)`,
  ];
}

export function buildSuggestedVlans(): Array<{ vlan: number; name: string; purpose: string }> {
  return [
    { vlan: 10, name: "MGMT", purpose: "Upravljanje stikal / snemalnikov" },
    { vlan: 101, name: "CCTV", purpose: "Kamere in snemanje" },
    { vlan: 120, name: "ACCESS", purpose: "Domofoni / kontrola pristopa" },
  ];
}
