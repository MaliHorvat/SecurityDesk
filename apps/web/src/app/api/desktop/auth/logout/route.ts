import { NextResponse } from "next/server";
import { getDesktopBearerToken, revokeDesktopToken } from "@/lib/desktop-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = getDesktopBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Manjka Bearer žeton." }, { status: 401 });
  }

  await revokeDesktopToken(token);
  return NextResponse.json({ ok: true });
}
