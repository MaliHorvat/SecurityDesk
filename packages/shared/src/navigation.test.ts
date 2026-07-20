import { describe, expect, it } from "vitest";
import { getVisibleNav } from "./navigation";

describe("navigation", () => {
  it("shows floorplans and inventory for organization owner", () => {
    const ids = getVisibleNav("organization_owner", "starter").map((i) => i.id);
    expect(ids).toContain("floorplans");
    expect(ids).toContain("inventory");
  });

  it("hides floorplans for roles without permission", () => {
    // customer_user has floorplan:read but not inventory:read
    const customer = getVisibleNav("customer_user", "integrator").map((i) => i.id);
    expect(customer).toContain("floorplans");
    expect(customer).not.toContain("inventory");
  });
});
