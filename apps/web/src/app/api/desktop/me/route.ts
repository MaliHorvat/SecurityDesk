import { NextResponse } from "next/server";
import { ROLE_PERMISSIONS } from "@securitydesk/shared";
import { getDesktopBearerSession } from "@/lib/desktop-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getDesktopBearerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Neveljaven ali potekel žeton." }, { status: 401 });
  }

  return NextResponse.json({
    user: session.user,
    organization: session.organization,
    role: session.role,
    permissions: session.role ? ROLE_PERMISSIONS[session.role] : [],
  });
}
