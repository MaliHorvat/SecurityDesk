import { NextResponse } from "next/server";
import { desktopRegisterInstallationSchema } from "@securitydesk/shared";
import { getDesktopBearerSession } from "@/lib/desktop-auth";
import { upsertDesktopInstallation } from "@/server/desktop-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neveljaven JSON." }, { status: 400 });
  }

  const parsed = desktopRegisterInstallationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." }, { status: 400 });
  }

  const session = await getDesktopBearerSession(request);

  const { id } = await upsertDesktopInstallation({
    ...parsed.data,
    organizationId: session?.organization?.id ?? null,
    userId: session?.user.id ?? null,
  });

  return NextResponse.json({ ok: true, id });
}
