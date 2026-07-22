import { createApiClient, type ApiClient } from "@securitydesk/api-client";
import { getInstallationId, secureStore } from "./secure-store";
import { detectPlatform } from "./platform";

export const AUTH_TOKEN_KEY = "securitydesk.auth.token";

/**
 * The SecurityDesk web app's base URL. Configurable via `VITE_API_BASE_URL`
 * at build time; falls back to localhost for `pnpm desktop:dev` against a
 * locally running `pnpm dev` web server.
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:3000";
}

let client: ApiClient | null = null;

/** Singleton `@securitydesk/api-client` instance wired up to the desktop secure store. */
export function getApiClient(): ApiClient {
  if (!client) {
    client = createApiClient({
      baseUrl: getApiBaseUrl(),
      getToken: () => secureStore.get(AUTH_TOKEN_KEY),
      desktopVersion: __APP_VERSION__,
      platform: detectPlatform(),
      onUnauthorized: () => {
        void secureStore.delete(AUTH_TOKEN_KEY);
      },
    });
  }
  return client;
}

export async function persistAuthToken(token: string): Promise<void> {
  await secureStore.set(AUTH_TOKEN_KEY, token);
  getApiClient().setToken(token);
}

export async function clearAuthToken(): Promise<void> {
  await secureStore.delete(AUTH_TOKEN_KEY);
  getApiClient().setToken(null);
}

export async function loadStoredAuthToken(): Promise<string | null> {
  const token = await secureStore.get(AUTH_TOKEN_KEY);
  if (token) getApiClient().setToken(token);
  return token;
}

export { getInstallationId };
export * from "@securitydesk/api-client";
