import { NextRequest, NextResponse } from "next/server";
import { readObjectBuffer } from "@/lib/storage";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.session.activeOrganizationId;
  if (orgId && !key.startsWith(`${orgId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await readObjectBuffer(key);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
