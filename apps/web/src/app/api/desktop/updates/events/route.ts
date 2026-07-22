import { NextResponse } from "next/server";
import { desktopUpdateEventInputSchema } from "@securitydesk/shared";
import { recordDesktopUpdateEvent } from "@/server/desktop-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neveljaven JSON." }, { status: 400 });
  }

  const parsed = desktopUpdateEventInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." }, { status: 400 });
  }

  const result = await recordDesktopUpdateEvent(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: "Namestitev ni najdena." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
