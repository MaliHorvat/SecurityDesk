import { describe, expect, it } from "vitest";
import { mapMemberRole } from "./roles";

describe("mapMemberRole", () => {
  it("maps Better Auth roles", () => {
    expect(mapMemberRole("owner")).toBe("organization_owner");
    expect(mapMemberRole("admin")).toBe("organization_admin");
    expect(mapMemberRole("member")).toBe("technician");
  });

  it("passes through platform roles", () => {
    expect(mapMemberRole("organization_owner")).toBe("organization_owner");
    expect(mapMemberRole("viewer")).toBe("viewer");
  });

  it("returns null for unknown", () => {
    expect(mapMemberRole("")).toBeNull();
    expect(mapMemberRole("nope")).toBeNull();
  });
});
