import { describe, expect, it } from "vitest";
import { parseCsv, previewDeviceImport, toCsv } from "./securitydesk";

describe("csv import/export", () => {
  it("parses quoted csv", () => {
    const { headers, rows } = parseCsv('name,ip_address\n"Kamera, zunanja",192.168.1.10');
    expect(headers).toEqual(["name", "ip_address"]);
    expect(rows[0]).toEqual(["Kamera, zunanja", "192.168.1.10"]);
  });

  it("previews device import with errors", () => {
    const preview = previewDeviceImport("name,status\n,active\nCam 1,badstatus\nCam 2,active");
    expect(preview).toHaveLength(3);
    expect(preview[0]?.errors.length).toBeGreaterThan(0);
    expect(preview[1]?.errors.some((e) => e.includes("status"))).toBe(true);
    expect(preview[2]?.errors).toEqual([]);
  });

  it("exports csv", () => {
    const csv = toCsv(["name", "ip"], [["Cam", "10.0.0.1"]]);
    expect(csv).toContain("name,ip");
    expect(csv).toContain("Cam,10.0.0.1");
  });
});
