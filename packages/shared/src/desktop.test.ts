import { describe, expect, it } from "vitest";
import { compareSemVer, isInRollout } from "./desktop";

describe("compareSemVer", () => {
  it("compares major/minor/patch numerically", () => {
    expect(compareSemVer("1.2.3", "1.2.4")).toBe(-1);
    expect(compareSemVer("1.3.0", "1.2.9")).toBe(1);
    expect(compareSemVer("2.0.0", "1.9.9")).toBe(1);
    expect(compareSemVer("1.2.3", "1.2.3")).toBe(0);
  });

  it("avoids naive string-sort pitfalls (1.10.0 > 1.9.0)", () => {
    expect(compareSemVer("1.10.0", "1.9.0")).toBe(1);
    expect(compareSemVer("1.9.0", "1.10.0")).toBe(-1);
  });

  it("ignores prerelease/build suffixes for ordering", () => {
    expect(compareSemVer("1.2.3-beta.1", "1.2.3")).toBe(0);
    expect(compareSemVer("1.2.3+build5", "1.2.3")).toBe(0);
  });

  it("treats missing/short segments as zero", () => {
    expect(compareSemVer("1.2", "1.2.0")).toBe(0);
    expect(compareSemVer("1.2.1", "1.2")).toBe(1);
  });
});

describe("isInRollout", () => {
  it("always includes installations at 100%", () => {
    expect(isInRollout("release-1", "install-1", 100)).toBe(true);
    expect(isInRollout("release-1", "install-2", 100)).toBe(true);
  });

  it("always excludes installations at 0%", () => {
    expect(isInRollout("release-1", "install-1", 0)).toBe(false);
    expect(isInRollout("release-1", "install-2", 0)).toBe(false);
  });

  it("is deterministic for the same release/installation pair", () => {
    const a = isInRollout("release-1", "install-42", 50);
    const b = isInRollout("release-1", "install-42", 50);
    expect(a).toBe(b);
  });

  it("produces a roughly proportional split across many installations", () => {
    const total = 2000;
    let included = 0;
    for (let i = 0; i < total; i++) {
      if (isInRollout("release-abc", `install-${i}`, 30)) included++;
    }
    const ratio = included / total;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.4);
  });

  it("is monotonic: anything in a smaller rollout stays in a larger one", () => {
    for (let i = 0; i < 200; i++) {
      const installationId = `install-${i}`;
      if (isInRollout("release-mono", installationId, 25)) {
        expect(isInRollout("release-mono", installationId, 75)).toBe(true);
      }
    }
  });
});
