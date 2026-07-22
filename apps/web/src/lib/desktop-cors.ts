import { NextResponse, type NextRequest } from "next/server";

/** Origins used by the Tauri 2 desktop shell (Windows/macOS/Linux) and Vite dev. */
const DESKTOP_ORIGINS = new Set([
  "https://tauri.localhost",
  "http://tauri.localhost",
  "tauri://localhost",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
]);

const DESKTOP_ALLOW_HEADERS = [
  "Authorization",
  "Content-Type",
  "Accept",
  "X-SecurityDesk-Desktop-Version",
  "X-SecurityDesk-Platform",
  "X-SecurityDesk-Installation-Id",
].join(", ");

export function isDesktopApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/desktop") || pathname === "/api/health";
}

export function resolveDesktopCorsOrigin(request: Request | NextRequest): string | null {
  const origin = request.headers.get("origin");
  // No Origin → non-browser client; CORS headers optional.
  if (!origin) return null;
  if (DESKTOP_ORIGINS.has(origin)) return origin;
  // Reflect http(s) origins (Tauri 2 may use https://<id>.localhost and Vite ports).
  // Safe here: desktop APIs authenticate via Bearer tokens, not cookies.
  if (/^https?:\/\//i.test(origin)) return origin;
  if (origin.startsWith("tauri://") || origin.startsWith("asset://")) return origin;
  return null;
}

export function applyDesktopCorsHeaders(
  request: Request | NextRequest,
  headers: Headers,
): void {
  const origin = resolveDesktopCorsOrigin(request);
  if (!origin) return;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", DESKTOP_ALLOW_HEADERS);
  headers.set("Access-Control-Max-Age", "86400");
}

export function desktopCorsPreflight(request: NextRequest): NextResponse {
  const headers = new Headers();
  applyDesktopCorsHeaders(request, headers);
  // Always answer OPTIONS so browsers complete preflight even from unknown origins
  // (actual API responses still omit ACAO when origin is not allowed).
  if (!headers.has("Access-Control-Allow-Origin")) {
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", DESKTOP_ALLOW_HEADERS);
  }
  return new NextResponse(null, { status: 204, headers });
}

export function withDesktopCors(request: Request | NextRequest, response: NextResponse): NextResponse {
  applyDesktopCorsHeaders(request, response.headers);
  return response;
}
