import { redirect } from "next/navigation";
import { assertPermission, type Permission, type PlatformRole, type PlanId } from "@securitydesk/shared";
import { getAppSession, type AppSession } from "@/lib/session";

export type OrgSession = AppSession & {
  organization: NonNullable<AppSession["organization"]>;
  role: PlatformRole;
};

export async function requireOrgSession(permission?: Permission): Promise<OrgSession> {
  const session = await getAppSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.organization || !session.role) {
    redirect("/onboarding");
  }
  if (permission) {
    assertPermission(session.role, permission);
  }
  return session as OrgSession;
}

export function getPlanId(session: OrgSession): PlanId {
  return session.organization.planId;
}
