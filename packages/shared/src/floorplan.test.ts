import { describe, expect, it } from "vitest";
import {
  normalizeElementCoords,
  floorPlanCreateInputSchema,
  floorPlanSaveCanvasInputSchema,
  DEFAULT_FLOOR_PLAN_LAYERS,
} from "./floorplan";

describe("floorplan", () => {
  it("normalizes invalid coordinates", () => {
    expect(normalizeElementCoords({ x: Number.NaN, y: 10, width: -1, height: 0 })).toEqual({
      x: 0,
      y: 10,
      width: 8,
      height: 8,
      rotation: 0,
    });
  });

  it("validates create input", () => {
    const parsed = floorPlanCreateInputSchema.safeParse({
      name: "Prizemlje",
      customerId: "c1",
      siteId: "s1",
    });
    expect(parsed.success).toBe(true);
  });

  it("has default layers", () => {
    expect(DEFAULT_FLOOR_PLAN_LAYERS.length).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_FLOOR_PLAN_LAYERS[0]?.type).toBe("devices");
  });

  it("requires expectedVersion on save", () => {
    const parsed = floorPlanSaveCanvasInputSchema.safeParse({
      floorPlanId: "fp1",
      expectedVersion: 1,
      elements: [],
    });
    expect(parsed.success).toBe(true);
  });
});
