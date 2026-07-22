import { NextRequest, NextResponse } from "next/server";
import { verifySignedToken } from "@securitydesk/shared/crypto";
import { readObjectBuffer } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Manjka token." }, { status: 400 });
  }

  const secret = process.env.AGENT_SIGNING_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Manjka podpisni ključ za prenose." }, { status: 500 });
  }

  const payload = verifySignedToken<{ key: string }>(token, secret);
  if (!payload?.key) {
    return NextResponse.json({ error: "Token je neveljaven ali je potekel." }, { status: 401 });
  }

  if (/^https?:\/\//i.test(payload.key)) {
    return NextResponse.redirect(payload.key);
  }

  const file = await readObjectBuffer(payload.key);
  if (!file) {
    return NextResponse.json({ error: "Datoteka ni najdena." }, { status: 404 });
  }

  const fileName = payload.key.split("/").pop() ?? "securitydesk-update";
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
