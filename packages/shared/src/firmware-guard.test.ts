import { describe, expect, it } from "vitest";
import { firmwareAdvisoryInputSchema, firmwareAffectedModelInputSchema } from "./firmware-guard";

describe("firmware guard schemas", () => {
  it("validates advisory input", () => {
    const parsed = firmwareAdvisoryInputSchema.parse({
      title: "RCE vulnerability",
      vendor: "VendorX",
      description: "Short desc",
      severity: "high",
      recommendedAction: "Update firmware",
      officialUrl: "https://example.com/advisory",
      dueAt: "2026-01-01",
    });
    expect(parsed.severity).toBe("high");
  });

  it("requires affected model identifiers", () => {
    const result = firmwareAffectedModelInputSchema.safeParse({
      manufacturerName: "",
      deviceTypeName: "",
      versionPattern: "",
    });
    expect(result.success).toBe(false);
  });
});

