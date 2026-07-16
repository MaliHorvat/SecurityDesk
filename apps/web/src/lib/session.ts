import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@securitydesk/database";
import type { PlatformRole } from "@securitydesk/shared";
import { getAuth } from "@/lib/auth";

export type AppSession = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  session: {
    id: string;
    activeOrganizationId?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    planId: "starter" | "professional" | "integrator" | "enterprise";
  } | null;
  role: PlatformRole | null;
};

export async function getAppSession(): Promise<AppSession | null> {
  const auth = getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const activeOrgId = session.session.activeOrganizationId ?? null;
  let organization: AppSession["organization"] = null;
  let role: PlatformRole | null = null;

  if (activeOrgId) {
    const { db, schema } = getDb();
    const [org] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, activeOrgId))
      .limit(1);

    if (org) {
      organization = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        planId: org.planId,
      };
    }

    const [membership] = await db
      .select()
      .from(schema.member)
      .where(
        and(eq(schema.member.organizationId, activeOrgId), eq(schema.member.userId, session.user.id)),
      )
      .limit(1);

    role = (membership?.role as PlatformRole | undefined) ?? null;
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    session: {
      id: session.session.id,
      activeOrganizationId: activeOrgId,
    },
    organization,
    role,
  };
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
