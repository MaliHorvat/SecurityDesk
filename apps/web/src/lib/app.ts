import { getAppName } from "@securitydesk/config";

export function getPublicAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || getAppName();
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Public app URL used by Better Auth, mail links, and agents. */
export function getAppUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.BETTER_AUTH_URL?.trim();

  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  // Vercel system env (preview + production deployment hostnames)
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return normalizeBaseUrl(`https://${host}`);
  }

  return "http://localhost:3000";
}

/** Origins accepted by Better Auth CSRF / callback validation. */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>([
    getAppUrl(),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  for (const key of ["NEXT_PUBLIC_APP_URL", "APP_URL", "BETTER_AUTH_URL"] as const) {
    const value = process.env[key]?.trim();
    if (value) origins.add(normalizeBaseUrl(value));
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    origins.add(`https://${host}`);
  }

  const extra = process.env.AUTH_TRUSTED_ORIGINS?.trim();
  if (extra) {
    for (const origin of extra.split(",").map((v) => v.trim()).filter(Boolean)) {
      origins.add(normalizeBaseUrl(origin));
    }
  }

  return [...origins];
}
