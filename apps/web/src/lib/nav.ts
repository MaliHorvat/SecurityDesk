import { getVisibleNav, type PlanId, type PlatformRole } from "@securitydesk/shared";

export function resolveNav(role: PlatformRole | null, planId: PlanId | null) {
  if (!role || !planId) {
    return [];
  }
  return getVisibleNav(role, planId);
}
