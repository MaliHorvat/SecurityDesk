import { getAppName } from "@securitydesk/config";

export function getPublicAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME?.trim() || getAppName();
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000"
  );
}
