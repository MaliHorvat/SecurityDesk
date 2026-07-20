import { describe, expect, it } from "vitest";
import {
  defaultCheckForDevice,
  isAgentOnline,
  monitoringCheckInputSchema,
  resolveDeviceHealth,
} from "./monitoring";

describe("monitoring helpers", () => {
  it("validates check input", () => {
    const parsed = monitoringCheckInputSchema.parse({
      deviceId: "d1",
      name: "Ping cam",
      checkType: "ping",
      targetHost: "192.168.1.10",
    });
    expect(parsed.intervalSeconds).toBe(60);
    expect(parsed.enabled).toBe(true);
  });

  it("rejects unknown check types", () => {
    const result = monitoringCheckInputSchema.safeParse({
      deviceId: "d1",
      name: "Bad",
      checkType: "shell",
      targetHost: "1.1.1.1",
    });
    expect(result.success).toBe(false);
  });

  it("resolves agent online window", () => {
    expect(isAgentOnline(new Date(), Date.now())).toBe(true);
    expect(isAgentOnline(new Date(Date.now() - 10 * 60 * 1000), Date.now())).toBe(false);
  });

  it("marks stale device health as unknown", () => {
    expect(resolveDeviceHealth(new Date(Date.now() - 20 * 60 * 1000), "online")).toBe("unknown");
    expect(resolveDeviceHealth(new Date(), "offline")).toBe("offline");
  });

  it("builds default ping check", () => {
    const c = defaultCheckForDevice({ deviceId: "d1", deviceName: "Cam", ipAddress: "10.0.0.5" });
    expect(c.checkType).toBe("ping");
    expect(c.targetHost).toBe("10.0.0.5");
  });
});
