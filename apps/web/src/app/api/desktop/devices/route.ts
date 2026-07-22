import { NextResponse } from "next/server";
import { getDesktopBearerSession } from "@/lib/desktop-auth";
import { listDevicesForOrg } from "@/server/desktop-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getDesktopBearerSession(request);
  if (!session) {
    return NextResponse.json({ error: "Neveljaven ali potekel žeton." }, { status: 401 });
  }
  if (!session.organization || !session.role) {
    return NextResponse.json({ error: "Manjka organizacija." }, { status: 403 });
  }

  try {
    const devices = await listDevicesForOrg(session.organization.id, session.role);
    return NextResponse.json({ devices });
  } catch {
    return NextResponse.json({ error: "Nimate dovoljenja." }, { status: 403 });
  }
}
