import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Desktop API is Bearer-token authenticated (see /lib/desktop-auth.ts) — never gate on cookies.
  if (pathname.startsWith("/api/desktop")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/sites") ||
    pathname.startsWith("/devices") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/camera-deploy") ||
    pathname.startsWith("/floorplans") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/network") ||
    pathname.startsWith("/config-vault") ||
    pathname.startsWith("/firmware") ||
    pathname.startsWith("/service") ||
    pathname.startsWith("/handover") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/ai") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding");

  if (isProtected && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/sites/:path*",
    "/devices/:path*",
    "/projects/:path*",
    "/camera-deploy/:path*",
    "/floorplans/:path*",
    "/inventory/:path*",
    "/network/:path*",
    "/config-vault/:path*",
    "/firmware/:path*",
    "/service/:path*",
    "/handover/:path*",
    "/monitoring/:path*",
    "/ai/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
