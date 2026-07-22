import type {
  DesktopArchitecture,
  DesktopChannel,
  DesktopPlatform,
  DesktopRegisterInstallationInput,
  DesktopUpdateEventInput,
} from "@securitydesk/shared";
import type {
  AuthSession,
  Customer,
  DesktopDashboardStats,
  DesktopLoginResponse,
  DesktopMeResponse,
  DesktopUpdateCheckResult,
  Device,
  LoginCredentials,
  PagedResult,
  Site,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type TokenProvider = () => string | null | Promise<string | null>;

export interface ApiClientOptions {
  /** Base URL of the SecurityDesk web API, e.g. https://app.securitydesk.si */
  baseUrl: string;
  /** Returns the current bearer token (if any) to attach to requests. */
  getToken?: TokenProvider;
  /** Desktop app version sent as X-SecurityDesk-Desktop-Version. */
  desktopVersion?: string;
  /** OS platform sent as X-SecurityDesk-Platform (windows | macos | linux). */
  platform?: string;
  /** Stable per-device installation id sent as X-SecurityDesk-Installation-Id. */
  installationId?: string;
  /** Override fetch implementation (useful for tests). */
  fetchImpl?: typeof fetch;
  /** Called whenever a request fails with 401, e.g. to force a re-login. */
  onUnauthorized?: () => void;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Typed HTTP client for SecurityDesk's desktop API (`/api/desktop/*`).
 * Used by the Tauri desktop app; never embeds secrets — only ever holds the
 * short-lived Bearer token handed back by `login()` / supplied via `getToken`.
 */
export class SecurityDeskApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: TokenProvider;
  private readonly desktopVersion?: string;
  private readonly platform?: string;
  private readonly installationId?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorized?: () => void;
  private tokenOverride: string | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.getToken = options.getToken;
    this.desktopVersion = options.desktopVersion;
    this.platform = options.platform;
    this.installationId = options.installationId;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onUnauthorized = options.onUnauthorized;
  }

  /** Manually set/clear the bearer token (takes precedence over `getToken`). */
  setToken(token: string | null): void {
    this.tokenOverride = token;
  }

  private async resolveToken(): Promise<string | null> {
    if (this.tokenOverride !== null) return this.tokenOverride;
    if (this.getToken) return await this.getToken();
    return null;
  }

  async fetchJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = await this.resolveToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    if (this.desktopVersion) headers["X-SecurityDesk-Desktop-Version"] = this.desktopVersion;
    if (this.platform) headers["X-SecurityDesk-Platform"] = this.platform;
    if (this.installationId) headers["X-SecurityDesk-Installation-Id"] = this.installationId;

    const response = await this.fetchImpl(`${this.baseUrl}${path}${buildQuery(options.query)}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    if (response.status === 401) {
      this.onUnauthorized?.();
    }
    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error?: unknown }).error)
          : null) ?? `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    return payload as T;
  }

  async login(credentials: LoginCredentials): Promise<DesktopLoginResponse> {
    const result = await this.fetchJson<DesktopLoginResponse>("/api/desktop/auth/login", {
      method: "POST",
      body: credentials,
    });
    this.setToken(result.token);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.fetchJson<{ ok: boolean }>("/api/desktop/auth/logout", { method: "POST" });
    } finally {
      this.setToken(null);
    }
  }

  me(): Promise<DesktopMeResponse> {
    return this.fetchJson<DesktopMeResponse>("/api/desktop/me");
  }

  async listCustomers(): Promise<Customer[]> {
    const { customers } = await this.fetchJson<{ customers: Customer[] }>("/api/desktop/customers");
    return customers;
  }

  async listSites(): Promise<Site[]> {
    const { sites } = await this.fetchJson<{ sites: Site[] }>("/api/desktop/sites");
    return sites;
  }

  async listDevices(): Promise<Device[]> {
    const { devices } = await this.fetchJson<{ devices: Device[] }>("/api/desktop/devices");
    return devices;
  }

  dashboardStats(): Promise<DesktopDashboardStats> {
    return this.fetchJson<DesktopDashboardStats>("/api/desktop/dashboard");
  }

  checkUpdate(input: {
    target: DesktopPlatform;
    arch: DesktopArchitecture;
    currentVersion: string;
    channel?: DesktopChannel;
  }): Promise<DesktopUpdateCheckResult | null> {
    return this.fetchJson<DesktopUpdateCheckResult | null>(
      `/api/desktop/updates/${input.target}/${input.arch}/${input.currentVersion}`,
      { query: { channel: input.channel, installationId: this.installationId } },
    );
  }

  registerInstallation(input: DesktopRegisterInstallationInput): Promise<{ ok: boolean; id: string }> {
    return this.fetchJson<{ ok: boolean; id: string }>("/api/desktop/installations/register", {
      method: "POST",
      body: input,
    });
  }

  reportUpdateEvent(input: DesktopUpdateEventInput): Promise<{ ok: boolean }> {
    return this.fetchJson<{ ok: boolean }>("/api/desktop/updates/events", {
      method: "POST",
      body: input,
    });
  }

  health(): Promise<{ status: string }> {
    return this.fetchJson<{ status: string }>("/api/health");
  }
}

export function createApiClient(options: ApiClientOptions): SecurityDeskApiClient {
  return new SecurityDeskApiClient(options);
}

// Re-exported for callers still on the pre-desktop-API naming.
export { SecurityDeskApiClient as ApiClient };
export type { AuthSession, PagedResult };
