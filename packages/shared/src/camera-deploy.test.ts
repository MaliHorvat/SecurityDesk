import { describe, expect, it } from "vitest";
import {
  allocateIpAddresses,
  countIpRange,
  parseIpv4,
  sessionProgress,
} from "./camera-deploy";

describe("camera-deploy", () => {
  it("parses and formats IPv4", () => {
    expect(parseIpv4("192.168.10.10")).toBeTypeOf("number");
    expect(parseIpv4("999.1.1.1")).toBeNull();
  });

  it("allocates sequential IPs", () => {
    expect(allocateIpAddresses("192.168.10.10", 3)).toEqual([
      "192.168.10.10",
      "192.168.10.11",
      "192.168.10.12",
    ]);
  });

  it("counts IP range inclusive", () => {
    expect(countIpRange("192.168.10.10", "192.168.10.12")).toBe(3);
    expect(countIpRange("192.168.10.12", "192.168.10.10")).toBeNull();
  });

  it("calculates session progress", () => {
    const progress = sessionProgress([
      { status: "deployed" },
      { status: "deployed" },
      { status: "pending" },
      { status: "failed" },
    ]);
    expect(progress.deployed).toBe(2);
    expect(progress.percent).toBe(50);
  });
});
