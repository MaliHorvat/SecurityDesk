export const PLATFORM_ROLES = [
  "platform_super_admin",
  "organization_owner",
  "organization_admin",
  "technician",
  "viewer",
  "customer_user",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ROLE_LABELS: Record<PlatformRole, { sl: string; en: string }> = {
  platform_super_admin: { sl: "Super skrbnik platforme", en: "Platform Super Admin" },
  organization_owner: { sl: "Lastnik organizacije", en: "Organization Owner" },
  organization_admin: { sl: "Skrbnik organizacije", en: "Organization Admin" },
  technician: { sl: "Tehnik", en: "Technician" },
  viewer: { sl: "Pregledovalec", en: "Viewer" },
  customer_user: { sl: "Uporabnik stranke", en: "Customer User" },
};
