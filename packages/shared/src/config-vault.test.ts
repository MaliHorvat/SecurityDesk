import { describe, expect, it } from "vitest";
import { configurationBackupInputSchema } from "./config-vault";

describe("config vault schemas", () => {
  it("requires configuration text", () => {
    const result = configurationBackupInputSchema.safeParse({
      deviceId: "dev-1",
      source: "manual",
      configurationText: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty label/note", () => {
    const parsed = configurationBackupInputSchema.parse({
      deviceId: "dev-1",
      source: "manual",
      label: "",
      note: "",
      configurationText: "key=value\nfoo=bar",
    });
    expect(parsed.label).toBe("");
    expect(parsed.note).toBe("");
  });
});

