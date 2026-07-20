import type { AppModule } from "@securitydesk/config";

export const PLAN_IDS = ["starter", "professional", "integrator", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
  maxCustomers: number | null;
  maxDevices: number | null;
  maxTechnicians: number | null;
  maxAgents: number | null;
  modules: readonly AppModule[];
};

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: { sl: string; en: string };
    limits: PlanLimits;
  }
> = {
  starter: {
    id: "starter",
    name: { sl: "Starter", en: "Starter" },
    limits: {
      maxCustomers: 10,
      maxDevices: 100,
      maxTechnicians: 3,
      maxAgents: 0,
      modules: ["securitydesk", "cctv_designer", "service_report"],
    },
  },
  professional: {
    id: "professional",
    name: { sl: "Professional", en: "Professional" },
    limits: {
      maxCustomers: 100,
      maxDevices: 2500,
      maxTechnicians: 25,
      maxAgents: 0,
      modules: [
        "securitydesk",
        "cctv_designer",
        "service_report",
        "config_vault",
        "firmware_guard",
        "handover_hub",
      ],
    },
  },
  integrator: {
    id: "integrator",
    name: { sl: "Integrator", en: "Integrator" },
    limits: {
      maxCustomers: 500,
      maxDevices: 10000,
      maxTechnicians: 100,
      maxAgents: 50,
      modules: [
        "securitydesk",
        "cctv_designer",
        "camera_deploy",
        "portmap",
        "config_vault",
        "firmware_guard",
        "service_report",
        "handover_hub",
        "multivms",
        "ai_troubleshooter",
        "floorplan_digital_twin",
        "parts_inventory",
      ],
    },
  },
  enterprise: {
    id: "enterprise",
    name: { sl: "Enterprise", en: "Enterprise" },
    limits: {
      maxCustomers: null,
      maxDevices: null,
      maxTechnicians: null,
      maxAgents: null,
      modules: [
        "securitydesk",
        "cctv_designer",
        "camera_deploy",
        "portmap",
        "config_vault",
        "firmware_guard",
        "service_report",
        "handover_hub",
        "multivms",
        "ai_troubleshooter",
        "floorplan_digital_twin",
        "parts_inventory",
      ],
    },
  },
};

export function isModuleEnabled(planId: PlanId, module: AppModule): boolean {
  return PLANS[planId].limits.modules.includes(module);
}
