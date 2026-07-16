/**
 * Central application branding / identity.
 * Change APP_NAME here (and via env) — do not hardcode the product name elsewhere.
 */
export const APP_CONFIG = {
  name: "SecurityDesk",
  slug: "securitydesk",
  defaultLocale: "sl" as const,
  supportedLocales: ["sl", "en"] as const,
  defaultTimezone: "Europe/Ljubljana",
  modules: [
    "securitydesk",
    "cctv_designer",
    "camera_deploy",
    "portmap",
    "config_vault",
    "firmware_guard",
    "service_report",
    "handover_hub",
    "multivms",
    "ai_troubleshooter",
  ] as const,
} as const;

export type AppModule = (typeof APP_CONFIG.modules)[number];
export type SupportedLocale = (typeof APP_CONFIG.supportedLocales)[number];

export function getAppName(): string {
  return process.env.APP_NAME?.trim() || process.env.NEXT_PUBLIC_APP_NAME?.trim() || APP_CONFIG.name;
}
