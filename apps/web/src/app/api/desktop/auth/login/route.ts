import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import { desktopLoginRequestSchema, mapMemberRole } from "@securitydesk/shared";
import { getAuth } from "@/lib/auth";
import { createDesktopToken, desktopRequestMeta } from "@/lib/desktop-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neveljaven JSON." }, { status: 400 });
  }

  const parsed = desktopLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Neveljavni podatki." }, { status: 400 });
  }

  const auth = getAuth();
  let result: { user: { id: string; name: string; email: string; image?: string | null } };
  try {
    result = await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
    });
  } catch {
    return NextResponse.json({ error: "Napačen e-poštni naslov ali geslo." }, { status: 401 });
  }
  if (!result?.user) {
    return NextResponse.json({ error: "Napačen e-poštni naslov ali geslo." }, { status: 401 });
  }

  const { db, schema } = getDb();
  const [membership] = await db
    .select({ organizationId: schema.member.organizationId, role: schema.member.role })
    .from(schema.member)
    .where(eq(schema.member.userId, result.user.id))
    .limit(1);

  let organization: { id: string; name: string; slug: string; planId: string } | null = null;
  if (membership?.organizationId) {
    const [org] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, membership.organizationId))
      .limit(1);
    if (org) organization = { id: org.id, name: org.name, slug: org.slug, planId: org.planId };
  }

  const { platform, appVersion, installationId } = desktopRequestMeta(request);
  const { token, expiresAt } = await createDesktopToken({
    userId: result.user.id,
    organizationId: membership?.organizationId ?? null,
    name: [platform, appVersion, installationId].filter(Boolean).join(" / ") || null,
  });

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      image: result.user.image ?? null,
    },
    organization,
    role: mapMemberRole(membership?.role),
  });
}
