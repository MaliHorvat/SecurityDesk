import { describe, expect, it } from "vitest";
import {
  calculateCctvProject,
  createDefaultCameraGroup,
  createDefaultGlobals,
  dailyStorageGb,
  effectiveBitrateMbps,
} from "./cctv-calculator";

describe("cctv calculator", () => {
  it("computes effective bitrate with audio and secondary stream", () => {
    const group = {
      ...createDefaultCameraGroup("1"),
      bitrateMbps: 4,
      audio: true,
      audioBitrateMbps: 0.064,
      secondaryStream: true,
      secondaryBitrateMbps: 1,
    };
    expect(effectiveBitrateMbps(group)).toBeCloseTo(5.064, 3);
  });

  it("computes daily storage for continuous recording", () => {
    // 4 Mbps × 1 cam × 24h × 100% activity
    // bits/day = 4e6 * 86400 = 3.456e11
    // bytes = 4.32e10
    // GiB = 4.32e10 / 1024^3 ≈ 40.23
    const group = {
      ...createDefaultCameraGroup("1"),
      cameraCount: 1,
      bitrateMbps: 4,
      recordingHoursPerDay: 24,
      activityPercent: 100,
      audio: false,
      secondaryStream: false,
    };
    const { dailyGb } = dailyStorageGb(group, true);
    expect(dailyGb).toBeCloseTo(40.23, 1);
  });

  it("scales with cameras, days, reserve and RAID", () => {
    const globals = {
      ...createDefaultGlobals(),
      retentionDays: 30,
      reservePercent: 20,
      raidFactor: 1.33,
      spareCapacityTb: 0,
      growthPercent: 0,
      useBinaryTb: true,
      diskSizeTb: 8,
    };
    const groups = [
      {
        ...createDefaultCameraGroup("g1"),
        cameraCount: 10,
        bitrateMbps: 4,
        audio: false,
        secondaryStream: false,
      },
    ];
    const result = calculateCctvProject(globals, groups);
    expect(result.totalCameras).toBe(10);
    expect(result.dailyGb).toBeCloseTo(402.3, 0);
    expect(result.retentionGb).toBeCloseTo(result.dailyGb * 30, 1);
    expect(result.withReserveGb).toBeCloseTo(result.retentionGb * 1.2, 1);
    expect(result.disksNeeded).toBeGreaterThanOrEqual(1);
    expect(result.recordersNeeded).toBeGreaterThanOrEqual(1);
    expect(result.equations.length).toBeGreaterThan(0);
  });

  it("warns on continuous mode with low activity", () => {
    const result = calculateCctvProject(createDefaultGlobals(), [
      {
        ...createDefaultCameraGroup("g1"),
        recordingMode: "continuous",
        activityPercent: 40,
      },
    ]);
    expect(result.warnings.some((w) => w.includes("kontinuirano"))).toBe(true);
  });
});
