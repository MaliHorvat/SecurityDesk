import { describe, expect, it } from "vitest";
import { availableQuantity, averageCostAfterReceipt, isBelowMinimum } from "./inventory";

describe("inventory math", () => {
  it("computes available quantity", () => {
    expect(availableQuantity(10, 3)).toBe(7);
    expect(availableQuantity(2, 5)).toBe(0);
  });

  it("computes weighted average cost", () => {
    expect(averageCostAfterReceipt(10, 100, 10, 200)).toBe(150);
  });

  it("detects below minimum", () => {
    expect(isBelowMinimum(2, 5)).toBe(true);
    expect(isBelowMinimum(5, 5)).toBe(false);
  });
});
