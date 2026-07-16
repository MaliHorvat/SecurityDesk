import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";
import { hasPermission } from "./permissions";

describe("crypto", () => {
  it("encrypts and decrypts secrets", () => {
    const key = "test-encryption-key-with-enough-length!!";
    const encrypted = encryptSecret("super-secret", key);
    expect(encrypted).not.toContain("super-secret");
    expect(decryptSecret(encrypted, key)).toBe("super-secret");
  });
});

describe("permissions", () => {
  it("grants owner manage rights", () => {
    expect(hasPermission("organization_owner", "organization:manage")).toBe(true);
    expect(hasPermission("viewer", "devices:write")).toBe(false);
  });
});
