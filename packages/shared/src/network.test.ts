import { describe, expect, it } from "vitest";
import {
  createDefaultPorts,
  findDuplicateIps,
  parsePortConfigText,
  resolvePortVisualState,
  summarizeSwitchPorts,
} from "./network";

describe("network helpers", () => {
  it("creates default ports", () => {
    const ports = createDefaultPorts(8);
    expect(ports).toHaveLength(8);
    expect(ports[0]?.name).toBe("Gi1/0/1");
    expect(ports[7]?.portNumber).toBe(8);
  });

  it("resolves visual states", () => {
    expect(
      resolvePortVisualState({
        status: "unknown",
        role: "unused",
        poeState: "unknown",
        poeWatts: 0,
      }),
    ).toBe("free");
    expect(
      resolvePortVisualState({
        status: "up",
        role: "access",
        poeState: "on",
        poeWatts: 8,
        connectedDeviceLabel: "Kamera",
      }),
    ).toBe("occupied");
    expect(
      resolvePortVisualState({
        status: "up",
        role: "uplink",
        poeState: "off",
        poeWatts: 0,
      }),
    ).toBe("uplink");
    expect(
      resolvePortVisualState({
        status: "error",
        role: "access",
        poeState: "fault",
        poeWatts: 0,
      }),
    ).toBe("error");
  });

  it("summarizes PoE budget", () => {
    const summary = summarizeSwitchPorts(
      [
        { status: "up", role: "access", poeWatts: 10, poeState: "on" },
        { status: "up", role: "access", poeWatts: 12, poeState: "on" },
        { status: "down", role: "unused", poeWatts: 0, poeState: "off" },
      ],
      20,
    );
    expect(summary.poeUsedWatts).toBe(22);
    expect(summary.poeOverBudget).toBe(true);
    expect(summary.used).toBe(2);
  });

  it("parses display-format port lines", () => {
    const rows = parsePortConfigText(
      "Gi1/0/1 – Kamera skladišče – VLAN 101 – PoE 8,4 W\nGi1/0/2 – Kamera rampa – VLAN 101 – PoE 10,1 W",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.accessVlan).toBe(101);
    expect(rows[0]?.poeWatts).toBe(8.4);
    expect(rows[0]?.connectedDeviceLabel).toContain("Kamera");
  });

  it("detects duplicate IPs in same site", () => {
    expect(
      findDuplicateIps([
        { ipAddress: "10.0.0.1", siteId: "a" },
        { ipAddress: "10.0.0.1", siteId: "a" },
        { ipAddress: "10.0.0.1", siteId: "b" },
      ]),
    ).toEqual(["10.0.0.1"]);
  });
});
